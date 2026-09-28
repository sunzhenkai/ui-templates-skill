"""Runtime schema copies must stay byte-identical to the canonical schemas."""
from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

import sys

sys.path.insert(0, str(ROOT / "scripts"))

from sync_design_system_validator import FIDELITY_SKILLS, SKILLS, check, sync


class RuntimeSchemaSyncTest(unittest.TestCase):
    def test_runtime_schema_copies_match_canonical(self) -> None:
        drifted = check(ROOT)
        self.assertEqual([], [str(path.relative_to(ROOT)) for path in drifted])

    def test_sync_writes_fidelity_copies_for_author_and_apply_only(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "scripts").mkdir()
            (root / "schemas/design-system/v1").mkdir(parents=True)
            (root / "schemas/template/fidelity/v1").mkdir(parents=True)
            (root / "skills").mkdir()
            for skill in SKILLS:
                (root / "skills" / skill / "runtime").mkdir(parents=True)
            (root / "scripts/validate_design_system.py").write_text("# canonical\n", encoding="utf-8")
            (root / "scripts/design_system_validator_discovery.py").write_text("# helper\n", encoding="utf-8")
            (root / "schemas/design-system/v1/a.schema.json").write_text("{}", encoding="utf-8")
            (root / "schemas/template/fidelity/v1/fidelity.schema.json").write_text("{}", encoding="utf-8")
            sync(root)
            for skill in SKILLS:
                self.assertTrue((root / "skills" / skill / "runtime/schemas/design-system/v1/a.schema.json").is_file())
            for skill in FIDELITY_SKILLS:
                self.assertTrue(
                    (root / "skills" / skill / "runtime/schemas/template/fidelity/v1/fidelity.schema.json").is_file()
                )
            self.assertFalse(
                (root / "skills/ui-template-design/runtime/schemas/template/fidelity/v1/fidelity.schema.json").exists()
            )
            self.assertEqual([], check(root))
            # A drifted copy is detected and repaired by sync.
            target = root / "skills/ui-template-apply/runtime/schemas/template/fidelity/v1/fidelity.schema.json"
            target.write_text('{"stale": true}\n', encoding="utf-8")
            self.assertEqual([target], check(root))
            sync(root)
            self.assertEqual([], check(root))


if __name__ == "__main__":
    unittest.main()
