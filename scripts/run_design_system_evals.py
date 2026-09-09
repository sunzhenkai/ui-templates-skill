#!/usr/bin/env python3
"""Deterministic offline evals for the design-system/v1 governance contract."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/design-system"
VALIDATOR = ROOT / "scripts/validate_design_system.py"
INDEX_TOOL = ROOT / "scripts/manage_template_index.py"
sys.path.insert(0, str(ROOT / "scripts"))


def run_validator(target: Path, kind: str, *, migration: Path | None = None, vendor: Path | None = None) -> tuple[int, dict]:
    command = [sys.executable, str(VALIDATOR), "validate", str(target), "--kind", kind]
    if migration:
        command += ["--migration", str(migration)]
    if vendor:
        command += ["--vendor", str(vendor)]
    process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    try:
        payload = json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"validator returned invalid JSON: {exc}\n{process.stderr}") from exc
    if not isinstance(payload, dict) or "valid" not in payload:
        raise RuntimeError("validator returned an invalid report")
    return process.returncode, payload


def result(case_id: str, expected_valid: bool, report: dict, required_codes: list[str]) -> dict:
    codes = []
    for item in report.get("results", [report]):
        codes.extend(error["code"] for error in item.get("errors", []))
    passed = report.get("valid") is expected_valid and all(code in codes for code in required_codes)
    return {
        "id": case_id,
        "passed": passed,
        "expected_valid": expected_valid,
        "actual_valid": report.get("valid"),
        "codes": sorted(set(codes)),
    }



def certification_cases(root_tmp: Path) -> list[dict[str, object]]:
    """Fidelity certification report stability and fail-closed behavior."""
    fixtures = FIXTURES / "certification"
    installed_validator = ROOT / "skills/ui-template-apply/runtime/shared_validate_design_system.py"
    cases: list[dict[str, object]] = []

    def run_cert(validator: Path, report: Path, package: Path | None) -> dict:
        command = [
            sys.executable, str(validator), "validate-certification", str(report),
            "--inventory", str(fixtures / "inventory.yaml"),
        ]
        if package is not None:
            command += ["--package-root", str(package)]
        process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
        return json.loads(process.stdout)

    valid_report = fixtures / "valid/report.yaml"
    candidate = fixtures / "candidate-package"
    expected = run_cert(VALIDATOR, valid_report, candidate)
    cases.append(result("certification-valid-report-accepted", True, expected, []))

    # Schema stability: the installed shared validator must reach the same verdict.
    installed = run_cert(installed_validator, valid_report, candidate)
    same = installed.get("valid") == expected.get("valid") and [
        error["code"] for error in installed.get("errors", [])
    ] == [error["code"] for error in expected.get("errors", [])]
    cases.append({
        "id": "certification-installed-validator-parity",
        "passed": bool(same),
        "repo_valid": expected.get("valid"),
        "installed_valid": installed.get("valid"),
    })

    invalid_expectations = (
        ("missing-record", ["CERT_RECORD_MISSING"]),
        ("stale-build", ["CERT_BUILD_STALE"]),
        ("screenshot-only", ["CERT_ASSERTION_NOT_MEASURABLE"]),
        ("failed-assertion", ["CERT_VERDICT_CONTRADICTED"]),
    )
    for name, codes in invalid_expectations:
        report = run_cert(VALIDATOR, fixtures / "invalid" / name / "report.yaml", candidate)
        cases.append(result(f"certification-{name}-rejected", False, report, codes))

    report = run_cert(
        VALIDATOR,
        fixtures / "invalid/over-fragmented/report.yaml",
        fixtures / "invalid/over-fragmented/candidate-package",
    )
    cases.append(result("certification-over-fragmented-rejected", False, report, ["CERT_OVER_FRAGMENTED"]))
    return cases


def closure_cases(root_tmp: Path) -> list[dict[str, object]]:
    """Derived Component Family closure behavior across fixtures."""
    fixtures = FIXTURES / "closure"
    cases: list[dict[str, object]] = []

    def run(target: Path, *, require: bool = False) -> dict:
        command = [sys.executable, str(VALIDATOR), "validate", str(target), "--kind", "package"]
        if require:
            command.append("--require-component-family")
        process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
        return json.loads(process.stdout)

    valid = fixtures / "valid-page-system"
    report = run(valid)
    cases.append(result("closure-valid-page-system", True, report, []))
    report = run(valid, require=True)
    cases.append(result("closure-valid-page-system-with-evidence", True, report, []))

    report = run(fixtures / "dangling-pattern")
    cases.append(result("closure-dangling-pattern-rejected", False, report, ["REFERENCE_DANGLING"]))
    report = run(fixtures / "missing-evidence", require=True)
    cases.append(result("closure-missing-evidence-rejected", False, report, ["FAMILY_EVIDENCE_MISSING"]))
    report = run(fixtures / "capability-mismatch")
    cases.append(result("closure-capability-mismatch-rejected", False, report, ["CAPABILITY_LAYER_FORBIDDEN"]))

    # Structured output reports family members, dangling targets and unresolved evidence.
    production = json.loads(
        subprocess.run(
            [sys.executable, str(VALIDATOR), "validate", "templates/workbench-shell", "--kind", "package"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        ).stdout
    )
    family = production.get("component_family", {})
    structured_ok = (
        production.get("valid") is True
        and len(family.get("families", [])) >= 1
        and "dangling" in family
        and "unresolved_evidence" in family
    )
    cases.append({"id": "closure-structured-output-present", "passed": bool(structured_ok)})
    return cases


def authoring_cases(root_tmp: Path) -> list[dict[str, object]]:
    cases: list[dict[str, object]] = []
    target = root_tmp / "author-candidate"
    shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
    shutil.copy2(FIXTURES / "active/increment/binding.yaml", target / "binding.yaml")
    _, report = run_validator(target, "package")
    cases.append(result("author-package-candidate-only", False, report, ["BINDING_FORBIDDEN"]))

    from manage_template_index import check_changeset, require_published
    before = root_tmp / "changeset/before"
    after = root_tmp / "changeset/after"
    shutil.copytree(FIXTURES / "packages/ui-kit-fixture", before)
    shutil.copytree(FIXTURES / "packages/ui-kit-fixture", after)
    token_path = after / "core/tokens.yaml"
    token_path.write_text(token_path.read_text(encoding="utf-8").replace("#2563eb", "#000000"), encoding="utf-8")
    changeset = check_changeset(before, after, ["core/tokens.yaml"])
    cases.append({"id": "author-declared-changeset-only", "passed": bool(changeset.get("ok") and changeset.get("changed") == ["core/tokens.yaml"]), "changed": changeset.get("changed"), "undeclared": changeset.get("undeclared")})
    (after / "core/new-pattern.yaml").write_text("schema: design-system-patterns/v1\nitems: []\n", encoding="utf-8")
    leaked = check_changeset(before, after, ["core/tokens.yaml"])
    cases.append({"id": "author-undeclared-change-rejected", "passed": not leaked.get("ok") and leaked.get("undeclared") == ["core/new-pattern.yaml"], "undeclared": leaked.get("undeclared")})

    index = root_tmp / "retired-INDEX.md"
    index.write_text("# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n| --- | --- | --- | --- | --- |\n| ui-kit-fixture | fixture | doc | 2026-09-08 | retired |\n", encoding="utf-8")
    retired = require_published(index, "ui-kit-fixture")
    cases.append({"id": "author-retired-package-rejected", "passed": not retired.get("ok") and retired.get("code") == "INDEX_NOT_PUBLISHED", "result": retired})

    feedback = FIXTURES / "feedback/package.yaml"
    evidence_root = FIXTURES / "feedback"
    command = [sys.executable, str(VALIDATOR), "validate-feedback", str(feedback), "--evidence-root", str(evidence_root)]
    process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    payload = json.loads(process.stdout)
    cases.append({"id": "author-package-feedback-identity-and-targets", "passed": process.returncode == 0 and payload.get("valid") is True, "errors": payload.get("errors", [])})
    text = (ROOT / "skills/ui-template-author/references/feedback-lifecycle.md").read_text(encoding="utf-8")
    cases.append({"id": "author-feedback-fingerprint-dedup-contract", "passed": "active fingerprint" in text and "合并去重" in text})
    return cases

def evaluate(root_tmp: Path) -> dict[str, object]:
    cases: list[dict[str, object]] = authoring_cases(root_tmp)
    cases.extend(certification_cases(root_tmp))
    cases.extend(closure_cases(root_tmp))

    positive_fixtures = (
        ("tokens-only-valid", FIXTURES / "packages/tokens-only-fixture", "package"),
        ("ui-kit-valid", FIXTURES / "packages/ui-kit-fixture", "package"),
        ("page-system-valid", FIXTURES / "packages/page-system-fixture", "package"),
        ("active-increment-valid", FIXTURES / "active/increment", "active"),
    )
    for case_id, target, kind in positive_fixtures:
        _, report = run_validator(target, kind)
        cases.append(result(case_id, True, report, []))

    # Unknown schema is rejected even if other content remains intact.
    target = root_tmp / "unknown-schema"
    shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
    manifest_path = target / "design-system.yaml"
    manifest_path.write_text(manifest_path.read_text(encoding="utf-8").replace("design-system/v1", "design-system/v2"), encoding="utf-8")
    _, report = run_validator(target, "package")
    cases.append(result("unknown-schema-rejected", False, report, ["SCHEMA_UNSUPPORTED"]))

    # A frozen token mutation must produce a digest mismatch.
    target = root_tmp / "digest-mismatch"
    shutil.copytree(FIXTURES / "packages/page-system-fixture", target)
    token_path = target / "core/tokens.yaml"
    token_path.write_text(token_path.read_text(encoding="utf-8").replace("#2563eb", "#000000"), encoding="utf-8")
    _, report = run_validator(target, "package")
    cases.append(result("frozen-digest-mismatch-rejected", False, report, ["DIGEST_MISMATCH"]))

    # A reference to an unknown stable ID is rejected.
    target = root_tmp / "dangling-reference"
    shutil.copytree(FIXTURES / "packages/ui-kit-fixture", target)
    primitive_path = target / "core/primitives.yaml"
    primitive_path.write_text(primitive_path.read_text(encoding="utf-8").replace("rule/NN-001", "rule/NN-999"), encoding="utf-8")
    _, report = run_validator(target, "package")
    cases.append(result("dangling-reference-rejected", False, report, ["REFERENCE_DANGLING"]))

    # Capability-required layers are not optional.
    target = root_tmp / "capability-missing"
    shutil.copytree(FIXTURES / "packages/ui-kit-fixture", target)
    shutil.rmtree(target / "core", ignore_errors=False)
    (target / "core").mkdir()
    for name in ("tokens.yaml", "rules.yaml", "evidence.yaml"):
        shutil.copy2(FIXTURES / "packages/tokens-only-fixture/core" / name, target / "core" / name)
    _, report = run_validator(target, "package")
    cases.append(result("capability-missing-layer-rejected", False, report, ["CAPABILITY_LAYER_MISSING", "LAYER_MISSING"]))

    # Packages cannot bind themselves to a project.
    target = root_tmp / "package-binding"
    shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
    shutil.copy2(FIXTURES / "active/increment/binding.yaml", target / "binding.yaml")
    _, report = run_validator(target, "package")
    cases.append(result("package-binding-rejected", False, report, ["BINDING_FORBIDDEN"]))

    # Migration failure is a governance failure.
    _, report = run_validator(
        FIXTURES / "packages/tokens-only-fixture",
        "package",
        migration=FIXTURES / "migration/unresolved.yaml",
    )
    cases.append(result("migration-unresolved-rejected", False, report, ["MIGRATION_UNRESOLVED"]))

    # Vendor contents are pinned by raw SHA-256.
    vendor_root = root_tmp / "vendor"
    shutil.copytree(FIXTURES / "vendor", vendor_root)
    license_path = vendor_root / "shadcn/LICENSE"
    license_path.write_text(license_path.read_text(encoding="utf-8") + "\n", encoding="utf-8")
    _, report = run_validator(
        FIXTURES / "packages/tokens-only-fixture",
        "package",
        vendor=vendor_root / "vendor.yaml",
    )
    cases.append(result("vendor-digest-mismatch-rejected", False, report, ["DIGEST_MISMATCH"]))

    return {
        "schema_version": 1,
        "runner": "design-system-contract-eval-v1",
        "valid": all(item["passed"] for item in cases),
        "cases": cases,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args(argv)
    with tempfile.TemporaryDirectory(prefix="design-system-eval-") as temporary:
        report = evaluate(Path(temporary))
    text = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
