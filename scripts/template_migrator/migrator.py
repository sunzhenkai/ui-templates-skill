from __future__ import annotations

import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

import yaml

from template_validation.loading import load_data
from template_validation.schema import SchemaStore
from template_validation.validator import token_records


class MigrationError(RuntimeError):
    pass


DIMENSIONAL_ROOTS = {"typography", "spacing", "radius", "layout"}
VALID_UNITS = {"px", "rem", "em", "%", "ms", "s", "deg", "ratio", "unitless"}


def _stable_id(prefix: str, value: str) -> str:
    return f"{prefix}-{hashlib.sha256(value.encode('utf-8')).hexdigest()[:12]}"


def _infer_unit(path: tuple[str, ...], report: dict[str, list[Any]]) -> str:
    unit = "px" if path and path[0] in DIMENSIONAL_ROOTS else "unitless"
    dotted = ".".join(path)
    basis = (
        f"v1 {path[0]} 数值按旧模板维度约定候选为 px"
        if unit == "px"
        else "v1 未声明单位；保留数值并显式标记 unitless 候选"
    )
    report["inferred"].append({"path": f"{dotted}.unit", "value": unit, "basis": basis})
    report["unresolved"].append({"path": f"{dotted}.unit", "reason": "v1 未显式声明单位；候选单位需维护者确认"})
    return unit


def _normalize_compound(value: Any, path: tuple[str, ...], report: dict[str, list[Any]]) -> Any:
    """将 mapping 内 numeric 成员转成显式 {value, unit}，允许成员异构单位。"""
    if isinstance(value, dict):
        if "value" in value and set(value).issubset({"value", "unit"}):
            member_value = value["value"]
            member: dict[str, Any] = {"value": member_value}
            if isinstance(member_value, (int, float)) and not isinstance(member_value, bool):
                explicit = value.get("unit")
                member["unit"] = explicit if explicit in VALID_UNITS else _infer_unit(path, report)
                if explicit is not None and explicit not in VALID_UNITS:
                    report["breaking"].append({"path": ".".join(path), "reason": f"unknown unit {explicit!r}"})
            elif isinstance(member_value, list):
                member["value"] = member_value
                if any(isinstance(item, (int, float)) and not isinstance(item, bool) for item in member_value):
                    explicit = value.get("unit")
                    member["unit"] = explicit if explicit in VALID_UNITS else _infer_unit(path, report)
            return member
        return {str(key): _normalize_compound(member, (*path, str(key)), report) for key, member in value.items()}
    if isinstance(value, list):
        member = {"value": value}
        if any(isinstance(item, (int, float)) and not isinstance(item, bool) for item in value):
            member["unit"] = _infer_unit(path, report)
        return member
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return {"value": value, "unit": _infer_unit(path, report)}
    if isinstance(value, (str, bool)):
        return value
    report["breaking"].append({"path": ".".join(path), "reason": "null/unsupported compound value"})
    return "needs-confirmation"


def _record(value: Any, origin: str, path: tuple[str, ...], report: dict[str, list[Any]], explicit_unit: Any = None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "value": _normalize_compound(value, path, report) if isinstance(value, dict) else value,
        "origin": origin if origin in {"source", "computed", "estimated", "default"} else "default",
    }
    numeric = isinstance(value, (int, float)) and not isinstance(value, bool)
    numeric_list = isinstance(value, list) and any(isinstance(item, (int, float)) and not isinstance(item, bool) for item in value)
    if numeric or numeric_list:
        if explicit_unit in VALID_UNITS:
            result["unit"] = explicit_unit
        else:
            result["unit"] = _infer_unit(path, report)
            if explicit_unit is not None:
                report["breaking"].append({"path": ".".join(path), "reason": f"unknown unit {explicit_unit!r}"})
    return result


def convert_tokens(data: dict[str, Any], report: dict[str, list[Any]]) -> dict[str, Any]:
    def walk(node: Any, path: tuple[str, ...]) -> Any:
        dotted = ".".join(path)
        if isinstance(node, dict) and "origin" in node:
            origin = str(node.get("origin"))
            explicit_unit = node.get("unit")
            payload = {key: value for key, value in node.items() if key not in {"origin", "unit"}}
            value = payload["value"] if set(payload) == {"value"} else payload
            result = _record(value, origin, path, report, explicit_unit)
            report["converted"].append({"path": dotted, "action": "normalized-token-record"})
            if origin not in {"source", "computed", "estimated", "default"}:
                report["breaking"].append({"path": dotted, "reason": f"unknown origin {origin!r} converted to default"})
            return result
        if isinstance(node, dict):
            return {str(key): walk(value, (*path, str(key))) for key, value in node.items()}
        if isinstance(node, (list, str, int, float, bool)):
            report["converted"].append({"path": dotted, "action": "wrapped-bare-leaf", "origin": "default"})
            report["unresolved"].append({"path": dotted, "reason": "v1 bare leaf 无 origin；候选暂标 default，需确认依据"})
            return _record(node, "default", path, report)
        report["breaking"].append({"path": dotted, "reason": "null/unsupported token value"})
        return _record("needs-confirmation", "default", path, report)

    converted: dict[str, Any] = {"schema_version": 2}
    for key, value in data.items():
        if key in {"schema", "schema_version"}:
            continue
        converted[str(key)] = walk(value, (str(key),))
    return converted


def _source(meta: dict[str, Any], report: dict[str, list[Any]]) -> list[dict[str, Any]]:
    old = meta.get("source") if isinstance(meta.get("source"), dict) else {}
    ref = str(old.get("ref", "needs-confirmation"))
    revision_match = re.search(r"\b([0-9a-f]{7,64})\b", ref, re.I)
    revision = revision_match.group(1) if revision_match else "needs-confirmation"
    if not revision_match:
        report["unresolved"].append({"path": "meta.sources[0].revision", "reason": "旧 source.ref 不含可识别 revision"})
    report["converted"].append({"path": "meta.source", "action": "converted-to-sources-list"})
    captured = str(meta.get("captured_at", "1970-01-01"))
    return [{
        "id": "source-001",
        "type": old.get("type", "doc"),
        "ref": ref,
        "revision": revision,
        "captured_at": f"{captured}T00:00:00Z",
    }]


def _coverage_block(values: list[str], observed: list[str] | None = None, defaulted: list[str] | None = None) -> dict[str, list[str]]:
    observed = sorted(set(observed or []))
    defaulted = sorted(set(defaulted or []))
    declared = sorted(set(values) | set(observed) | set(defaulted))
    return {"declared": declared, "observed": observed, "defaulted": defaulted, "unsupported": []}


def convert_meta(meta: dict[str, Any], tokens: dict[str, Any], report: dict[str, list[Any]]) -> dict[str, Any]:
    old_cov = meta.get("coverage") if isinstance(meta.get("coverage"), dict) else {}
    old_components = old_cov.get("components") if isinstance(old_cov.get("components"), dict) else {}
    old_states = old_cov.get("states") if isinstance(old_cov.get("states"), dict) else {}
    platforms = [str(item) for item in meta.get("platforms", ["web"])]
    themes = sorted(tokens.get("themes", {}).keys()) if isinstance(tokens.get("themes"), dict) else []
    viewports = [str(item) for item in old_cov.get("viewports", [])]
    page_modes = ["A", "B", "C", "D", "E"]
    report["inferred"].append({"path": "meta.coverage.page_modes", "basis": "v1 routes-and-layouts.md 的 A–E 模式"})
    confidence = str(meta.get("confidence", "low"))
    result = {
        "schema_version": 2,
        "template_version": "2.0.0",
        "name": str(meta.get("name", "needs-confirmation")),
        "description": str(meta.get("description", "needs-confirmation")),
        "sources": _source(meta, report),
        "captured_at": str(meta.get("captured_at", "1970-01-01")),
        "tokens": "tokens.yaml",
        "evidence": "evidence.yaml",
        "platforms": platforms,
        "tags": [str(item) for item in meta.get("tags", [])],
        "confidence": {"overall": confidence, "layout": confidence, "visual": confidence, "components": confidence},
        "coverage": {
            "platforms": _coverage_block(platforms, platforms),
            "viewports": _coverage_block(viewports, viewports),
            "themes": _coverage_block(themes, themes),
            "page_modes": _coverage_block(page_modes, page_modes),
            "components": _coverage_block([], old_components.get("observed", []), old_components.get("defaulted", [])),
            "states": _coverage_block([], old_states.get("observed", []), old_states.get("defaulted", [])),
        },
    }
    report["inferred"].append({"path": "meta.confidence", "basis": "v1 confidence 扩展到四个维度"})
    return result


def build_evidence(tokens: dict[str, Any], meta: dict[str, Any], report: dict[str, list[Any]]) -> dict[str, Any]:
    entries = []
    source = meta["sources"][0]
    captured = source["captured_at"]
    for path, record in sorted(token_records(tokens).items()):
        origin = record["origin"]
        entry: dict[str, Any] = {
            "id": _stable_id("evidence", path),
            "kind": "default" if origin == "default" else "token",
            "path": path,
            "origin": origin,
            "status": "active",
            "confidence": meta["confidence"]["visual"],
            "captured_at": captured,
        }
        if origin == "default":
            entry["decision_id"] = "MIGRATION-DEFAULT-" + hashlib.sha256(path.encode("utf-8")).hexdigest()[:12].upper()
            entry["basis"] = "由 v1 token origin 迁移；默认依据待维护者确认"
            report["unresolved"].append({"path": f"evidence:{path}", "reason": "default basis 需要确认"})
        else:
            entry.update({
                "method": "migrated-v1",
                "source_id": source["id"],
                "source_revision": source["revision"],
                "locator": f"tokens.yaml#{path}",
            })
        entries.append(entry)
    report["converted"].append({"path": "evidence.yaml", "action": f"generated-{len(entries)}-stable-entries"})
    return {"schema_version": 2, "entries": entries}


def allocate_rule_ids(candidate: Path, report: dict[str, list[Any]]) -> None:
    spec = candidate / "spec.md"
    if spec.is_file():
        lines = spec.read_text(encoding="utf-8").splitlines()
        in_nonnegotiables = False
        count = 0
        output = []
        for line in lines:
            if line.startswith("## 0.") and "Non-negotiables" in line:
                in_nonnegotiables = True
            elif in_nonnegotiables and line.startswith("## "):
                in_nonnegotiables = False
            match = re.match(r"^(\d+\.\s+)(?!\[NN-\d{3}\])(.+)$", line)
            if in_nonnegotiables and match:
                count += 1
                line = f"{match.group(1)}[NN-{count:03d}] {match.group(2)}"
            output.append(line)
        spec.write_text("\n".join(output) + "\n", encoding="utf-8")
        report["converted"].append({"path": "spec.md", "action": f"allocated-{count}-NN-rule-ids"})

    routes = candidate / "routes-and-layouts.md"
    if routes.is_file():
        lines = routes.read_text(encoding="utf-8").splitlines()
        section = 0
        counters = {"LAYOUT": 0, "ROUTE": 0, "RESP": 0, "QUALITY": 0}
        output = []
        for line in lines:
            heading = re.match(r"^##\s+(\d+)\.", line)
            if heading:
                section = int(heading.group(1))
            namespace = "LAYOUT" if section in {1, 2} else "ROUTE" if section in {3, 5} else "RESP" if section == 4 else "QUALITY"
            match = re.match(r"^(-\s+)(?!\[[A-Z]+-\d{3}\])(.+)$", line)
            if match:
                counters[namespace] += 1
                line = f"{match.group(1)}[{namespace}-{counters[namespace]:03d}] {match.group(2)}"
            output.append(line)
        routes.write_text("\n".join(output) + "\n", encoding="utf-8")
        report["converted"].append({"path": "routes-and-layouts.md", "action": "allocated-stable-layout-route-responsive-quality-ids"})

    components = candidate / "components.md"
    if components.is_file():
        lines = components.read_text(encoding="utf-8").splitlines()
        count = 0
        output = []
        for line in lines:
            match = re.match(r"^(-\s+)(?!\[AX-\d{3}\])(.+)$", line)
            if match:
                count += 1
                line = f"{match.group(1)}[AX-{count:03d}] {match.group(2)}"
            output.append(line)
        components.write_text("\n".join(output) + "\n", encoding="utf-8")
        report["converted"].append({"path": "components.md", "action": f"allocated-{count}-AX-rule-ids"})

    for path in sorted((candidate / "apply").rglob("*.md")) if (candidate / "apply").is_dir() else []:
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"spec(?:\.md)?\s+Non-negotiables\s*#(\d+)", lambda m: f"@NN-{int(m.group(1)):03d}", text, flags=re.I)
        path.write_text(text, encoding="utf-8")


def _dump_yaml(path: Path, data: dict[str, Any]) -> None:
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8")


def migrate(source: Path, candidate: Path) -> dict[str, Any]:
    source, candidate = source.resolve(), candidate.resolve()
    # 任一方向存在祖先关系都可能让 candidate 清理误删 source，必须在任何删除前拒绝。
    if source == candidate or source in candidate.parents or candidate in source.parents:
        raise MigrationError("source 与 candidate 必须是互不包含的独立目录")
    if not source.is_dir():
        raise MigrationError(f"source 不存在或不是目录: {source}")
    for required in ("meta.yaml", "tokens.yaml", "spec.md"):
        if not (source / required).is_file():
            raise MigrationError(f"v1 source 缺少 {required}")

    report: dict[str, Any] = {
        "schema_version": 1,
        "migration": "template-v1-to-v2",
        "source": source.as_posix(),
        "candidate": candidate.as_posix(),
        "converted": [], "inferred": [], "unresolved": [], "breaking": [],
    }
    staging: Path | None = None
    try:
        if candidate.exists():
            marker = candidate / ".migration-candidate.json"
            if not marker.is_file():
                raise MigrationError("candidate 已存在且不是本 migrator 生成，拒绝覆盖")
            shutil.rmtree(candidate)
        temp_parent = candidate.parent
        temp_parent.mkdir(parents=True, exist_ok=True)
        staging = Path(tempfile.mkdtemp(prefix=f".{candidate.name}.", dir=temp_parent))
        shutil.copytree(source, staging / "candidate", dirs_exist_ok=True)
        work = staging / "candidate"
        old_tokens = load_data(source / "tokens.yaml")
        old_meta = load_data(source / "meta.yaml")
        if not isinstance(old_tokens, dict) or not isinstance(old_meta, dict):
            raise MigrationError("v1 meta/tokens 根必须是 mapping")
        tokens = convert_tokens(old_tokens, report)
        meta = convert_meta(old_meta, tokens, report)
        evidence = build_evidence(tokens, meta, report)

        schema_dir = Path(__file__).resolve().parents[2] / "schemas/template/v2"
        store = SchemaStore(schema_dir)
        schema_errors = {
            kind: store.errors(kind, document)
            for kind, document in (("tokens", tokens), ("meta", meta), ("evidence", evidence))
        }
        schema_errors = {kind: errors for kind, errors in schema_errors.items() if errors}
        if schema_errors:
            raise MigrationError(f"迁移候选未通过 v2 schema: {schema_errors}")

        _dump_yaml(work / "tokens.yaml", tokens)
        _dump_yaml(work / "meta.yaml", meta)
        _dump_yaml(work / "evidence.yaml", evidence)
        allocate_rule_ids(work, report)
        report["converted"].append({"path": "candidate", "action": "validated-v2-meta-tokens-evidence-schemas"})
        for key in ("converted", "inferred", "unresolved", "breaking"):
            report[key] = sorted(report[key], key=lambda item: json.dumps(item, ensure_ascii=False, sort_keys=True))
        (work / "migration-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        marker = {"schema_version": 1, "migration": "template-v1-to-v2", "source": source.as_posix()}
        (work / ".migration-candidate.json").write_text(json.dumps(marker, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
        work.replace(candidate)
    except MigrationError:
        raise
    except Exception as exc:
        raise MigrationError(f"迁移失败且 source 保持不变: {exc}") from exc
    finally:
        if staging is not None and staging.exists():
            shutil.rmtree(staging)
    return report
