from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_validation.validator import validate_paths


class TemplateIndexTests(unittest.TestCase):
    def copied_good(self, temp: str) -> Path:
        dest = Path(temp)
        shutil.copytree(ROOT / "tests/fixtures/validator/good/templates", dest / "templates")
        return dest

    def test_production_index_has_published_status(self) -> None:
        text = (ROOT / "templates/INDEX.md").read_text(encoding="utf-8")
        self.assertIn("| 状态 |", text)
        self.assertIn("| published |", text)
        result = validate_paths([ROOT / "templates"], ROOT, index=ROOT / "templates/INDEX.md")
        self.assertEqual(0, result.to_dict()["exit_code"], result.to_dict()["findings"])

    def test_missing_status_column_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_good(temp)
            (root / "templates/INDEX.md").write_text(
                "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 |\n| --- | --- | --- | --- |\n| good-template | 高对比双主题测试模板 | doc | 2026-09-03 |\n",
                encoding="utf-8",
            )
            result = validate_paths([root / "templates"], ROOT, index=root / "templates/INDEX.md")
            self.assertIn("INDEX_STATUS_MISSING", {item.code for item in result.findings})

    def test_invalid_status_and_orphan_row_fail(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_good(temp)
            (root / "templates/INDEX.md").write_text(
                "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n| --- | --- | --- | --- | --- |\n| good-template | 高对比双主题测试模板 | doc | 2026-09-03 | live |\n| missing-one | 不存在 | doc | 2026-09-03 | published |\n",
                encoding="utf-8",
            )
            result = validate_paths([root / "templates"], ROOT, index=root / "templates/INDEX.md")
            codes = {item.code for item in result.findings}
            self.assertIn("INDEX_STATUS_INVALID", codes)
            self.assertIn("INDEX_ORPHAN_ROW", codes)

    def test_manage_script_list_show_retire_and_delete(self) -> None:
        script = ROOT / "scripts/manage_template_index.py"
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_good(temp)
            index = root / "templates/INDEX.md"
            templates = root / "templates"
            listed = subprocess.run(
                [sys.executable, str(script), "list", "--index", str(index)],
                check=True, capture_output=True, text=True,
            )
            self.assertIn("good-template", listed.stdout)
            self.assertIn("published", listed.stdout)
            shown = subprocess.run(
                [sys.executable, str(script), "show", "good-template", "--index", str(index), "--templates", str(templates)],
                check=True, capture_output=True, text=True,
            )
            self.assertIn("status: published", shown.stdout)
            denied = subprocess.run(
                [sys.executable, str(script), "delete", "good-template", "--index", str(index), "--templates", str(templates)],
                capture_output=True, text=True,
            )
            self.assertNotEqual(0, denied.returncode)
            self.assertIn("DELETE_REQUIRES_RETIRED", denied.stderr)
            subprocess.run(
                [sys.executable, str(script), "retire", "good-template", "--index", str(index), "--reason", "test"],
                check=True, capture_output=True, text=True,
            )
            self.assertIn("retired", index.read_text(encoding="utf-8"))
            subprocess.run(
                [sys.executable, str(script), "delete", "good-template", "--index", str(index), "--templates", str(templates)],
                check=True, capture_output=True, text=True,
            )
            self.assertFalse((templates / "good-template").exists())
            self.assertNotIn("good-template", index.read_text(encoding="utf-8"))

    def test_require_published_and_undeclared_changeset(self) -> None:
        from manage_template_index import check_changeset, require_published

        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_good(temp)
            index = root / "templates/INDEX.md"
            published = require_published(index, "good-template")
            self.assertTrue(published["ok"])
            subprocess.run(
                [sys.executable, str(ROOT / "scripts/manage_template_index.py"), "retire", "good-template", "--index", str(index), "--reason", "test"],
                check=True, capture_output=True, text=True,
            )
            retired = require_published(index, "good-template")
            self.assertFalse(retired["ok"])
            self.assertEqual("INDEX_NOT_PUBLISHED", retired["code"])
            before = root / "before"
            allowed = root / "allowed"
            undeclared = root / "undeclared"
            for directory in (before, allowed, undeclared):
                directory.mkdir()
                (directory / "tokens.yaml").write_text("a: 1\n", encoding="utf-8")
                (directory / "spec.md").write_text("old\n", encoding="utf-8")
            (allowed / "spec.md").write_text("new\n", encoding="utf-8")
            (undeclared / "spec.md").write_text("new\n", encoding="utf-8")
            (undeclared / "tokens.yaml").write_text("a: 2\n", encoding="utf-8")
            self.assertTrue(check_changeset(before, allowed, ["spec.md"])["ok"])
            blocked = check_changeset(before, undeclared, ["spec.md"])
            self.assertFalse(blocked["ok"])
            self.assertEqual(["tokens.yaml"], blocked["undeclared"])

    def test_seed_skips_existing_and_does_not_rescue_retired(self) -> None:
        from manage_template_index import ensure_published, seed_from_catalog

        catalog = ROOT / "skills/ui-template-author/catalog"
        with tempfile.TemporaryDirectory() as temp:
            empty = Path(temp) / "empty"
            empty_index = empty / "INDEX.md"
            first = ensure_published(empty_index, empty, "workbench-shell", catalog)
            self.assertTrue(first["ok"], first)
            self.assertTrue((empty / "workbench-shell/spec.md").is_file())
            (empty / "workbench-shell/spec.md").write_text("owned\n", encoding="utf-8")
            skipped = seed_from_catalog(catalog, empty_index, empty, ["workbench-shell"])
            self.assertEqual("owned\n", (empty / "workbench-shell/spec.md").read_text(encoding="utf-8"))
            self.assertEqual(["workbench-shell"], [item["name"] for item in skipped["skipped"]])
            retired_root = Path(temp) / "retired"
            retired_index = retired_root / "INDEX.md"
            retired_index.parent.mkdir(parents=True)
            retired_index.write_text(
                empty_index.read_text(encoding="utf-8").replace("published", "retired"),
                encoding="utf-8",
            )
            shutil.copytree(empty / "workbench-shell", retired_root / "workbench-shell")
            blocked = ensure_published(retired_index, retired_root, "workbench-shell", catalog)
            self.assertFalse(blocked["ok"])
            self.assertEqual("INDEX_NOT_PUBLISHED", blocked["code"])
            missing = ensure_published(empty_index, empty, "no-such-template", catalog)
            self.assertFalse(missing["ok"])
            self.assertEqual("TEMPLATE_NOT_IN_CATALOG", missing["code"])


if __name__ == "__main__":
    unittest.main()
