from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

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
        self.assertEqual(15, len(documents))
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
