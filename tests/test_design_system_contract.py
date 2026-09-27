from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts/validate_design_system.py"
EVAL = ROOT / "scripts/run_design_system_evals.py"
FIXTURES = ROOT / "tests/fixtures/design-system"
SCHEMAS = ROOT / "schemas/design-system/v1"


class DesignSystemContractTests(unittest.TestCase):
    def run_validator(self, target: Path, kind: str, *extra: str) -> tuple[int, dict]:
        process = subprocess.run(
            [sys.executable, str(VALIDATOR), "validate", str(target), "--kind", kind, *extra],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertTrue(process.stdout, process.stderr)
        return process.returncode, json.loads(process.stdout)

    def test_schema_family_is_parseable(self) -> None:
        documents = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(SCHEMAS.glob("*.json"))]
        self.assertEqual(17, len(documents))
        self.assertTrue(all(item["$id"].startswith("https://ui-templates-skill.local/schemas/design-system/v1/") for item in documents))

    def test_capability_fixtures_are_valid(self) -> None:
        for name, kind in (
            ("tokens-only-fixture", "tokens-only"),
            ("ui-kit-fixture", "ui-kit"),
            ("page-system-fixture", "page-system"),
        ):
            code, report = self.run_validator(FIXTURES / "packages" / name, "package")
            self.assertEqual(0, code, report)
            self.assertTrue(report["valid"], report)
            self.assertIn("contract", report["digests"])

    def test_active_instance_and_receipts_are_valid(self) -> None:
        code, report = self.run_validator(
            FIXTURES / "active/increment",
            "active",
            "--migration", str(FIXTURES / "migration/receipt.yaml"),
            "--vendor", str(FIXTURES / "vendor/vendor.yaml"),
        )
        self.assertEqual(0, code, report)
        self.assertTrue(report["valid"], report)
        results = {item["kind"]: item for item in report["results"]}
        self.assertIn("binding", results["active"]["digests"])
        self.assertTrue(all(item["valid"] for item in report["results"]))

    def test_negative_contract_conditions_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            target = root / "package"
            shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
            (target / "binding.yaml").write_text("schema: design-system-binding/v1\n", encoding="utf-8")
            code, report = self.run_validator(target, "package")
            codes = {item["code"] for item in report["errors"]}
            self.assertNotEqual(0, code)
            self.assertIn("BINDING_FORBIDDEN", codes)

            target = root / "active"
            shutil.copytree(FIXTURES / "packages/page-system-fixture", target)
            code, report = self.run_validator(target, "active")
            codes = {item["code"] for item in report["errors"]}
            self.assertNotEqual(0, code)
            self.assertIn("BINDING_MISSING", codes)

    def test_declared_primitive_variants_require_complete_contracts(self) -> None:
        import sys
        sys.path.insert(0, str(ROOT / "scripts"))
        from validate_design_system import Report, validate_primitive_contracts

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            layers = {"tokens": root / "tokens.yaml", "primitives": root / "primitives.yaml", "rules": root / "rules.yaml"}
            (root / "tokens.yaml").write_text(
                "schema: design-system-tokens/v1\ntokens:\n  radius:\n    lg:\n      value: 10\n      unit: px\n      origin: source\n  size:\n    md:\n      value: 32\n      unit: px\n      origin: source\n",
                encoding="utf-8",
            )
            (root / "rules.yaml").write_text(
                "schema: design-system-rules/v1\nitems:\n- id: rule/QUALITY-104\n  statement: focus ring\n  severity: must\n  status: active\n",
                encoding="utf-8",
            )
            base = {
                "schema": "design-system-primitives/v1",
                "items": [{
                    "id": "primitive/button", "name": "Button", "states": ["focus-visible"],
                    "variants": ["default", "outline"],
                    "variant_contracts": {
                        "default": {
                            "presentation": "filled", "radius": "token/radius.lg",
                            "control_height": "token/size.md", "focus_ref": "rule/QUALITY-104",
                        },
                    },
                }],
            }
            primitives = root / "primitives.yaml"
            primitives.write_text(yaml.safe_dump(base, sort_keys=False), encoding="utf-8")
            report = Report("package", root)
            validate_primitive_contracts(layers, {"tokens": yaml.safe_load(layers["tokens"].read_text()), "primitives": base, "rules": yaml.safe_load(layers["rules"].read_text())}, report)
            codes = {item["code"] for item in report.errors}
            self.assertIn("PRIMITIVE_CONTRACT_INVALID", codes)
            self.assertTrue(any("declared variant has no style contract" in item["message"] for item in report.errors))

            base["items"][0]["variant_contracts"]["outline"] = {
                "presentation": "outline", "radius": "token/radius.lg",
                "control_height": "token/size.md", "focus_ref": "rule/QUALITY-104",
            }
            primitives.write_text(yaml.safe_dump(base, sort_keys=False), encoding="utf-8")
            complete = Report("package", root)
            validate_primitive_contracts(layers, {"tokens": yaml.safe_load(layers["tokens"].read_text()), "primitives": base, "rules": yaml.safe_load(layers["rules"].read_text())}, complete)
            self.assertEqual([], complete.errors, complete.errors)

    def test_visual_role_closure_is_an_explicit_high_fidelity_gate(self) -> None:
        code, report = self.run_validator(
            FIXTURES / "packages/page-system-fixture",
            "package",
            "--require-visual-role-closure",
        )
        codes = {item["code"] for item in report["errors"]}
        self.assertNotEqual(0, code)
        self.assertIn("VISUAL_ROLE_MISSING", codes)

    def test_provenance_coverage_confidence_cross_checks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            target = root / "revision"
            shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
            evidence = target / "core/evidence.yaml"
            evidence.write_text(
                evidence.read_text(encoding="utf-8").replace("fixture-v1", "fixture-v2", 1),
                encoding="utf-8",
            )
            code, report = self.run_validator(target, "package")
            codes = {item["code"] for item in report["errors"]}
            self.assertNotEqual(0, code)
            self.assertIn("EVIDENCE_REVISION_UNDECLARED", codes)

            target = root / "coverage"
            shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
            meta_path = target / "meta.yaml"
            meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
            meta["coverage"]["components"] = {"declared": ["alpha"], "observed": [], "defaulted": [], "unsupported": []}
            meta_path.write_text(yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
            code, report = self.run_validator(target, "package")
            codes = {item["code"] for item in report["errors"]}
            self.assertNotEqual(0, code)
            self.assertIn("COVERAGE_PARTITION_INVALID", codes)

            target = root / "confidence"
            shutil.copytree(FIXTURES / "packages/tokens-only-fixture", target)
            meta_path = target / "meta.yaml"
            meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
            meta["confidence"] = {"overall": "high", "layout": "medium"}
            meta_path.write_text(yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
            code, report = self.run_validator(target, "package")
            codes = {item["code"] for item in report["errors"]}
            self.assertNotEqual(0, code)
            self.assertIn("CONFIDENCE_INCONSISTENT", codes)

    def test_deterministic_evals_cover_required_failures(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "eval.json"
            process = subprocess.run(
                [sys.executable, str(EVAL), "--json-out", str(output)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(0, process.returncode, process.stdout + process.stderr)
            report = json.loads(output.read_text(encoding="utf-8"))
            self.assertTrue(report["valid"])
            ids = {item["id"] for item in report["cases"]}
            self.assertLessEqual(
                {
                    "tokens-only-valid",
                    "ui-kit-valid",
                    "page-system-valid",
                    "active-increment-valid",
                    "unknown-schema-rejected",
                    "frozen-digest-mismatch-rejected",
                    "dangling-reference-rejected",
                    "capability-missing-layer-rejected",
                    "migration-unresolved-rejected",
                    "vendor-digest-mismatch-rejected",
                },
                ids,
            )
            self.assertTrue(all(item["passed"] for item in report["cases"]))

    def test_canonical_digest_is_reproducible(self) -> None:
        manifest = FIXTURES / "packages/page-system-fixture/design-system.yaml"
        first = subprocess.run([sys.executable, str(VALIDATOR), "compute-digest", str(manifest)], cwd=ROOT, text=True, capture_output=True, check=True)
        second = subprocess.run([sys.executable, str(VALIDATOR), "compute-digest", str(manifest)], cwd=ROOT, text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(first.stdout), json.loads(second.stdout))
        self.assertIn("sha256-canonical-json-v1", first.stdout)


if __name__ == "__main__":
    unittest.main()
