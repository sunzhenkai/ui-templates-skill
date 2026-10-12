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

    def test_scan_flags_raw_size_and_typography(self) -> None:
        cases = {
            "Btn.tsx": ('export const B = () => <button className="h-[37px] px-2">x</button>;\n', "RAW_SIZE"),
            "Min.tsx": ('export const B = () => <div className="min-h-[52px]">x</div>;\n', "RAW_SIZE"),
            "Txt.tsx": ('export const T = () => <p className="text-[13px] leading-[18px]">x</p>;\n', "RAW_TYPOGRAPHY"),
            "Inline.tsx": ('export const T = () => <p style={{ fontSize: 13 }}>x</p>;\n', "RAW_TYPOGRAPHY_OR_SIZE"),
            "card.css": (".card { font-size: 13px; }\n", "RAW_TYPOGRAPHY"),
            "font.css": (".card { font-family: Arial, sans-serif; }\n", "RAW_TYPOGRAPHY"),
            "row.css": (".row { height: 40px; }\n", "RAW_SIZE"),
        }
        for name, (body, code) in cases.items():
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / name).write_text(body, encoding="utf-8")
                result = scan.scan(root)
                self.assertIn(code, {item["code"] for item in result["findings"]}, result)

    def test_scan_allows_token_based_size_and_typography(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "Ok.tsx").write_text('export const B = () => <button className="h-control-md text-body">x</button>;\n', encoding="utf-8")
            (root / "base.css").write_text("body { font-family: var(--font-sans); font-size: var(--text-body); }\n", encoding="utf-8")
            (root / "theme.css").write_text(":root { --font-sans: Inter, sans-serif; } body { font-family: Inter, sans-serif; }\n", encoding="utf-8")
            result = scan.scan(root)
            self.assertTrue(result["ok"], result)


if __name__ == "__main__":
    unittest.main()
