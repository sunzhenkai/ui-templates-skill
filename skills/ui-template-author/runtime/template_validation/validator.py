from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Iterable

from .colors import Color, composite, contrast_ratio, parse_color
from .fidelity import (
    classify_sidecar,
    empty_replay,
    identity_payload,
    load_fidelity,
    parse_source_roots,
    path_has_example_prefix,
    replay_profile,
    schema_errors as fidelity_schema_errors,
    validate_semantics as validate_fidelity_semantics,
    FidelityError,
    UNKNOWN,
)
from template_authoring.chrome import LAYOUT_HIGH_WITHOUT_CHROME, chrome_complete_sidecar
from .loading import LoadError, load_data
from .model import ValidationResult
from .schema import SchemaStore

ORIGINS = {"source", "computed", "estimated", "default"}
RULE_ID = re.compile(r"\b(?:NN|TOKEN|LAYOUT|ROUTE|AX|RESP|QUALITY)-[0-9]{3}\b")
RULE_DEFINITION = re.compile(r"\[((?:NN|TOKEN|LAYOUT|ROUTE|AX|RESP|QUALITY)-[0-9]{3})\]")
RULE_REFERENCE = re.compile(r"@((?:NN|TOKEN|LAYOUT|ROUTE|AX|RESP|QUALITY)-[0-9]{3})\b")
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
PROHIBITED_TEXT = re.compile(
    r"(?:\bsrc/|package\.json|\bnpm\s+install\b|\bpnpm\s+install\b|\bReact\b|\bTailwind\b|"
    r"\bshadcn\b|\bZustand\b|\bAPI\s*(?:/|与|and)\s*mock\b|\bAPI\s+layer\b|\bdata\s+layer\b)",
    re.I,
)
TEXT_SUFFIXES = {".md", ".yaml", ".yml", ".json", ".txt"}
ASSET_SUFFIXES = {".avif", ".gif", ".ico", ".jpeg", ".jpg", ".pdf", ".png", ".svg", ".webp"}
PROHIBITED_PARTS = {"implementation", "src", "api", "apis", "data", "mock", "mocks", "adapters"}
ENGINEERING_SUFFIXES = {".c", ".cc", ".cpp", ".css", ".go", ".h", ".hpp", ".java", ".js", ".jsx", ".py", ".rs", ".scss", ".svelte", ".ts", ".tsx", ".vue"}
ENGINEERING_FILES = {
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb",
    "pyproject.toml", "cargo.toml", "go.mod", "vite.config.js", "vite.config.ts",
    "webpack.config.js", "tsconfig.json",
}
CONFIDENCE_SCORE = {"low": 0, "medium": 1, "high": 2}
LEGAL_FEEDBACK = {
    None: {"proposed"},
    "proposed": {"accepted", "known-gap", "rejected"},
    "accepted": {"applied", "known-gap", "rejected"},
    "applied": {"verified", "known-gap"},
    "known-gap": {"accepted", "rejected"},
    "rejected": set(),
    "verified": set(),
}


def _join(path: Iterable[Any]) -> str:
    return ".".join(str(part) for part in path)


def _record(node: Any) -> bool:
    return isinstance(node, dict) and "value" in node and "origin" in node


def token_records(node: Any, prefix: tuple[str, ...] = ()) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    if _record(node):
        records[".".join(prefix)] = node
    elif isinstance(node, dict):
        for key, child in node.items():
            if key != "schema_version":
                records.update(token_records(child, (*prefix, str(key))))
    return records


def _values_with_rule_ids(node: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(node, str):
        found.update(RULE_ID.findall(node))
    elif isinstance(node, dict):
        for value in node.values():
            found.update(_values_with_rule_ids(value))
    elif isinstance(node, list):
        for value in node:
            found.update(_values_with_rule_ids(value))
    return found


def _format_number(value: int | float) -> str:
    return str(int(value)) if isinstance(value, float) and value.is_integer() else str(value)


def _precision_values(record: dict[str, Any]) -> set[str]:
    """提取可在 apply 文本中被复制的 token 精确值，覆盖 scalar/list/map。"""
    found: set[str] = set()

    def add_scalar(value: Any, unit: str | None = None) -> None:
        if isinstance(value, bool):
            return
        if isinstance(value, (int, float)):
            number = _format_number(value)
            found.add(number if unit in {None, "ratio", "unitless"} else f"{number}{unit}")
        elif isinstance(value, str) and (
            re.fullmatch(r"#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?", value)
            or re.fullmatch(r"oklch\([^\n)]+\)", value, re.I)
            or re.fullmatch(r"-?\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|deg)", value, re.I)
        ):
            found.add(value)

    def walk(value: Any, inherited_unit: str | None = None) -> None:
        if isinstance(value, list):
            for member in value:
                add_scalar(member, inherited_unit)
        elif isinstance(value, dict):
            if set(value).issubset({"value", "unit"}) and "value" in value:
                walk(value["value"], value.get("unit"))
            else:
                for member in value.values():
                    walk(member)
        else:
            add_scalar(value, inherited_unit)

    walk(record.get("value"), record.get("unit"))
    return found


def _contains_precision(text: str, value: str) -> bool:
    """按完整数值边界检测精确值；unitless 整数不得绕过唯一载体约束。"""
    return re.search(rf"(?<![\w.-]){re.escape(value)}(?![\w.-])", text, re.I) is not None


def _semver(value: str) -> tuple[int, int, int]:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)", value or "")
    return tuple(map(int, match.groups())) if match else (0, 0, 0)


class TemplateValidator:
    def __init__(
        self,
        repo_root: Path,
        schema_dir: Path | None = None,
        *,
        source_roots: dict[str, Path] | None = None,
        require_source_replay: bool = False,
        capture_receipt: dict[str, Any] | None = None,
    ):
        self.repo_root = repo_root.resolve()
        canonical_schema_dir = self.repo_root / "schemas/template/v2"
        portable_schema_dir = Path(__file__).resolve().parents[1] / "schemas/template/v2"
        self.schema_dir = schema_dir or (canonical_schema_dir if canonical_schema_dir.is_dir() else portable_schema_dir)
        self.schemas = SchemaStore(self.schema_dir)
        self.result = ValidationResult()
        self.source_roots = source_roots or {}
        self.require_source_replay = require_source_replay
        self.capture_receipt = capture_receipt

    def rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.repo_root).as_posix()
        except ValueError:
            return path.resolve().as_posix()

    def add(self, code: str, path: Path | str, message: str, **details: Any) -> None:
        self.result.add(code, self.rel(path) if isinstance(path, Path) else path, message, **details)

    def load(self, path: Path) -> Any | None:
        try:
            return load_data(path)
        except LoadError as exc:
            self.add("DATA_LOAD_ERROR", path, "无法安全解析数据文件", error=str(exc))
            return None

    def schema_validate(self, kind: str, path: Path, data: Any) -> bool:
        if not isinstance(data, dict):
            self.add("SCHEMA_INVALID", path, "文档根必须是 mapping/object", schema=kind)
            return False
        version = data.get("schema_version")
        legacy_version = data.get("schema") if version is None else None
        if version != 2:
            declared = legacy_version if legacy_version is not None else version
            code = "SCHEMA_VERSION_MISSING" if declared is None else "SCHEMA_VERSION_UNSUPPORTED"
            self.add(code, path, "仅支持 schema_version: 2；v1 请使用显式迁移器", declared=declared, supported=[2])
            return False
        errors = self.schemas.errors(kind, data)
        for subpath, message, details in errors:
            full = f"{self.rel(path)}#{subpath}" if subpath else self.rel(path)
            self.result.add("SCHEMA_INVALID", full, message, schema=kind, **details)
        return not errors

    def validate_template(self, template: Path) -> None:
        template = template.resolve()
        required = {name: template / name for name in ("spec.md", "tokens.yaml", "meta.yaml", "evidence.yaml")}
        for path in required.values():
            if not path.is_file():
                self.add("REQUIRED_FILE_MISSING", path, "schema v2 必备文件不存在")
        meta = self.load(required["meta.yaml"]) if required["meta.yaml"].is_file() else None
        tokens = self.load(required["tokens.yaml"]) if required["tokens.yaml"].is_file() else None
        evidence = self.load(required["evidence.yaml"]) if required["evidence.yaml"].is_file() else None
        meta_ok = self.schema_validate("meta", required["meta.yaml"], meta) if meta is not None else False
        tokens_ok = self.schema_validate("tokens", required["tokens.yaml"], tokens) if tokens is not None else False
        evidence_ok = self.schema_validate("evidence", required["evidence.yaml"], evidence) if evidence is not None else False
        identity = {
            "name": meta.get("name", template.name) if isinstance(meta, dict) else template.name,
            "version": meta.get("template_version") if isinstance(meta, dict) else None,
            "schema_version": meta.get("schema_version") if isinstance(meta, dict) else None,
            "path": self.rel(template),
        }
        self._check_prohibited(template)
        self._check_links(template)
        definitions, references = self._check_rules(template)
        if isinstance(meta, dict):
            self._check_meta_semantics(template, meta)
        records = token_records(tokens) if isinstance(tokens, dict) else {}
        self._check_apply(template, records)
        if isinstance(tokens, dict):
            self._check_theme_roles(template, tokens)
        if isinstance(evidence, dict):
            self._check_evidence(template, records, evidence, meta if isinstance(meta, dict) else {})
        if isinstance(tokens, dict) and isinstance(meta, dict):
            self._check_contrast(template, tokens, meta, definitions)
        self._check_structured_refs(template, definitions, references)
        source_ids = {
            item.get("id")
            for item in (meta.get("sources") if isinstance(meta, dict) else []) or []
            if isinstance(item, dict)
        }
        identity["fidelity"] = self._check_fidelity(
            template,
            definitions,
            set(records),
            {item for item in source_ids if isinstance(item, str)},
            meta=meta if isinstance(meta, dict) else {},
        )
        self.result.templates.append(identity)
        # Variables intentionally retained: schema errors are aggregated with semantics.
        _ = (meta_ok, tokens_ok, evidence_ok)

    def _check_meta_semantics(self, template: Path, meta: dict[str, Any]) -> None:
        if meta.get("name") != template.name:
            self.add("META_NAME_MISMATCH", template / "meta.yaml", "meta.name 与模板目录名不一致", expected=template.name, actual=meta.get("name"))
        confidence = meta.get("confidence", {})
        if isinstance(confidence, dict) and all(key in confidence for key in ("overall", "layout", "visual", "components")):
            required = [confidence.get(key) for key in ("layout", "visual", "components")]
            if all(value in CONFIDENCE_SCORE for value in required) and confidence.get("overall") in CONFIDENCE_SCORE:
                weakest = min(CONFIDENCE_SCORE[value] for value in required)
                if CONFIDENCE_SCORE[confidence["overall"]] > weakest:
                    self.add("CONFIDENCE_OVERSTATED", template / "meta.yaml", "overall confidence 高于必需维度中的最弱值", confidence=confidence)
        coverage = meta.get("coverage", {})
        if isinstance(coverage, dict):
            for dimension, block in sorted(coverage.items()):
                if not isinstance(block, dict):
                    continue
                declared = set(block.get("declared", []))
                buckets = {name: set(block.get(name, [])) for name in ("observed", "defaulted", "unsupported")}
                overlap = (buckets["observed"] & buckets["defaulted"]) | (buckets["observed"] & buckets["unsupported"]) | (buckets["defaulted"] & buckets["unsupported"])
                if overlap:
                    self.add("COVERAGE_OVERLAP", template / "meta.yaml", f"coverage.{dimension} 状态集合重叠", items=sorted(overlap))
                covered = set().union(*buckets.values())
                if declared != covered:
                    self.add("COVERAGE_INCOMPLETE", template / "meta.yaml", f"coverage.{dimension} 未恰好覆盖 declared", missing=sorted(declared - covered), undeclared=sorted(covered - declared))
            platforms = coverage.get("platforms", {})
            if isinstance(platforms, dict) and set(meta.get("platforms", [])) != set(platforms.get("declared", [])):
                self.add("COVERAGE_PLATFORM_MISMATCH", template / "meta.yaml", "platforms 与 coverage.platforms.declared 不一致")

    def _check_theme_roles(self, template: Path, tokens: dict[str, Any]) -> None:
        themes = tokens.get("themes")
        if not isinstance(themes, dict) or not themes:
            return
        role_sets: dict[str, set[str]] = {}
        for name, theme in themes.items():
            paths = token_records(theme)
            role_sets[name] = set(paths)
        base_name = sorted(role_sets)[0]
        base = role_sets[base_name]
        for name in sorted(role_sets):
            if role_sets[name] != base:
                self.add("THEME_ROLE_MISMATCH", template / "tokens.yaml", f"themes.{name} 与 themes.{base_name} token role 不一致", missing=sorted(base - role_sets[name]), extra=sorted(role_sets[name] - base))

    def _check_evidence(self, template: Path, records: dict[str, dict[str, Any]], evidence: dict[str, Any], meta: dict[str, Any]) -> None:
        raw_entries = evidence.get("entries", [])
        entries = raw_entries if isinstance(raw_entries, list) else []
        active_tokens: dict[str, list[dict[str, Any]]] = {}
        active_assets: dict[str, list[dict[str, Any]]] = {}

        # source ID 是 evidence provenance 的外键；重复 ID 会使引用歧义，必须先拒绝。
        sources_by_id: dict[str, list[tuple[int, dict[str, Any]]]] = {}
        raw_sources = meta.get("sources", [])
        for index, source in enumerate(raw_sources if isinstance(raw_sources, list) else []):
            if isinstance(source, dict) and isinstance(source.get("id"), str):
                sources_by_id.setdefault(source["id"], []).append((index, source))
        for source_id, matches in sorted(sources_by_id.items()):
            if len(matches) > 1:
                self.add(
                    "META_SOURCE_ID_DUPLICATE",
                    f"{self.rel(template / 'meta.yaml')}#sources",
                    "meta.sources 的 source id 必须唯一，否则 evidence 无法确定性解析",
                    source_id=source_id,
                    indexes=[index for index, _ in matches],
                )

        # superseded 记录的 supersedes 字段向前指向取代它的唯一 active 记录。
        evidence_by_id: dict[str, list[tuple[int, dict[str, Any]]]] = {}
        for index, entry in enumerate(entries):
            if isinstance(entry, dict) and isinstance(entry.get("id"), str):
                evidence_by_id.setdefault(entry["id"], []).append((index, entry))
        for evidence_id, matches in sorted(evidence_by_id.items()):
            if len(matches) > 1:
                self.add(
                    "EVIDENCE_ID_DUPLICATE",
                    f"{self.rel(template / 'evidence.yaml')}#entries",
                    "evidence id 重复",
                    id=evidence_id,
                    indexes=[index for index, _ in matches],
                )

        for index, entry in enumerate(entries):
            if not isinstance(entry, dict):
                continue
            entry_path = f"{self.rel(template / 'evidence.yaml')}#entries.{index}"
            eid = entry.get("id")
            path = entry.get("path")
            kind = entry.get("kind")
            status = entry.get("status")
            if status == "active" and isinstance(path, str):
                target = active_assets if kind == "asset" else active_tokens
                target.setdefault(path, []).append(entry)
            if kind != "asset" and path not in records:
                self.add("EVIDENCE_TOKEN_DANGLING", entry_path, "evidence 指向不存在的 token path", token_path=path)

            origin = entry.get("origin")
            if origin in {"source", "computed", "estimated"}:
                source_id = entry.get("source_id")
                source_matches = sources_by_id.get(source_id, []) if isinstance(source_id, str) else []
                if not source_matches:
                    self.add("EVIDENCE_SOURCE_DANGLING", entry_path, "evidence source_id 不在 meta.sources", source_id=source_id)
                elif len(source_matches) == 1:
                    expected_revision = source_matches[0][1].get("revision")
                    actual_revision = entry.get("source_revision")
                    if actual_revision != expected_revision:
                        self.add(
                            "EVIDENCE_SOURCE_REVISION_MISMATCH",
                            f"{entry_path}.source_revision",
                            "evidence source_revision 与 meta.sources 对应 revision 不一致",
                            evidence_id=eid,
                            source_id=source_id,
                            expected=expected_revision,
                            actual=actual_revision,
                        )

            supersedes = entry.get("supersedes")
            if status == "active" and supersedes is not None:
                self.add(
                    "EVIDENCE_SUPERSEDES_STATUS_INVALID",
                    f"{entry_path}.supersedes",
                    "active evidence 不得声明 supersedes；该字段仅由 superseded 记录指向 active replacement",
                    evidence_id=eid,
                    supersedes=supersedes,
                )
            elif status == "superseded":
                if supersedes == eid:
                    self.add(
                        "EVIDENCE_SUPERSEDES_SELF",
                        f"{entry_path}.supersedes",
                        "superseded evidence 不得引用自身作为 replacement",
                        evidence_id=eid,
                    )
                else:
                    replacement_matches = evidence_by_id.get(supersedes, []) if isinstance(supersedes, str) else []
                    if not replacement_matches:
                        self.add(
                            "EVIDENCE_SUPERSEDES_DANGLING",
                            f"{entry_path}.supersedes",
                            "superseded evidence 指向不存在的 replacement",
                            evidence_id=eid,
                            supersedes=supersedes,
                        )
                    elif len(replacement_matches) > 1:
                        self.add(
                            "EVIDENCE_SUPERSEDES_AMBIGUOUS",
                            f"{entry_path}.supersedes",
                            "superseded evidence 指向重复 ID，无法唯一解析 replacement",
                            evidence_id=eid,
                            supersedes=supersedes,
                        )
                    else:
                        replacement = replacement_matches[0][1]
                        if replacement.get("status") != "active":
                            self.add(
                                "EVIDENCE_SUPERSEDES_STATUS_INVALID",
                                f"{entry_path}.supersedes",
                                "superseded evidence 必须指向 active replacement",
                                evidence_id=eid,
                                supersedes=supersedes,
                                target_status=replacement.get("status"),
                            )
                        if replacement.get("kind") != kind or replacement.get("path") != path:
                            self.add(
                                "EVIDENCE_SUPERSEDES_TARGET_MISMATCH",
                                f"{entry_path}.supersedes",
                                "replacement 必须与被替代 evidence 具有相同 kind 和 path",
                                evidence_id=eid,
                                supersedes=supersedes,
                                expected_kind=kind,
                                actual_kind=replacement.get("kind"),
                                expected_path=path,
                                actual_path=replacement.get("path"),
                            )

            if kind == "asset":
                for field in ("license", "redistribution", "redaction"):
                    if not entry.get(field):
                        self.add("ASSET_PROVENANCE_MISSING", entry_path, "asset evidence 缺少许可/再分发/脱敏决定", id=eid, field=field)
                if not isinstance(path, str) or Path(path).is_absolute() or ".." in Path(path).parts or not path.startswith("assets/"):
                    self.add("ASSET_EVIDENCE_PATH_INVALID", entry_path, "asset evidence path 必须是 assets/ 下安全相对路径", id=eid, asset_path=path)

        # 即使输入绕过 schema，也明确拒绝 supersedes 引用环。
        unique_entries = {eid: matches[0][1] for eid, matches in evidence_by_id.items() if len(matches) == 1}
        reported_cycles: set[tuple[str, ...]] = set()
        for start in sorted(unique_entries):
            positions: dict[str, int] = {}
            chain: list[str] = []
            current: Any = start
            while isinstance(current, str) and current in unique_entries:
                if current in positions:
                    cycle = chain[positions[current]:]
                    canonical = tuple(sorted(cycle))
                    if canonical not in reported_cycles:
                        reported_cycles.add(canonical)
                        self.add(
                            "EVIDENCE_SUPERSEDES_CYCLE",
                            f"{self.rel(template / 'evidence.yaml')}#entries",
                            "evidence supersedes 关系不得形成环",
                            evidence_ids=list(canonical),
                        )
                    break
                positions[current] = len(chain)
                chain.append(current)
                current = unique_entries[current].get("supersedes")

        for path, record in sorted(records.items()):
            matches = active_tokens.get(path, [])
            if len(matches) != 1:
                self.add("TOKEN_EVIDENCE_COUNT", template / "evidence.yaml", "每个 token 必须恰有一条 active evidence", token_path=path, count=len(matches))
                continue
            if matches[0].get("origin") != record.get("origin"):
                self.add("TOKEN_EVIDENCE_ORIGIN_MISMATCH", template / "evidence.yaml", "token 与 evidence origin 不一致", token_path=path, token_origin=record.get("origin"), evidence_origin=matches[0].get("origin"))

        actual_assets: set[str] = set()
        asset_root = template / "assets"
        if asset_root.is_dir():
            for asset in sorted(path for path in asset_root.rglob("*") if path.is_file()):
                relative = asset.relative_to(template).as_posix()
                if asset.suffix.lower() not in ASSET_SUFFIXES:
                    self.add("ASSET_TYPE_UNSUPPORTED", asset, "assets/ 中包含未纳入 provenance 扫描契约的文件类型", suffix=asset.suffix.lower())
                    continue
                actual_assets.add(relative)
        for path in sorted(actual_assets | set(active_assets)):
            matches = active_assets.get(path, [])
            if path not in actual_assets:
                self.add("ASSET_EVIDENCE_DANGLING", template / "evidence.yaml", "active asset evidence 指向不存在的资产", asset_path=path)
            elif len(matches) != 1:
                self.add("ASSET_EVIDENCE_COUNT", template / "evidence.yaml", "每个实际资产必须恰有一条 active asset evidence", asset_path=path, count=len(matches))
            else:
                decision = matches[0]
                if decision.get("redistribution") == "prohibited":
                    self.add("ASSET_REDISTRIBUTION_PROHIBITED", template / "evidence.yaml", "许可决定禁止分发，但资产仍存在于模板", asset_path=path, evidence_id=decision.get("id"))
                if decision.get("redaction") == "required":
                    self.add("ASSET_REDACTION_REQUIRED", template / "evidence.yaml", "资产要求脱敏但尚未记录为 applied", asset_path=path, evidence_id=decision.get("id"))

    def _token_color(self, theme: dict[str, Any], role: str) -> Color:
        record = theme.get(role)
        if not _record(record):
            raise ValueError(f"role {role!r} missing or not a token record")
        return parse_color(record["value"])

    def _opaque_background(self, theme: dict[str, Any], role: str) -> Color:
        color = self._token_color(theme, role)
        if color.opaque():
            return color
        if role == "background":
            raise ValueError("background has alpha but no underlying background is declared")
        base = self._token_color(theme, "background")
        if not base.opaque():
            raise ValueError("base background is not opaque")
        return composite(color, base)

    def _check_contrast(self, template: Path, tokens: dict[str, Any], meta: dict[str, Any], definitions: set[str]) -> None:
        themes = tokens.get("themes")
        if not isinstance(themes, dict):
            return
        version = str(meta.get("template_version", "0.0.0"))
        waivers = meta.get("waivers", []) if isinstance(meta.get("waivers", []), list) else []
        waiver_map: dict[str, dict[str, Any]] = {}
        for waiver in waivers:
            if not isinstance(waiver, dict):
                continue
            rule_id = waiver.get("rule_id")
            if rule_id not in definitions:
                self.add("WAIVER_RULE_DANGLING", template / "meta.yaml", "waiver 引用了不存在的 rule ID", rule_id=rule_id)
                continue
            if _semver(version) >= _semver(str(waiver.get("expires_at_template_version", "0.0.0"))):
                self.add("WAIVER_EXPIRED", template / "meta.yaml", "contrast waiver 已到期", rule_id=rule_id, pair=waiver.get("pair"))
                continue
            waiver_map[str(waiver.get("pair"))] = waiver
        for theme_name, theme in sorted(themes.items()):
            counters = {"checked": 0, "failed": 0, "skipped": 0, "waived": 0}
            key = f"{template.name}/{theme_name}"
            self.result.contrast[key] = counters
            if not isinstance(theme, dict):
                counters["failed"] += 1
                self.add("CONTRAST_THEME_INVALID", template / "tokens.yaml", "theme 不是 mapping", theme=theme_name)
                continue
            pairs: list[tuple[str, str, float]] = [("foreground", "background", 4.5)]
            for foreground, background in (
                ("muted-foreground", "background"), ("surface-foreground", "surface"),
                ("card-foreground", "card"), ("popover-foreground", "popover"),
                ("primary-foreground", "primary"), ("brand-foreground", "brand"),
                ("sidebar-foreground", "sidebar"),
            ):
                if foreground in theme or background in theme:
                    pairs.append((foreground, background, 4.5))
            if "destructive-foreground" in theme:
                pairs.append(("destructive-foreground", "destructive", 4.5))
            elif "destructive" in theme:
                for surface in ("background", "surface", "card", "popover"):
                    if surface in theme:
                        pairs.append(("destructive", surface, 4.5))
            if "ring" in theme:
                # ring 可能出现在任一已声明容器表面；所有实际表面都必须达到非文本 3:1。
                for surface in ("background", "surface", "card", "popover", "sidebar"):
                    if surface in theme:
                        pairs.append(("ring", surface, 3.0))
            for foreground, background, threshold in pairs:
                pair = f"{foreground}/{background}"
                if pair in waiver_map:
                    counters["waived"] += 1
                    continue
                try:
                    bg = self._opaque_background(theme, background)
                except ValueError as exc:
                    counters["failed"] += 1
                    self.add("CONTRAST_BACKGROUND_UNRESOLVED", template / "tokens.yaml", "required pair 的背景无法确定", theme=theme_name, pair=pair, error=str(exc))
                    continue
                try:
                    fg = self._token_color(theme, foreground)
                    if not fg.opaque():
                        fg = composite(fg, bg)
                    ratio = contrast_ratio(fg, bg)
                except ValueError as exc:
                    counters["failed"] += 1
                    self.add("COLOR_UNPARSEABLE", template / "tokens.yaml", "required pair 包含无法解析的颜色", theme=theme_name, pair=pair, error=str(exc))
                    continue
                counters["checked"] += 1
                if ratio + 1e-9 < threshold:
                    counters["failed"] += 1
                    self.add("CONTRAST_TOO_LOW", template / "tokens.yaml", "required contrast pair 未达到阈值", theme=theme_name, pair=pair, ratio=round(ratio, 4), threshold=threshold)
            if counters["checked"] == 0:
                counters["failed"] += 1
                self.add("CONTRAST_ZERO_CHECKED", template / "tokens.yaml", "主题没有任何成功计算的 required contrast pair", theme=theme_name)

    def _design_markdown(self, template: Path) -> list[Path]:
        return [path for path in sorted(template.rglob("*.md")) if "apply" not in path.relative_to(template).parts]

    def _check_rules(self, template: Path) -> tuple[set[str], set[str]]:
        definitions: set[str] = set()
        references: set[str] = set()
        definition_locations: dict[str, str] = {}
        for path in sorted(template.rglob("*.md")):
            text = path.read_text(encoding="utf-8")
            for rule_id in RULE_DEFINITION.findall(text):
                if rule_id in definitions:
                    self.add("RULE_ID_DUPLICATE", path, "rule ID 定义重复", rule_id=rule_id, first=definition_locations[rule_id])
                else:
                    definitions.add(rule_id)
                    definition_locations[rule_id] = self.rel(path)
            references.update(RULE_REFERENCE.findall(text))
        for rule_id in sorted(references - definitions):
            self.add("RULE_REFERENCE_DANGLING", template, "跨文件引用的 rule ID 不存在", rule_id=rule_id)
        return definitions, references

    def _check_structured_refs(self, template: Path, definitions: set[str], references: set[str]) -> None:
        for path in sorted(template.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in {".yaml", ".yml", ".json"}:
                continue
            if path.name in {"meta.yaml", "tokens.yaml", "evidence.yaml"}:
                data = self.load(path)
            else:
                data = self.load(path)
                if data is None:
                    continue
                if path.name.startswith("feedback") or "feedback" in path.parts:
                    if isinstance(data, dict):
                        self.schema_validate("feedback", path, data)
                        self._check_feedback_transitions(path, data)
                elif path.name.startswith("verification"):
                    self.schema_validate("verification", path, data)
            if data is not None:
                references.update(_values_with_rule_ids(data))
        for rule_id in sorted(references - definitions):
            self.add("RULE_REFERENCE_DANGLING", template, "结构化记录引用的 rule ID 不存在", rule_id=rule_id)

    def _check_feedback_transitions(self, path: Path, data: dict[str, Any]) -> None:
        current: str | None = None
        for index, item in enumerate(data.get("status_history", [])):
            if not isinstance(item, dict):
                continue
            source, target = item.get("from"), item.get("to")
            if source != current or target not in LEGAL_FEEDBACK.get(current, set()):
                self.add("FEEDBACK_TRANSITION_ILLEGAL", path, "feedback status_history 包含非法迁移", index=index, expected_from=current, actual_from=source, to=target)
            current = target
        if current is not None and current != data.get("status"):
            self.add("FEEDBACK_STATUS_MISMATCH", path, "feedback.status 与 status_history 末状态不一致", history=current, status=data.get("status"))

    def _check_links(self, template: Path) -> None:
        for path in sorted(template.rglob("*.md")):
            text = path.read_text(encoding="utf-8")
            for target in MARKDOWN_LINK.findall(text):
                clean = target.split("#", 1)[0].split("?", 1)[0]
                if not clean or re.match(r"^[a-z][a-z0-9+.-]*:", clean, re.I):
                    continue
                resolved = (path.parent / clean).resolve()
                try:
                    resolved.relative_to(template)
                except ValueError:
                    self.add("LINK_OUTSIDE_ACTIVE_PATH", path, "模板相对链接越出模板 active path", target=target)
                    continue
                if not resolved.exists():
                    self.add("LINK_BROKEN", path, "模板本地相对链接不存在", target=target)

    def _check_apply(self, template: Path, records: dict[str, dict[str, Any]]) -> None:
        apply = template / "apply"
        if not apply.exists():
            return
        if not (apply / "playbook.md").is_file():
            self.add("APPLY_PLAYBOOK_MISSING", apply / "playbook.md", "存在 apply/ 时必须包含 playbook.md")
        exact: dict[str, list[str]] = {}
        for token_path, record in sorted(records.items()):
            for value in _precision_values(record):
                exact.setdefault(value, []).append(token_path)
        for path in sorted(apply.rglob("*.md")):
            text = path.read_text(encoding="utf-8")
            copied = [
                {"value": value, "token_paths": exact[value]}
                for value in sorted(exact)
                if _contains_precision(text, value)
            ]
            if copied:
                self.add("APPLY_PRECISION_DUPLICATION", path, "apply/ 不得复制 tokens.yaml 中的精确值", copied=copied)
            if PROHIBITED_TEXT.search(text):
                self.add("PROHIBITED_ENGINEERING_CONTENT", path, "apply/ 包含项目工程或技术栈内容")

    def _check_prohibited(self, template: Path) -> None:
        for path in sorted(template.rglob("*")):
            relative = path.relative_to(template)
            lowered = [part.lower() for part in relative.parts]
            prohibited_parts = sorted(set(lowered) & PROHIBITED_PARTS)
            if prohibited_parts:
                self.add("PROHIBITED_ENGINEERING_PATH", path, "模板内禁止工程目录或 implementation 内容", parts=prohibited_parts)
            if not path.is_file():
                continue
            name = path.name.lower()
            if (
                re.fullmatch(r"stack-.*\.md", name, re.I)
                or name == "code-structure.md"
                or name in ENGINEERING_FILES
                or name.endswith((".lock", ".lockb"))
                or path.suffix.lower() in ENGINEERING_SUFFIXES
                or re.fullmatch(r"(?:vite|webpack|rollup|eslint|prettier|tailwind)\.config\..+", name)
            ):
                self.add("PROHIBITED_ENGINEERING_PATH", path, "模板内禁止源码、工程清单、stack adapter 或代码结构文件")
            if path.suffix.lower() in TEXT_SUFFIXES and "apply" not in lowered and name != "fidelity.yaml":
                text = path.read_text(encoding="utf-8")
                if PROHIBITED_TEXT.search(text):
                    self.add("PROHIBITED_ENGINEERING_CONTENT", path, "模板设计文档包含项目工程或技术栈内容")

    def _check_layout_confidence(self, template: Path, meta: dict[str, Any], data: dict[str, Any] | None, *, present: bool) -> None:
        layout = (meta.get("confidence") if isinstance(meta.get("confidence"), dict) else {}).get("layout")
        if layout != "high":
            return
        complete = present and isinstance(data, dict) and classify_sidecar(data, present=True) == "structural" and chrome_complete_sidecar(data)
        if complete:
            return
        self.add(
            LAYOUT_HIGH_WITHOUT_CHROME,
            template / "meta.yaml",
            "confidence.layout 为 high 时必须存在 chrome-complete structural sidecar",
        )

    def _check_fidelity(
        self,
        template: Path,
        rule_ids: set[str],
        token_paths: set[str],
        source_ids: set[str],
        meta: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        path = template / "fidelity.yaml"
        meta = meta or {}
        if not path.is_file():
            replay = empty_replay()
            if self.require_source_replay:
                self.add("STRUCTURAL_REPLAY_REQUIRED", template, "structural Generate-from-source 要求对该 session source 执行 replay")
            self._check_layout_confidence(template, meta, None, present=False)
            return identity_payload(None, present=False, replay=replay)
        data = self.load(path)
        if not isinstance(data, dict):
            payload = identity_payload(data if isinstance(data, dict) else None, present=True, replay=empty_replay())
            if self.require_source_replay:
                self.add("STRUCTURAL_REPLAY_REQUIRED", path, "fidelity sidecar 无法 replay")
            self._check_layout_confidence(template, meta, None, present=True)
            return payload
        for subpath, message, details in fidelity_schema_errors(data, self.repo_root):
            full = f"{self.rel(path)}#{subpath}" if subpath else self.rel(path)
            self.result.add("FIDELITY_SCHEMA_INVALID", full, message, **details)
        conformance = classify_sidecar(data, present=True)
        if conformance == UNKNOWN:
            self.add(
                "FIDELITY_PROFILE_UNSUPPORTED",
                path,
                "未知 fidelity schema 或 profile，fail closed",
                declared_schema=data.get("schema_version"),
                declared_profile=data.get("profile"),
            )
            self._check_layout_confidence(template, meta, data, present=True)
            return identity_payload(data, present=True, replay=empty_replay())
        validate_fidelity_semantics(
            data,
            result=self.result,
            path=path,
            rel=self.rel(path),
            token_paths=token_paths,
            rule_ids=rule_ids,
            source_ids=source_ids,
        )
        replay = empty_replay()
        if self.source_roots:
            replay = replay_profile(
                data,
                source_roots=self.source_roots,
                candidate_template=template,
                capture_receipt=self.capture_receipt,
            )
            if replay.get("status") != "passed":
                self.add(
                    "FIDELITY_SOURCE_REPLAY_FAILED",
                    path,
                    "session source replay 失败",
                    **{key: replay.get(key) for key in ("declared", "resolved", "executed", "passed", "errors")},
                )
        if self.require_source_replay:
            counts = [replay.get(key) for key in ("declared", "resolved", "executed", "passed")]
            ok = (
                replay.get("status") == "passed"
                and all(isinstance(value, int) and not isinstance(value, bool) for value in counts)
                and counts[0] > 0
                and len(set(counts)) == 1
            )
            if not ok:
                self.add(
                    "STRUCTURAL_REPLAY_REQUIRED",
                    path,
                    "structural Generate-from-source 要求 declared = resolved = executed = passed > 0",
                    replay=replay,
                )
        self._check_layout_confidence(template, meta, data, present=True)
        return identity_payload(data, present=True, replay=replay)

    def validate_index(self, index: Path, templates: list[Path]) -> None:
        if not index.is_file():
            self.add("INDEX_MISSING", index, "模板索引不存在")
            return
        rows: dict[str, list[str]] = {}
        for line in index.read_text(encoding="utf-8").splitlines():
            if not line.lstrip().startswith("|"):
                continue
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) >= 4 and cells[0] not in {"名称", "---"} and not set(cells[0]) <= {"-", ":"}:
                rows[cells[0]] = cells
        for template in templates:
            meta_path = template / "meta.yaml"
            meta = self.load(meta_path) if meta_path.is_file() else None
            if not isinstance(meta, dict):
                continue
            name = str(meta.get("name", template.name))
            if name not in rows:
                self.add("INDEX_ROW_MISSING", index, "INDEX 缺少模板行", template=name)
                continue
            source = meta.get("sources", [{}])
            source_type = source[0].get("type") if isinstance(source, list) and source and isinstance(source[0], dict) else None
            expected = [name, str(meta.get("description", "")), str(source_type or ""), str(meta.get("captured_at", ""))]
            actual = rows[name][:4]
            fields = ["name", "description", "source.type", "captured_at"]
            for field, wanted, got in zip(fields, expected, actual):
                if wanted != got:
                    self.add("INDEX_FIELD_MISMATCH", index, "INDEX 字段与 meta 不一致", template=name, field=field, expected=wanted, actual=got)


def discover_templates(paths: list[Path]) -> tuple[list[Path], Path | None]:
    templates: list[Path] = []
    inferred_index: Path | None = None
    for raw in paths:
        path = raw.resolve()
        if (path / "meta.yaml").exists() or (path / "tokens.yaml").exists():
            templates.append(path)
        elif path.is_dir():
            children = sorted(child for child in path.iterdir() if child.is_dir() and not child.name.startswith("."))
            templates.extend(children)
            if (path / "INDEX.md").is_file():
                inferred_index = path / "INDEX.md"
    return sorted(set(templates)), inferred_index


def _example_inputs(paths: Iterable[Path], extra: Iterable[Path] = ()) -> list[str]:
    found: list[str] = []
    for path in [*paths, *extra]:
        posix = path.as_posix()
        if path_has_example_prefix(posix) or path_has_example_prefix(path.resolve().as_posix()):
            found.append(posix)
    return found


def validate_paths(
    paths: list[Path],
    repo_root: Path,
    *,
    index: Path | None = None,
    schema_dir: Path | None = None,
    source_roots: dict[str, Path] | None = None,
    require_source_replay: bool = False,
    capture_receipt: dict[str, Any] | None = None,
) -> ValidationResult:
    validator = TemplateValidator(
        repo_root=repo_root,
        schema_dir=schema_dir,
        source_roots=source_roots,
        require_source_replay=require_source_replay,
        capture_receipt=capture_receipt,
    )
    example_hits = _example_inputs(paths, [index] if index is not None else [])
    example_hits.extend(
        str(root) for root in (source_roots or {}).values() if path_has_example_prefix(root)
    )
    validator.result.discovery = {
        "inputs": [path.as_posix() for path in paths],
        "source_bindings": sorted((source_roots or {})),
        "require_source_replay": require_source_replay,
        "example_hits": example_hits,
    }
    if example_hits:
        for hit in example_hits:
            validator.add("EXAMPLE_PATH_IN_SCOPE", hit, "example/** 不得作为 validator/eval/source 输入")
        return validator.result
    templates, inferred_index = discover_templates(paths)
    if not templates:
        validator.add("NO_TEMPLATES", paths[0] if paths else repo_root, "没有发现模板目录")
    for template in templates:
        validator.validate_template(template)
    selected_index = index or inferred_index
    if selected_index is not None:
        validator.validate_index(selected_index, templates)
    return validator.result
