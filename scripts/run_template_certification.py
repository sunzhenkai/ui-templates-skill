#!/usr/bin/env python3
"""Template Certification Gate：source-blind 干净重生 + Pattern Equivalence 验收。

本 runner 属于模板治理链路，不属于 Apply。它接受固定 Visual Oracle revision、
candidate package、固定 prompts digest 与显式 clean output root，执行 source-blind
前置检查，并把认证报告与 certification inventory 对照 candidate Component Family。
失败差异归类为 `package | apply-skill | certification-prompt`。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from validate_design_system import (  # noqa: E402
    validate_certification,
    validate_inventory,
)

SOURCE_BLIND_INPUT_TOKEN = re.compile(
    r"meta\.sources|source[-_]compare|visual[- ]oracle", re.I,
)
OWNERSHIP_BY_CODE = {
    "CERT_RECORD_MISSING": "package",
    "CERT_RECORD_NOT_IN_INVENTORY": "package",
    "CERT_OVER_FRAGMENTED": "package",
    "CERT_PACKAGE_DIGEST_MISMATCH": "package",
    "CERT_PACKAGE_IDENTITY_MISMATCH": "package",
    "FAMILY_EVIDENCE_MISSING": "package",
    "REFERENCE_DANGLING": "package",
    "CERT_BUILD_STALE": "certification-prompt",
    "CERT_ORACLE_STALE": "certification-prompt",
    "CERT_ASSERTION_NOT_MEASURABLE": "certification-prompt",
    "CERT_STATUS_CONTRADICTED": "certification-prompt",
    "SOURCE_BLIND_VIOLATION": "apply-skill",
    "INVENTORY_INVALID": "certification-prompt",
    "MANIFEST_MISSING": "package",
}
DEFAULT_OWNERSHIP = "package"


def prompts_digest_value(prompts: Path) -> str:
    """Digest a fixed prompts file or the sorted file tree of a prompts directory."""
    if prompts.is_file():
        return hashlib.sha256(prompts.read_bytes()).hexdigest()
    if not prompts.is_dir():
        raise SystemExit(f"PROMPTS_MISSING: {prompts}")
    accumulator = hashlib.sha256()
    for path in sorted(item for item in prompts.rglob("*") if item.is_file()):
        accumulator.update(path.relative_to(prompts).as_posix().encode("utf-8"))
        accumulator.update(b"\0")
        accumulator.update(path.read_bytes())
        accumulator.update(b"\0")
    return accumulator.hexdigest()


def ensure_clean_output_root(output_root: Path, *, allow_existing: bool) -> None:
    """Require a fresh, explicit clean output root; no prior generated output."""
    if output_root.exists():
        if not output_root.is_dir():
            raise SystemExit(f"OUTPUT_ROOT_INVALID: {output_root} is not a directory")
        has_content = any(output_root.iterdir())
        if has_content and not allow_existing:
            raise SystemExit(
                f"OUTPUT_ROOT_NOT_CLEAN: {output_root} is not empty; "
                "reuse of patched prior output is forbidden. "
                "Use a fresh clean output root and a fresh build identity."
            )


def write_gate_identity(
    output_root: Path,
    *,
    oracle_revision: str,
    package: dict[str, Any],
    prompts_digest: dict[str, str],
    build_identity: str,
    apply_mode: str,
    output_root_relative: str,
) -> Path:
    certification_dir = output_root / ".certification"
    certification_dir.mkdir(parents=True, exist_ok=True)
    identity = {
        "schema": "template-certification-gate-identity/v1",
        "oracle": {"kind": "git-revision", "revision": oracle_revision},
        "package": package,
        "prompts_digest": prompts_digest,
        "build": {
            "identity": build_identity,
            "output_root": output_root_relative,
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "apply_mode": apply_mode,
        "source_blind": {
            "apply_receives_oracle_paths": False,
            "prior_generated_output_reused": False,
        },
    }
    path = certification_dir / "gate-identity.json"
    path.write_text(
        json.dumps(identity, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def scan_source_blind_violations(output_root: Path, oracle_revision: str) -> list[dict[str, str]]:
    """The clean build must not receive oracle paths or prior generated output hints."""
    violations: list[dict[str, str]] = []
    if not output_root.is_dir():
        return violations
    revision_token = re.compile(re.escape(oracle_revision), re.I)
    for path in sorted(output_root.rglob("*")):
        if ".certification" in path.relative_to(output_root).parts:
            continue
        if not path.is_file() or path.suffix.lower() not in {".md", ".yaml", ".yml", ".json", ".txt"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        for token in (SOURCE_BLIND_INPUT_TOKEN, revision_token):
            match = token.search(text)
            if match:
                violations.append({
                    "code": "SOURCE_BLIND_VIOLATION",
                    "path": path.relative_to(output_root).as_posix(),
                    "message": f"clean build references oracle input: {match.group(0)}",
                })
                break
    return violations


def classify(report: dict[str, Any]) -> list[dict[str, str]]:
    classified: list[dict[str, str]] = []
    for error in report.get("errors", []):
        classified.append({
            "code": error["code"],
            "path": error["path"],
            "ownership": OWNERSHIP_BY_CODE.get(error["code"], DEFAULT_OWNERSHIP),
            "message": error["message"],
        })
    return classified


def run_validator(package: Path, *, require_family: bool) -> tuple[int, dict[str, Any]]:
    command = [
        sys.executable, str(ROOT / "scripts/validate_design_system.py"),
        "validate", str(package), "--kind", "package",
    ]
    if require_family:
        command.append("--require-component-family")
    process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    try:
        payload = json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"VALIDATOR_INVALID_JSON: {exc}\n{process.stderr}") from exc
    return process.returncode, payload


def cmd_prepare(args: argparse.Namespace) -> int:
    package = args.package.resolve()
    manifest_path = package / "design-system.yaml"
    if not manifest_path.is_file():
        raise SystemExit(f"MANIFEST_MISSING: {manifest_path}")
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    exit_code, report = run_validator(package, require_family=True)
    if exit_code != 0:
        print(json.dumps({"prepared": False, "package_validation": report}, ensure_ascii=False, indent=2))
        return 1

    output_root = args.output_root.resolve()
    ensure_clean_output_root(output_root, allow_existing=args.allow_existing)
    output_root.mkdir(parents=True, exist_ok=True)
    digest_input = dict(manifest)
    digest_input.pop("contract_digest", None)

    def canonical_digest(value: dict[str, Any]) -> str:
        return hashlib.sha256(
            json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"),
        ).hexdigest()

    package_block = {
        "id": manifest["id"],
        "version": manifest["version"],
        "digest": {"algorithm": "sha256-canonical-json-v1", "value": canonical_digest(digest_input)},
    }
    prompts_value = prompts_digest_value(args.prompts.resolve())
    identity_path = write_gate_identity(
        output_root,
        oracle_revision=args.oracle_revision,
        package=package_block,
        prompts_digest={"algorithm": "sha256-tree-v1", "value": prompts_value},
        build_identity=args.build_identity,
        apply_mode=args.apply_mode,
        output_root_relative=str(args.output_root),
    )
    print(json.dumps({
        "prepared": True,
        "output_root": output_root.as_posix(),
        "gate_identity": identity_path.relative_to(output_root).as_posix(),
        "package": package_block,
        "prompts_digest": {"algorithm": "sha256-tree-v1", "value": prompts_value},
        "oracle_revision": args.oracle_revision,
        "build_identity": args.build_identity,
    }, ensure_ascii=False, indent=2))
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    report_path = args.report.resolve()
    payload = validate_certification(
        report_path,
        inventory=args.inventory.resolve() if args.inventory else None,
        package_root=args.package_root.resolve() if args.package_root else None,
        evidence_root=args.evidence_root.resolve() if args.evidence_root else None,
    )
    violations: list[dict[str, str]] = []
    if args.output_root is not None and args.oracle_revision:
        violations = scan_source_blind_violations(args.output_root.resolve(), args.oracle_revision)
        payload["errors"].extend(violations)
        if violations:
            payload["valid"] = False
    ownership = classify(payload)
    accepted = payload["valid"]
    print(json.dumps({
        "accepted": accepted,
        "result": payload,
        "failures": ownership,
        "note": (
            "accepted candidates still await explicit user promotion; "
            "failed ownership must be written back to package, apply-skill or certification-prompt, "
            "followed by clean regeneration."
        ),
    }, ensure_ascii=False, indent=2))
    return 0 if accepted else 1


def cmd_validate_inventory(args: argparse.Namespace) -> int:
    report = validate_inventory(args.document.resolve())
    print(json.dumps(report.to_dict(), ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if not report.errors else 1


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    sub = result.add_subparsers(dest="command", required=True)

    prepare = sub.add_parser("prepare", help="source-blind 干净重生前置：gate identity 与 clean output root")
    prepare.add_argument("--oracle-revision", required=True, help="固定 Visual Oracle git revision")
    prepare.add_argument("--package", type=Path, required=True, help="candidate package 目录")
    prepare.add_argument("--prompts", type=Path, required=True, help="固定 prompts 文件或目录")
    prepare.add_argument("--output-root", type=Path, required=True, help="显式 clean output root")
    prepare.add_argument("--build-identity", required=True, help="fresh build identity；不得复用旧值")
    prepare.add_argument("--apply-mode", choices=("bootstrap", "increment"), default="bootstrap")
    prepare.add_argument("--allow-existing", action="store_true", help="允许已存在但为空的 output root")

    verify = sub.add_parser("verify", help="校验 certification report + inventory 并输出 ownership 分类")
    verify.add_argument("--report", type=Path, required=True)
    verify.add_argument("--inventory", type=Path)
    verify.add_argument("--package-root", type=Path)
    verify.add_argument("--evidence-root", type=Path)
    verify.add_argument("--output-root", type=Path, help="clean build 输出根；提供时执行 source-blind 扫描")
    verify.add_argument("--oracle-revision", help="与 gate identity 比对用的 oracle revision")

    inventory = sub.add_parser("validate-inventory", help="校验 certification inventory")
    inventory.add_argument("document", type=Path)
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.command == "prepare":
        return cmd_prepare(args)
    if args.command == "verify":
        return cmd_verify(args)
    return cmd_validate_inventory(args)


if __name__ == "__main__":
    raise SystemExit(main())
