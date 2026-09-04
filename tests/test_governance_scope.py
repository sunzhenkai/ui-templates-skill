from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_governance_scope as scope


class GovernanceScopeTests(unittest.TestCase):
    def test_domains_do_not_overlap(self) -> None:
        self.assertEqual(scope.check_domains(), [])

    def test_web_v2_matches_baseline_and_is_clean(self) -> None:
        self.assertEqual(scope.guard_web_v2(), [])

    def test_root_fixture_layout_is_complete(self) -> None:
        fixture_root = ROOT / "tests/fixtures"
        for name in ("schema", "validator", "migrator", "feedback-checkpoint", "eval", "bundle", "mirror", "mutations"):
            with self.subTest(name=name):
                self.assertTrue((fixture_root / name).is_dir())

    def test_tests_do_not_import_web_v2(self) -> None:
        needle = "example/workbench-shell/" + "web-v2"
        for path in (ROOT / "tests").glob("test_*.py"):
            self.assertNotIn(needle, path.read_text(encoding="utf-8"))

    def test_ci_and_root_validation_declare_sample_exclusions(self) -> None:
        excluded = "example/workbench-shell/" + "web-v2/**"
        workflow = (ROOT / ".github/workflows/governance.yml").read_text(encoding="utf-8")
        makefile = (ROOT / "Makefile").read_text(encoding="utf-8")
        runner = (ROOT / "scripts/run_governance_validation.py").read_text(encoding="utf-8")
        self.assertIn(excluded, workflow)
        self.assertIn("paths-ignore", workflow)
        self.assertIn("make validate", workflow)
        self.assertNotIn("pnpm", workflow)
        self.assertNotIn("npm", workflow)
        self.assertIn("scripts/run_governance_validation.py", makefile)
        self.assertIn(excluded, runner)
        self.assertIn("content_read", runner)
        self.assertIn("commands_executed", runner)
        self.assertNotIn("example/workbench-shell/" + "web-v2/package.json", runner)

    def test_root_makefile_has_complete_safe_dual_skill_targets(self) -> None:
        text = (ROOT / "Makefile").read_text(encoding="utf-8")
        for target in ("bootstrap:", "validate:", "test:", "eval:", "bundle:", "install:", "mirror-check:", "mirror-write:"):
            self.assertIn(target, text)
        self.assertIn("$${INSTALL_TARGET:?", text)
        self.assertIn("scripts/manage_skill_distribution.py install", text)
        self.assertNotIn("cp -r", text)


if __name__ == "__main__":
    unittest.main()
