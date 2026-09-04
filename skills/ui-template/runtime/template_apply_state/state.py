from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import tempfile
import unicodedata
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import yaml

try:  # CLI 从 scripts/ 启动
    from template_validation.loading import LoadError, load_data
    from template_validation.schema import SchemaStore
except ModuleNotFoundError:  # unittest 从仓库根导入 scripts.*
    from scripts.template_validation.loading import LoadError, load_data
    from scripts.template_validation.schema import SchemaStore

DIGEST_ALGORITHM = "sha256-canonical-json-v1"
RULE_ID = re.compile(r"^(?:NN|TOKEN|LAYOUT|ROUTE|AX|RESP|QUALITY)-[0-9]{3}$")
LEGAL_FEEDBACK = {
    None: {"proposed"},
    "proposed": {"accepted", "known-gap", "rejected"},
    "accepted": {"applied", "known-gap", "rejected"},
    "applied": {"verified", "known-gap"},
    "known-gap": {"accepted", "rejected"},
    "rejected": set(),
    "verified": set(),
}
TERMINAL_FEEDBACK = {"rejected", "verified"}
PHASE_ARTIFACTS: dict[int, tuple[str, ...]] = {
    0: ("00-intake.md",),
    1: ("01-design-direction.md", "01-token-map.yaml"),
    2: ("02-routes.yaml",),
    3: ("03-structure.md",),
    4: ("04-components.yaml",),
    5: ("05-07-progress.yaml",),
    6: ("05-07-progress.yaml",),
    7: ("05-07-progress.yaml",),
    8: ("08-verification.json",),
    9: ("09-review.md",),
}


class ApplyStateError(ValueError):
    """Apply 状态输入无法安全或确定性处理。"""


@dataclass(frozen=True)
class Finding:
    code: str
    path: str
    message: str
    phase: int | None = None
    details: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {key: value for key, value in asdict(self).items() if value is not None}


def _sorted_findings(findings: Iterable[Finding]) -> list[Finding]:
    unique: dict[tuple[str, str, str, int, str], Finding] = {}
    for finding in findings:
        key = (
            finding.code,
            finding.path,
            finding.message,
            finding.phase if finding.phase is not None else -1,
            json.dumps(finding.details, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str),
        )
        unique[key] = finding
    return [unique[key] for key in sorted(unique)]


def canonical_json_bytes(value: Any) -> bytes:
    """返回 UTF-8、sorted-key、无空白且拒绝 NaN 的 canonical JSON。"""
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise ApplyStateError(f"值不能 canonical JSON 编码: {exc}") from exc
    return text.encode("utf-8")


def canonical_digest(value: Any) -> dict[str, str]:
    return {
        "algorithm": DIGEST_ALGORITHM,
        "value": hashlib.sha256(canonical_json_bytes(value)).hexdigest(),
    }


def load_structured(path: Path) -> Any:
    try:
        return load_data(path)
    except LoadError as exc:
        raise ApplyStateError(str(exc)) from exc


def _tree_manifest(root: Path, *, excluded_roots: set[str] | None = None) -> list[dict[str, str]]:
    excluded = {".git", ".ui-template-apply", "__pycache__"} if excluded_roots is None else excluded_roots
    if not root.exists():
        raise ApplyStateError(f"快照路径不存在: {root}")
    if root.is_file():
        return [{"path": root.name, "sha256": hashlib.sha256(root.read_bytes()).hexdigest()}]
    files: list[dict[str, str]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        relative = path.relative_to(root)
        if any(part in excluded for part in relative.parts):
            continue
        files.append({"path": relative.as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    return files


def source_identity(root: Path) -> str:
    """有 Git 时绑定 commit + 目标树 dirty payload；否则绑定排除状态目录后的源码快照。"""
    import subprocess

    root = root.resolve()
    try:
        commit = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            check=True, capture_output=True, text=True, encoding="utf-8",
        ).stdout.strip()
        pathspecs = [".", ":(exclude).ui-template-apply/**", ":(exclude)**/__pycache__/**"]
        status = subprocess.run(
            ["git", "-C", str(root), "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", *pathspecs],
            check=True, capture_output=True,
        ).stdout
        diff = subprocess.run(
            ["git", "-C", str(root), "diff", "--binary", "HEAD", "--", *pathspecs],
            check=True, capture_output=True,
        ).stdout
    except (FileNotFoundError, subprocess.CalledProcessError):
        return "snapshot:" + canonical_digest(_tree_manifest(root))["value"]
    if not status and not diff:
        return f"git:{commit}:clean"
    untracked: list[dict[str, str]] = []
    for entry in status.split(b"\0"):
        if entry.startswith(b"?? "):
            relative = entry[3:].decode("utf-8", errors="surrogateescape")
            path = root / relative
            if path.is_file() and ".ui-template-apply" not in path.parts:
                untracked.append({"path": relative, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    payload = {
        "status_sha256": hashlib.sha256(status).hexdigest(),
        "diff_sha256": hashlib.sha256(diff).hexdigest(),
        "untracked": sorted(untracked, key=lambda item: item["path"]),
    }
    return f"git:{commit}:dirty:{canonical_digest(payload)['value']}"


def build_identity(command: str, artifact: Path) -> str:
    """绑定实际构建命令与文件/目录产物内容；不执行命令。"""
    if not command.strip():
        raise ApplyStateError("build command 不能为空")
    payload = {"command": command.strip(), "artifacts": _tree_manifest(artifact, excluded_roots=set())}
    return "build:" + canonical_digest(payload)["value"]


def _artifact_value(path: Path) -> Any:
    if path.suffix.lower() in {".yaml", ".yml", ".json"}:
        return load_structured(path)
    if path.suffix.lower() == ".md":
        return {"media_type": "text/markdown", "text": path.read_text(encoding="utf-8").replace("\r\n", "\n")}
    return {"media_type": "application/octet-stream", "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def _schema_store(schema_dir: Path | None = None) -> SchemaStore:
    directory = schema_dir or Path(__file__).resolve().parents[2] / "schemas/template/v2"
    return SchemaStore(directory)


def _schema_findings(kind: str, data: Any, path: str, schema_dir: Path | None = None, phase: int | None = None) -> list[Finding]:
    if not isinstance(data, dict):
        return [Finding("APPLY_SCHEMA_INVALID", path, "记录根必须是 object", phase)]
    if data.get("schema_version") != 2:
        return [Finding("APPLY_SCHEMA_UNSUPPORTED", path, "仅支持 schema_version: 2", phase, {"declared": data.get("schema_version")})]
    return [
        Finding("APPLY_SCHEMA_INVALID", f"{path}#{subpath}" if subpath else path, message, phase, details)
        for subpath, message, details in _schema_store(schema_dir).errors(kind, data)
    ]


def _digest_equal(actual: Any, expected: Any) -> bool:
    return isinstance(actual, dict) and actual == expected and actual.get("algorithm") == DIGEST_ALGORITHM


def _safe_relative(root: Path, raw: str) -> Path | None:
    candidate = Path(raw)
    if candidate.is_absolute() or ".." in candidate.parts:
        return None
    resolved = (root / candidate).resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError:
        return None
    return resolved


def _review_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ApplyStateError("09-review.md 必须以结构化 YAML front matter 开始")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ApplyStateError("09-review.md 的 YAML front matter 未闭合")
    data = yaml.safe_load(text[4:end])
    if not isinstance(data, dict):
        raise ApplyStateError("09-review.md front matter 必须是 object")
    return data


def validate_verification(
    data: dict[str, Any],
    *,
    path: str,
    apply_root: Path,
    expected_kind: str,
    template_digest: dict[str, str] | None = None,
    source_identity: str | None = None,
    build_identity: str | None = None,
    known_rule_ids: set[str] | None = None,
    phase8_records: list[dict[str, Any]] | None = None,
    closed_phase8_record_ids: set[str] | None = None,
    schema_dir: Path | None = None,
) -> list[Finding]:
    phase = 8 if expected_kind == "phase-8-verification" else 9
    findings = _schema_findings("verification", data, path, schema_dir, phase)
    if data.get("kind") != expected_kind:
        findings.append(Finding("VERIFICATION_KIND_MISMATCH", path, "验证记录 kind 与阶段不一致", phase, {"expected": expected_kind, "actual": data.get("kind")}))
    if not isinstance(data.get("browser_identity"), str) or not data["browser_identity"].strip():
        findings.append(Finding("VERIFICATION_BROWSER_IDENTITY_REQUIRED", path, "Phase 8/9 必须绑定实际浏览器及版本", phase))
    for field, expected in (("template_digest", template_digest), ("source_identity", source_identity), ("build_identity", build_identity)):
        if expected is not None and data.get(field) != expected:
            findings.append(Finding("VERIFICATION_IDENTITY_STALE", path, f"{field} 不属于当前构建", phase, {"field": field, "expected": expected, "actual": data.get(field)}))

    phase8_by_id = {
        record.get("id"): record
        for record in (phase8_records or [])
        if isinstance(record, dict) and isinstance(record.get("id"), str)
    }
    closed_ids = closed_phase8_record_ids or set()
    seen: set[str] = set()
    linked_phase8: set[str] = set()
    allowed_status = {"passed", "failed", "waived"} if phase == 8 else {"recheck-passed", "recheck-failed"}
    for index, record in enumerate(data.get("records", []) if isinstance(data.get("records"), list) else []):
        if not isinstance(record, dict):
            continue
        record_path = f"{path}#records.{index}"
        record_id = record.get("id")
        if isinstance(record_id, str) and record_id in seen:
            findings.append(Finding("VERIFICATION_RECORD_DUPLICATE", record_path, "验证记录 UUID 重复", phase, {"id": record_id}))
        elif isinstance(record_id, str):
            seen.add(record_id)
        status = record.get("status")
        if status not in allowed_status:
            findings.append(Finding("VERIFICATION_STATUS_INVALID", record_path, "状态不适用于该阶段", phase, {"status": status, "allowed": sorted(allowed_status)}))
        elif status == "recheck-failed" or (status == "failed" and record_id not in closed_ids):
            findings.append(Finding("VERIFICATION_GATE_FAILED", record_path, "当前构建仍有未闭合的失败记录，阶段不得 complete", phase, {"status": status, "phase8_record_id": record_id if phase == 8 else record.get("phase8_record_id")}))
        rule_id = record.get("rule_id")
        if known_rule_ids is not None and rule_id not in known_rule_ids:
            findings.append(Finding("VERIFICATION_RULE_DANGLING", record_path, "验证记录引用未知 rule ID", phase, {"rule_id": rule_id}))

        if phase == 9:
            linked_id = record.get("phase8_record_id")
            if isinstance(linked_id, str) and linked_id in linked_phase8:
                findings.append(Finding("VERIFICATION_RECHECK_DUPLICATE", record_path, "同一 Phase 8 record 只能有一条 Phase 9 re-check", phase, {"phase8_record_id": linked_id}))
            elif isinstance(linked_id, str):
                linked_phase8.add(linked_id)
            original = phase8_by_id.get(linked_id)
            if original is None:
                findings.append(Finding("VERIFICATION_RECHECK_DANGLING", record_path, "Phase 9 re-check 未引用已知 Phase 8 record", phase, {"phase8_record_id": linked_id}))
            else:
                identity_fields = ("rule_id", "expected", "route", "viewport", "theme", "state")
                mismatches = {
                    field: {"phase8": original.get(field), "phase9": record.get(field)}
                    for field in identity_fields
                    if original.get(field) != record.get(field)
                }
                if mismatches:
                    findings.append(Finding("VERIFICATION_RECHECK_IDENTITY_MISMATCH", record_path, "Phase 9 re-check 与被引用的 Phase 8 场景身份不一致", phase, {"phase8_record_id": linked_id, "mismatches": mismatches}))

        for evidence_ref in record.get("evidence_refs", []) if isinstance(record.get("evidence_refs"), list) else []:
            evidence_path = _safe_relative(apply_root, str(evidence_ref))
            if evidence_path is None or not evidence_path.is_file():
                findings.append(Finding("VERIFICATION_EVIDENCE_MISSING", record_path, "evidence_ref 不存在或越界", phase, {"evidence_ref": evidence_ref}))
    return _sorted_findings(findings)


def _template_identity(template_value: Any) -> dict[str, Any]:
    """从 meta 或包含 meta 的 envelope 读取当前模板 identity。"""
    value = template_value
    if isinstance(value, dict) and isinstance(value.get("meta"), dict):
        value = value["meta"]
    if not isinstance(value, dict):
        return {"name": None, "version": None}
    return {
        "name": value.get("name"),
        "version": value.get("template_version", value.get("version")),
    }


def validate_checkpoint(
    checkpoint: dict[str, Any],
    *,
    apply_root: Path,
    template_value: Any,
    tokens_value: Any,
    scope: dict[str, Any],
    source_identity: str,
    build_identity: str,
    known_rule_ids: set[str] | None = None,
    schema_dir: Path | None = None,
    fidelity_value: Any | None = None,
    previous_fidelity: Any | None = None,
) -> list[Finding]:
    root = apply_root.resolve()
    findings = _schema_findings("checkpoint", checkpoint, "checkpoint.yaml", schema_dir)
    identity_value = template_value if fidelity_value is None else {"template": template_value, "fidelity": fidelity_value}
    template_digest = canonical_digest(identity_value)
    tokens_digest = canonical_digest(tokens_value)
    current_template = _template_identity(template_value)
    checkpoint_template = checkpoint.get("template", {})
    checkpoint_identity = {
        "name": checkpoint_template.get("name") if isinstance(checkpoint_template, dict) else None,
        "version": checkpoint_template.get("version") if isinstance(checkpoint_template, dict) else None,
    }
    if checkpoint_identity != current_template:
        findings.append(Finding(
            "CHECKPOINT_TEMPLATE_IDENTITY_MISMATCH",
            "checkpoint.yaml#template",
            "checkpoint 模板 name/version 与当前模板不一致",
            0,
            {"expected": current_template, "actual": checkpoint_identity},
        ))
    if not _digest_equal(checkpoint.get("template", {}).get("digest"), template_digest):
        from .fidelity import fidelity_recovery_findings

        facet_findings = fidelity_recovery_findings(previous=previous_fidelity, current=fidelity_value)
        if facet_findings and checkpoint_identity == current_template:
            findings.extend(facet_findings)
        else:
            findings.append(Finding("CHECKPOINT_TEMPLATE_DRIFT", "checkpoint.yaml#template.digest", "模板语义已变化", 0))
    if not _digest_equal(checkpoint.get("tokens_digest"), tokens_digest):
        findings.append(Finding("CHECKPOINT_TOKEN_DRIFT", "checkpoint.yaml#tokens_digest", "tokens 语义已变化", 1))
    if checkpoint.get("scope") != scope:
        findings.append(Finding("CHECKPOINT_SCOPE_CHANGED", "checkpoint.yaml#scope", "included/deferred/excluded 范围已变化", 0))
    if checkpoint.get("source_identity") != source_identity:
        findings.append(Finding("CHECKPOINT_SOURCE_STALE", "checkpoint.yaml#source_identity", "源码 revision 已变化，Phase 8 证据过期", 8))
    if checkpoint.get("build_identity") != build_identity:
        findings.append(Finding("CHECKPOINT_BUILD_STALE", "checkpoint.yaml#build_identity", "build identity 已变化，Phase 8 证据过期", 8))

    phases = checkpoint.get("phases", []) if isinstance(checkpoint.get("phases"), list) else []
    by_id = {phase.get("id"): phase for phase in phases if isinstance(phase, dict) and isinstance(phase.get("id"), int)}
    for phase_id in range(10):
        phase = by_id.get(phase_id)
        if not phase:
            findings.append(Finding("CHECKPOINT_PHASE_MISSING", "checkpoint.yaml#phases", "缺少标准阶段", phase_id, {"phase": phase_id}))
            continue
        if phase.get("status") != "complete":
            continue
        artifacts = {item.get("path"): item for item in phase.get("artifacts", []) if isinstance(item, dict)}
        for required in PHASE_ARTIFACTS[phase_id]:
            if required not in artifacts:
                findings.append(Finding("CHECKPOINT_ARTIFACT_UNDECLARED", f"checkpoint.yaml#phases.{phase_id}", "complete 阶段未声明必需 artifact", phase_id, {"artifact": required}))
        for raw_path, record in sorted(artifacts.items()):
            artifact = _safe_relative(root, str(raw_path))
            if artifact is None:
                findings.append(Finding("CHECKPOINT_ARTIFACT_PATH_INVALID", str(raw_path), "artifact 路径越界或为绝对路径", phase_id))
                continue
            if not artifact.is_file():
                findings.append(Finding("CHECKPOINT_ARTIFACT_MISSING", str(raw_path), "checkpoint artifact 不存在", phase_id))
                continue
            try:
                actual_digest = canonical_digest(_artifact_value(artifact))
            except (ApplyStateError, OSError, UnicodeError) as exc:
                findings.append(Finding("CHECKPOINT_ARTIFACT_INVALID", str(raw_path), "artifact 无法读取", phase_id, {"error": str(exc)}))
                continue
            if not _digest_equal(record.get("digest"), actual_digest):
                findings.append(Finding("CHECKPOINT_ARTIFACT_DRIFT", str(raw_path), "artifact digest 不匹配", phase_id))

    verification_path = root / "08-verification.json"
    phase8_data: dict[str, Any] | None = None
    if by_id.get(8, {}).get("status") == "complete" and verification_path.is_file():
        loaded = load_structured(verification_path)
        if isinstance(loaded, dict):
            phase8_data = loaded

    review_path = root / "09-review.md"
    review_data: dict[str, Any] | None = None
    if by_id.get(9, {}).get("status") == "complete" and review_path.is_file():
        try:
            review_data = _review_frontmatter(review_path)
        except ApplyStateError as exc:
            findings.append(Finding("REVIEW_FRONTMATTER_INVALID", "09-review.md", str(exc), 9))

    closed_phase8_ids: set[str] = set()
    if review_data is not None:
        review_findings = validate_verification(
            review_data,
            path="09-review.md",
            apply_root=root,
            expected_kind="phase-9-review",
            template_digest=template_digest,
            source_identity=source_identity,
            build_identity=build_identity,
            known_rule_ids=known_rule_ids,
            phase8_records=phase8_data.get("records", []) if phase8_data is not None else [],
            schema_dir=schema_dir,
        )
        findings.extend(review_findings)
        if not review_findings:
            closed_phase8_ids = {
                record["phase8_record_id"]
                for record in review_data.get("records", [])
                if isinstance(record, dict)
                and record.get("status") == "recheck-passed"
                and isinstance(record.get("phase8_record_id"), str)
            }

    if phase8_data is not None:
        findings.extend(validate_verification(
            phase8_data,
            path="08-verification.json",
            apply_root=root,
            expected_kind="phase-8-verification",
            template_digest=template_digest,
            source_identity=source_identity,
            build_identity=build_identity,
            known_rule_ids=known_rule_ids,
            closed_phase8_record_ids=closed_phase8_ids,
            schema_dir=schema_dir,
        ))
    return _sorted_findings(findings)


def recovery_decision(findings: Iterable[Finding], checkpoint: dict[str, Any]) -> dict[str, Any]:
    findings = _sorted_findings(findings)
    candidate_phases = [finding.phase for finding in findings if finding.phase is not None]
    for phase in checkpoint.get("phases", []) if isinstance(checkpoint.get("phases"), list) else []:
        if isinstance(phase, dict) and phase.get("status") != "complete" and isinstance(phase.get("id"), int):
            candidate_phases.append(phase["id"])
    earliest = min(candidate_phases) if candidate_phases else None
    return {
        "valid": not findings and earliest is None,
        "earliest_phase": earliest,
        "findings": [finding.to_dict() for finding in findings],
    }


def recover_checkpoint(checkpoint: dict[str, Any], decision: dict[str, Any]) -> dict[str, Any]:
    recovered = copy.deepcopy(checkpoint)
    earliest = decision.get("earliest_phase")
    if earliest is None:
        return recovered
    for phase in recovered.get("phases", []):
        if isinstance(phase, dict) and isinstance(phase.get("id"), int) and phase["id"] >= earliest:
            phase["status"] = "pending" if phase["id"] == earliest else "stale"
            phase["evidence_refs"] = []
    return recovered


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _feedback_domain(scope: str, targets: Iterable[str]) -> str:
    normalized_targets = sorted(set(targets))
    return ",".join(normalized_targets) if normalized_targets else scope


def feedback_fingerprint(template: dict[str, Any], scenario: str, scope: str, targets: Iterable[str]) -> str:
    identity = {"name": template.get("name"), "version": template.get("version")}
    payload = {"template": identity, "scenario": normalize_text(scenario), "rule_domain": _feedback_domain(scope, targets)}
    return canonical_digest(payload)["value"]


def _timestamp(now: str | None = None) -> str:
    return now or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def create_feedback(
    *,
    template: dict[str, Any],
    scenario: str,
    suggestion: str,
    scope: str,
    evidence_refs: Iterable[str],
    targets: Iterable[str] = (),
    feedback_id: str | None = None,
    now: str | None = None,
) -> dict[str, Any]:
    target_list = sorted(set(targets))
    evidence_list = sorted(set(evidence_refs))
    if not evidence_list or any(not isinstance(ref, str) or not ref.strip() for ref in evidence_list):
        raise ApplyStateError("feedback evidence_refs 必须至少包含一个非空证据引用")
    at = _timestamp(now)
    return {
        "schema_version": 2,
        "id": feedback_id or str(uuid.uuid4()),
        "fingerprint": feedback_fingerprint(template, scenario, scope, target_list),
        "template": dict(template),
        "scenario": scenario.strip(),
        "suggestion": suggestion.strip(),
        "scope": scope,
        "status": "proposed",
        "targets": target_list,
        "evidence_refs": evidence_list,
        "created_at": at,
        "updated_at": at,
        "status_history": [{"from": None, "to": "proposed", "at": at}],
    }


def validate_feedback(
    data: dict[str, Any],
    *,
    path: str = "feedback",
    apply_root: Path | None = None,
    known_rule_ids: set[str] | None = None,
    schema_dir: Path | None = None,
) -> list[Finding]:
    findings = _schema_findings("feedback", data, path, schema_dir)
    expected = feedback_fingerprint(data.get("template", {}), str(data.get("scenario", "")), str(data.get("scope", "")), data.get("targets", []) if isinstance(data.get("targets"), list) else [])
    if data.get("fingerprint") != expected:
        findings.append(Finding("FEEDBACK_FINGERPRINT_MISMATCH", path, "fingerprint 与规范化内容不一致", details={"expected": expected, "actual": data.get("fingerprint")}))
    current: str | None = None
    for index, transition in enumerate(data.get("status_history", []) if isinstance(data.get("status_history"), list) else []):
        if not isinstance(transition, dict):
            continue
        source, target = transition.get("from"), transition.get("to")
        if source != current or target not in LEGAL_FEEDBACK.get(current, set()):
            findings.append(Finding("FEEDBACK_TRANSITION_ILLEGAL", f"{path}#status_history.{index}", "非法 feedback 状态迁移", details={"expected_from": current, "actual_from": source, "to": target}))
        if not (source is None and target == "proposed") and not transition.get("reason"):
            findings.append(Finding("FEEDBACK_TRANSITION_REASON_REQUIRED", f"{path}#status_history.{index}", "除初始 proposed 外，每次状态迁移必须保留自身 reason"))
        current = target
    if current != data.get("status"):
        findings.append(Finding("FEEDBACK_STATUS_MISMATCH", path, "status 与 history 末状态不一致", details={"history": current, "status": data.get("status")}))
    if data.get("status") != "proposed" and not data.get("reason"):
        findings.append(Finding("FEEDBACK_REASON_REQUIRED", path, "处置后的 feedback 必须保留 reason"))

    targets = data.get("targets", []) if isinstance(data.get("targets"), list) else []
    if data.get("status") in {"accepted", "applied", "verified"} and not targets:
        findings.append(Finding("FEEDBACK_TARGET_REQUIRED", path, "接受或应用的 feedback 必须指向 rule ID"))
    if targets and known_rule_ids is None:
        findings.append(Finding("FEEDBACK_RULE_CONTEXT_REQUIRED", path, "feedback 包含 targets，但未提供 known_rule_ids 规则上下文"))
    elif known_rule_ids is not None:
        for target in targets:
            if target not in known_rule_ids:
                findings.append(Finding("FEEDBACK_TARGET_DANGLING", path, "feedback target 引用未知 rule ID", details={"target": target}))

    if apply_root is not None:
        for evidence_ref in data.get("evidence_refs", []) if isinstance(data.get("evidence_refs"), list) else []:
            evidence_path = _safe_relative(apply_root.resolve(), str(evidence_ref))
            if evidence_path is None or not evidence_path.is_file():
                findings.append(Finding("FEEDBACK_EVIDENCE_MISSING", path, "evidence_ref 不存在或越出 .ui-template-apply 根", details={"evidence_ref": evidence_ref}))
    return _sorted_findings(findings)


def _feedback_paths(directory: Path) -> list[Path]:
    return sorted(path for path in [*directory.glob("*.yaml"), *directory.glob("*.yml")] if path.is_file()) if directory.is_dir() else []


def validate_feedback_inbox(
    directory: Path,
    *,
    apply_root: Path,
    known_rule_ids: set[str] | None = None,
    schema_dir: Path | None = None,
) -> list[Finding]:
    findings: list[Finding] = []
    ids: dict[str, str] = {}
    active_fingerprints: dict[str, str] = {}
    for path in _feedback_paths(directory):
        try:
            data = load_structured(path)
        except (ApplyStateError, OSError, UnicodeError) as exc:
            findings.append(Finding("FEEDBACK_FILE_INVALID", path.name, "feedback 文件无法安全读取", details={"error": str(exc)}))
            continue
        if not isinstance(data, dict):
            findings.append(Finding("APPLY_SCHEMA_INVALID", path.name, "feedback 根必须是 object"))
            continue
        findings.extend(validate_feedback(
            data,
            path=path.name,
            apply_root=apply_root,
            known_rule_ids=known_rule_ids,
            schema_dir=schema_dir,
        ))
        feedback_id = data.get("id")
        if isinstance(feedback_id, str):
            if path.stem != feedback_id:
                findings.append(Finding(
                    "FEEDBACK_FILENAME_ID_MISMATCH",
                    path.name,
                    "feedback 文件名 stem 必须等于记录 UUID",
                    details={"stem": path.stem, "id": feedback_id},
                ))
            if feedback_id in ids:
                findings.append(Finding("FEEDBACK_UUID_DUPLICATE", path.name, "feedback UUID 重复", details={"first": ids[feedback_id], "id": feedback_id}))
            ids[feedback_id] = path.name
        fingerprint = data.get("fingerprint")
        if isinstance(fingerprint, str) and data.get("status") not in TERMINAL_FEEDBACK:
            if fingerprint in active_fingerprints:
                findings.append(Finding("FEEDBACK_ACTIVE_DUPLICATE", path.name, "active feedback fingerprint 重复", details={"first": active_fingerprints[fingerprint], "fingerprint": fingerprint}))
            active_fingerprints[fingerprint] = path.name
    return _sorted_findings(findings)


def _atomic_write(path: Path, content: bytes, *, replace: bool = True) -> None:
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        if replace:
            os.replace(temporary, path)
        else:
            try:
                os.link(temporary, path)
            except FileExistsError as exc:
                raise ApplyStateError(f"feedback 新目标路径发生碰撞，拒绝覆盖: {path.name}") from exc
            temporary.unlink()
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def _write_feedback_transaction(
    path: Path,
    data: dict[str, Any],
    *,
    directory: Path,
    apply_root: Path,
    known_rule_ids: set[str] | None,
    schema_dir: Path | None,
    allow_replace: bool,
) -> None:
    existed = path.exists()
    if existed and not allow_replace:
        raise ApplyStateError(f"feedback 新目标路径已存在，拒绝覆盖: {path.name}")
    if existed and not path.is_file():
        raise ApplyStateError(f"feedback 目标不是普通文件，拒绝写入: {path.name}")
    original = path.read_bytes() if existed else None
    content = yaml.safe_dump(data, allow_unicode=True, sort_keys=False).encode("utf-8")
    committed = False
    try:
        _atomic_write(path, content, replace=allow_replace)
        committed = True
        post_findings = validate_feedback_inbox(
            directory,
            apply_root=apply_root,
            known_rule_ids=known_rule_ids,
            schema_dir=schema_dir,
        )
        if post_findings:
            raise ApplyStateError("feedback inbox 写后验证失败: " + "; ".join(f"{finding.path}:{finding.code}" for finding in post_findings))
    except Exception as exc:
        try:
            if original is None:
                if committed:
                    path.unlink(missing_ok=True)
            else:
                _atomic_write(path, original)
            rollback_findings = validate_feedback_inbox(
                directory,
                apply_root=apply_root,
                known_rule_ids=known_rule_ids,
                schema_dir=schema_dir,
            )
            if rollback_findings:
                raise ApplyStateError("feedback 写入失败且回滚后 inbox 仍无效: " + "; ".join(f"{finding.path}:{finding.code}" for finding in rollback_findings))
        except Exception as rollback_exc:
            raise ApplyStateError(f"feedback 写入失败且无法安全回滚: {rollback_exc}") from exc
        if isinstance(exc, ApplyStateError):
            raise
        raise ApplyStateError(f"feedback 写入失败，已回滚: {exc}") from exc


def merge_feedback(
    directory: Path,
    candidate: dict[str, Any],
    *,
    apply_root: Path,
    known_rule_ids: set[str] | None = None,
    now: str | None = None,
    schema_dir: Path | None = None,
) -> tuple[Path, dict[str, Any], bool]:
    candidate_findings = validate_feedback(
        candidate,
        path="candidate",
        apply_root=apply_root,
        known_rule_ids=known_rule_ids,
        schema_dir=schema_dir,
    )
    if candidate_findings:
        raise ApplyStateError("candidate feedback 无效: " + "; ".join(finding.code for finding in candidate_findings))
    directory.mkdir(parents=True, exist_ok=True)
    inbox_findings = validate_feedback_inbox(
        directory,
        apply_root=apply_root,
        known_rule_ids=known_rule_ids,
        schema_dir=schema_dir,
    )
    if inbox_findings:
        raise ApplyStateError("feedback inbox 无效，拒绝合并: " + "; ".join(f"{finding.path}:{finding.code}" for finding in inbox_findings))
    matches: dict[Path, dict[str, Any]] = {}
    terminal_fingerprint_matches: dict[Path, dict[str, Any]] = {}
    for path in _feedback_paths(directory):
        existing = load_structured(path)
        if not isinstance(existing, dict):
            continue
        same_id = existing.get("id") == candidate.get("id")
        same_fingerprint = existing.get("fingerprint") == candidate.get("fingerprint")
        if same_id or (same_fingerprint and existing.get("status") not in TERMINAL_FEEDBACK):
            matches[path] = existing
        elif same_fingerprint:
            terminal_fingerprint_matches[path] = existing
    all_matches = {**terminal_fingerprint_matches, **matches}
    if len(all_matches) > 1:
        raise ApplyStateError("feedback inbox 已存在重复 UUID/fingerprint，拒绝猜测合并目标")
    if all_matches:
        path, existing = next(iter(all_matches.items()))
        if existing.get("status") in TERMINAL_FEEDBACK:
            return path, existing, True
        merged = copy.deepcopy(existing)
        merged["evidence_refs"] = sorted(set(existing.get("evidence_refs", [])) | set(candidate.get("evidence_refs", [])))
        merged["updated_at"] = _timestamp(now)
        merged_findings = validate_feedback(
            merged,
            path=path.name,
            apply_root=apply_root,
            known_rule_ids=known_rule_ids,
            schema_dir=schema_dir,
        )
        if merged_findings:
            raise ApplyStateError("merged feedback 无效，拒绝写入: " + "; ".join(finding.code for finding in merged_findings))
        _write_feedback_transaction(
            path,
            merged,
            directory=directory,
            apply_root=apply_root,
            known_rule_ids=known_rule_ids,
            schema_dir=schema_dir,
            allow_replace=True,
        )
        return path, merged, True
    path = directory / f"{candidate['id']}.yaml"
    _write_feedback_transaction(
        path,
        candidate,
        directory=directory,
        apply_root=apply_root,
        known_rule_ids=known_rule_ids,
        schema_dir=schema_dir,
        allow_replace=False,
    )
    return path, candidate, False


def feedback_receipt(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": data.get("id"),
        "fingerprint": data.get("fingerprint"),
        "status": data.get("status"),
        "terminal": data.get("status") in TERMINAL_FEEDBACK,
        "reason": data.get("reason"),
        "targets": data.get("targets", []),
        "updated_at": data.get("updated_at"),
        "evidence_count": len(data.get("evidence_refs", [])),
    }
