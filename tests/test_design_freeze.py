from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "skills/ui-template-design/runtime"))

import check_design_freeze as freeze  # noqa: E402
import scan_design_constraints as scan  # noqa: E402
import yaml  # noqa: E402


class DesignFreezeTests(unittest.TestCase):
    def test_gate_requires_patterns_and_forbids_index_without_template(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            design_root = project / ".ui-template-design"
            design_root.mkdir()
            (project / "AGENTS.design.md").write_text("# rules\n", encoding="utf-8")
            document = {
                "schema": "design-freeze/v1",
                "status": "frozen",
                "digest": freeze.digest_of({"kit": True}),
                "mode": "greenfield",
                "template": None,
                "kit": {"primitives": True, "patterns": False, "gallery": False},
                "golden_page": None,
                "output_root": "web",
                "touched_paths": ["web/design-system/tokens.css"],
                "rules_files": ["AGENTS.design.md"],
                "updated_at": "2026-09-07T00:00:00Z",
            }
            (design_root / "freeze.yaml").write_text(yaml.safe_dump(document), encoding="utf-8")
            primitive = freeze.gate(project, design_root)
            self.assertFalse(primitive["ok"])
            self.assertTrue(any(item["code"] == "PRIMITIVES_ONLY_NOT_COMPLETE" for item in primitive["findings"]))
            document["kit"] = {"primitives": True, "patterns": True, "gallery": True}
            document["touched_paths"] = ["templates/INDEX.md"]
            (design_root / "freeze.yaml").write_text(yaml.safe_dump(document), encoding="utf-8")
            indexed = freeze.gate(project, design_root)
            self.assertFalse(indexed["ok"])
            self.assertTrue(any(item["code"] == "INDEX_FORBIDDEN_WITHOUT_TEMPLATE" for item in indexed["findings"]))
            self.assertTrue(freeze.validate_document("freeze", {**document, "output_root": "../secret"}))

    def test_classify_task_class(self) -> None:
        self.assertEqual(
            {"ok": True, "task_class": "bootstrap", "code": "EMPTY_OUTPUT"},
            freeze.classify_task_class(output_root_empty=True, freeze_status=None),
        )
        self.assertEqual(
            {"ok": True, "task_class": "refactor", "code": "EXISTING_OUTPUT"},
            freeze.classify_task_class(output_root_empty=False, freeze_status=None),
        )
        self.assertEqual(
            {"ok": True, "task_class": "iterate", "code": "FROZEN"},
            freeze.classify_task_class(output_root_empty=False, freeze_status="frozen"),
        )
        self.assertEqual(
            {"ok": False, "task_class": None, "code": "DIGEST_MISMATCH"},
            freeze.classify_task_class(
                output_root_empty=False, freeze_status="frozen", freeze_digest_mismatch=True,
            ),
        )
        self.assertEqual(
            {"ok": False, "task_class": None, "code": "SCOPE_UNRESOLVED"},
            freeze.classify_task_class(output_root_empty=False, freeze_status=None, scope_unresolved=True),
        )
        self.assertEqual(
            {"ok": True, "task_class": "refactor", "code": "USER_REBUILD"},
            freeze.classify_task_class(
                output_root_empty=False, freeze_status="frozen", freeze_digest_mismatch=True, user_rebuild=True,
            ),
        )

    def test_scan_rejects_raw_palette(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "Page.tsx").write_text('export function Page() { return <p className="text-gray-500">x</p>; }\n', encoding="utf-8")
            result = scan.scan(root)
            self.assertFalse(result["ok"])
            self.assertTrue(any(item["code"] == "RAW_PALETTE" for item in result["findings"]))


if __name__ == "__main__":
    unittest.main()
