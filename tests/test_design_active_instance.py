from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/design-system"
DESIGN = ROOT / "skills/ui-template-design/runtime"


class DesignActiveInstanceTests(unittest.TestCase):
    def adopt(self, root: Path) -> Path:
        target = root / "design"
        process = subprocess.run(
            [
                sys.executable, str(DESIGN / "adopt_package.py"),
                "--package", str(FIXTURES / "packages/page-system-fixture"),
                "--design-root", str(target),
                "--output-root", "app",
                "--language", "typescript",
                "--ui-framework", "react",
                "--styling", "tailwind",
                "--component-system", "shadcn",
            ],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, process.returncode, process.stdout + process.stderr)
        return target

    def test_adopted_package_is_valid_active_instance(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            target = self.adopt(Path(temporary))
            process = subprocess.run(
                [sys.executable, str(DESIGN / "check_active_instance.py"), "validate", str(target), "--kind", "active", "--json"],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            report = json.loads(process.stdout)
            self.assertEqual(0, process.returncode, report)
            self.assertTrue(report["valid"], report)
            self.assertIn("binding", report["digests"])

    def test_legacy_migration_with_unresolved_cannot_freeze(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            target = self.adopt(Path(temporary))
            process = subprocess.run(
                [
                    sys.executable, str(DESIGN / "migrate_legacy_freeze.py"),
                    "--freeze", str(FIXTURES / "legacy/design-freeze-v1.yaml"),
                    "--target-kind", "active-instance", "--target-root", str(target),
                    "--receipt-out", str(target / "migration.yaml"),
                    "--unresolved", "projection mapping missing",
                ],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertNotEqual(0, process.returncode)
            self.assertIn("status=failed", process.stdout)

    def test_design_skill_declares_active_instance_gates(self) -> None:
        skill = (ROOT / "skills/ui-template-design/SKILL.md").read_text(encoding="utf-8")
        reference = (ROOT / "skills/ui-template-design/references/active-instance.md").read_text(encoding="utf-8")
        for required in ("design-system/v1", "binding.yaml", "Token Projection", "source origin", "check_active_instance.py"):
            self.assertIn(required, skill)
        for required in ("template-package", "legacy-freeze-migration", "binding_digest", "published"):
            self.assertIn(required, reference)


if __name__ == "__main__":
    unittest.main()
