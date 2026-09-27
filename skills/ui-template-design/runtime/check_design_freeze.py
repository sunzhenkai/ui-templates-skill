"""Validate design freeze/checkpoint and freeze gate."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path, PurePosixPath
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker

DIGEST_ALGORITHM = "sha256-canonical-json-v1"
INDEX_MARKERS = ("templates/INDEX.md", "templates\\INDEX.md")
TASK_CLASSES = ("bootstrap", "refactor", "iterate")


class DesignFreezeError(RuntimeError):
    pass


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def digest_of(value: Any) -> dict[str, str]:
    return {"algorithm": DIGEST_ALGORITHM, "value": hashlib.sha256(canonical_json_bytes(value)).hexdigest()}


def _safe_relative(value: str) -> str:
    path = PurePosixPath(value.replace("\\", "/"))
    if not value or path.is_absolute() or ".." in path.parts:
        raise DesignFreezeError(f"UNSAFE_PATH: {value}")
    return path.as_posix()


def load_yaml(path: Path) -> Any:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        raise DesignFreezeError(f"YAML_UNREADABLE: {path}: {exc}") from exc


def schema_dir() -> Path:
    bundled = Path(__file__).resolve().parent / "schemas" / "design-freeze" / "v1"
    if (bundled / "freeze.schema.json").is_file():
        return bundled
    repo = Path(__file__).resolve().parents[3] / "schemas" / "design-freeze" / "v1"
    if (repo / "freeze.schema.json").is_file():
        return repo
    raise DesignFreezeError("SCHEMA_MISSING: design-freeze/v1")


def _validator(name: str) -> Draft202012Validator:
    path = schema_dir() / name
    schema = json.loads(path.read_text(encoding="utf-8"))
    return Draft202012Validator(schema, format_checker=FormatChecker())


def validate_document(kind: str, data: Any) -> list[str]:
    name = "freeze.schema.json" if kind == "freeze" else "checkpoint.schema.json"
    return [f"{list(error.absolute_path)}: {error.message}" for error in _validator(name).iter_errors(data)]


def classify_task_class(
    *,
    output_root_empty: bool,
    freeze_status: str | None,
    freeze_digest_mismatch: bool = False,
    user_rebuild: bool = False,
    scope_unresolved: bool = False,
) -> dict[str, Any]:
    """用可观察信号判定任务类；禁止把口吻当成证据。"""
    if scope_unresolved and not user_rebuild:
        return {"ok": False, "task_class": None, "code": "SCOPE_UNRESOLVED"}
    if freeze_digest_mismatch and freeze_status == "frozen" and not user_rebuild:
        return {"ok": False, "task_class": None, "code": "DIGEST_MISMATCH"}
    if user_rebuild:
        return {"ok": True, "task_class": "bootstrap" if output_root_empty else "refactor", "code": "USER_REBUILD"}
    if freeze_status == "frozen":
        return {"ok": True, "task_class": "iterate", "code": "FROZEN"}
    if output_root_empty:
        return {"ok": True, "task_class": "bootstrap", "code": "EMPTY_OUTPUT"}
    return {"ok": True, "task_class": "refactor", "code": "EXISTING_OUTPUT"}


def _index_touched(freeze: dict[str, Any]) -> bool:
    for item in freeze.get("touched_paths") or []:
        normalized = str(item).replace("\\", "/")
        if normalized.endswith("templates/INDEX.md") or normalized in INDEX_MARKERS:
            return True
        if normalized == "templates/INDEX.md":
            return True
    return False


def compute_digest(freeze: dict[str, Any]) -> dict[str, str]:
    body = {k: v for k, v in freeze.items() if k != "digest"}
    return digest_of(body)


def gate(project_root: Path, design_root: Path) -> dict[str, Any]:
    findings: list[dict[str, str]] = []
    freeze_path = design_root / "freeze.yaml"
    checkpoint_path = design_root / "checkpoint.yaml"
    if not freeze_path.is_file():
        findings.append({"code": "FREEZE_MISSING", "path": "freeze.yaml"})
        return {"ok": False, "findings": findings}
    freeze = load_yaml(freeze_path)
    if not isinstance(freeze, dict):
        findings.append({"code": "FREEZE_NOT_MAPPING", "path": "freeze.yaml"})
        return {"ok": False, "findings": findings}
    for error in validate_document("freeze", freeze):
        findings.append({"code": "FREEZE_SCHEMA", "path": "freeze.yaml", "detail": error})
    output_root = freeze.get("output_root") or "."
    try:
        _safe_relative(str(output_root))
    except DesignFreezeError as exc:
        findings.append({"code": "UNSAFE_OUTPUT_ROOT", "path": "freeze.yaml", "detail": str(exc)})
    for item in freeze.get("touched_paths") or []:
        try:
            _safe_relative(str(item))
        except DesignFreezeError as exc:
            findings.append({"code": "UNSAFE_TOUCHED_PATH", "path": str(item), "detail": str(exc)})
    if freeze.get("template") in (None, {}) and _index_touched(freeze):
        findings.append({"code": "INDEX_FORBIDDEN_WITHOUT_TEMPLATE", "path": "templates/INDEX.md"})
    if freeze.get("status") == "frozen":
        stored = freeze.get("digest", {}).get("value")
        computed = compute_digest(freeze)
        if stored and computed["value"] != stored:
            findings.append({"code": "DIGEST_MISMATCH", "path": "freeze.yaml"})
        if freeze.get("kit", {}).get("primitives") and not freeze.get("kit", {}).get("patterns"):
            findings.append({"code": "PRIMITIVES_ONLY_NOT_COMPLETE", "path": "freeze.yaml"})
        if freeze.get("kit", {}).get("gallery") and not (design_root / "07-gallery.yaml").is_file():
            findings.append({"code": "GALLERY_MISSING", "path": "07-gallery.yaml"})
        rules = [str(item) for item in freeze.get("rules_files") or []]
        if not rules:
            findings.append({"code": "RULES_MISSING", "path": "freeze.yaml"})
        else:
            for relative in rules:
                try:
                    path = project_root / _safe_relative(relative)
                except DesignFreezeError as exc:
                    findings.append({"code": "UNSAFE_RULES_PATH", "path": relative, "detail": str(exc)})
                    continue
                if not path.is_file():
                    findings.append({"code": "RULES_FILE_MISSING", "path": relative})
    if checkpoint_path.is_file():
        checkpoint = load_yaml(checkpoint_path)
        if isinstance(checkpoint, dict):
            for error in validate_document("checkpoint", checkpoint):
                findings.append({"code": "CHECKPOINT_SCHEMA", "path": "checkpoint.yaml", "detail": error})
        else:
            findings.append({"code": "CHECKPOINT_NOT_MAPPING", "path": "checkpoint.yaml"})
    return {"ok": not findings, "findings": findings, "digest_algorithm": DIGEST_ALGORITHM}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="校验 design freeze / checkpoint")
    sub = parser.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate")
    validate.add_argument("kind", choices=["freeze", "checkpoint"])
    validate.add_argument("path", type=Path)
    digest_cmd = sub.add_parser("compute-digest")
    digest_cmd.add_argument("--freeze-path", type=Path, required=True)
    gate_cmd = sub.add_parser("gate")
    gate_cmd.add_argument("--design-root", type=Path, required=True)
    gate_cmd.add_argument("--project-root", type=Path, default=Path("."))
    gate_cmd.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.command == "validate":
            data = load_yaml(args.path)
            errors = validate_document(args.kind, data)
            payload = {"ok": not errors, "errors": errors}
        elif args.command == "compute-digest":
            data = load_yaml(args.freeze_path)
            if not isinstance(data, dict):
                raise DesignFreezeError("FREEZE_NOT_MAPPING")
            payload = compute_digest(data)
        else:
            payload = gate(args.project_root.resolve(), args.design_root.resolve())
    except DesignFreezeError as exc:
        payload = {"ok": False, "error": str(exc)}
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if payload.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
