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
VALID = ROOT / "tests/fixtures/design-system/placement/valid-page-system"


class DesignSystemPlacementTests(unittest.TestCase):
    def validate(self, root: Path) -> tuple[int, dict]:
        process = subprocess.run(
            [sys.executable, str(ROOT / "scripts/validate_design_system.py"), "validate", str(root), "--kind", "package", "--json"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        return process.returncode, json.loads(process.stdout)

    def test_valid_topology_passes(self) -> None:
        code, payload = self.validate(VALID)
        self.assertEqual(0, code, payload)
        self.assertEqual(1, payload["placement"]["scenes"])
        self.assertEqual([], payload["errors"])

    def assert_invalid(self, mutation) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "package"
            shutil.copytree(VALID, root)
            path = root / "core/layout.yaml"
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            mutation(data["items"][0]["placement"])
            path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")
            code, payload = self.validate(root)
            self.assertNotEqual(0, code)
            self.assertIn("PLACEMENT_CLOSURE_INVALID", {finding["code"] for finding in payload["errors"]})

    def test_relation_endpoint_mutation_fails(self) -> None:
        self.assert_invalid(lambda scene: scene["relations"][0].__setitem__("to", "region.missing"))

    def test_unauthorized_pattern_fails(self) -> None:
        self.assert_invalid(lambda scene: scene.__setitem__("pattern_refs", ["pattern/list-page", "pattern/other"]))

    def test_dangling_evidence_fails(self) -> None:
        self.assert_invalid(lambda scene: scene["evidence_refs"].append("evidence-missing"))

    def test_scroll_owner_mutation_fails(self) -> None:
        self.assert_invalid(lambda scene: scene["scroll_domains"][0].__setitem__("owner", "region.missing"))


if __name__ == "__main__":
    unittest.main()
