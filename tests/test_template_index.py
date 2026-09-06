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

    def test_resolve_reads_catalog_without_creating_project_library(self) -> None:
        from manage_template_index import resolve_published, seed_from_catalog

        catalog = ROOT / "skills/ui-template-author/catalog"
        script = ROOT / "scripts/manage_template_index.py"
        with tempfile.TemporaryDirectory() as temp:
            empty = Path(temp) / "empty"
            empty.mkdir()
            empty_index = empty / "INDEX.md"
            resolved = resolve_published(empty_index, empty, "workbench-shell", catalog)
            self.assertTrue(resolved["ok"], resolved)
            self.assertEqual("catalog", resolved["origin"])
            self.assertEqual("catalog/workbench-shell", resolved["path"])
            self.assertFalse(empty_index.exists())
            self.assertFalse((empty / "workbench-shell").exists())
            cli = subprocess.run(
                [sys.executable, str(script), "require-published", "workbench-shell", "--json",
                 "--catalog", str(catalog), "--index", str(empty_index), "--templates", str(empty)],
                capture_output=True, text=True,
            )
            self.assertEqual(0, cli.returncode, cli.stderr + cli.stdout)
            payload = __import__("json").loads(cli.stdout)
            self.assertTrue(payload["ok"])
            self.assertEqual("catalog", payload["origin"])
            self.assertFalse((empty / "workbench-shell").exists())
            project = Path(temp) / "project"
            project_index = project / "INDEX.md"
            seeded = seed_from_catalog(catalog, project_index, project, ["workbench-shell"])
            self.assertIn("workbench-shell", seeded["seeded"])
            only_named = seed_from_catalog(catalog, Path(temp) / "other" / "INDEX.md", Path(temp) / "other", ["workbench-shell"])
            self.assertEqual(["workbench-shell"], only_named["seeded"])
            self.assertFalse((Path(temp) / "other" / "INDEX.md").read_text(encoding="utf-8").count("|") < 2)
            project_hit = resolve_published(project_index, project, "workbench-shell", catalog)
            self.assertEqual("project", project_hit["origin"])
            retired_root = Path(temp) / "retired"
            retired_index = retired_root / "INDEX.md"
            retired_index.parent.mkdir(parents=True)
            retired_index.write_text(project_index.read_text(encoding="utf-8").replace("published", "retired"), encoding="utf-8")
            shutil.copytree(project / "workbench-shell", retired_root / "workbench-shell")
            blocked = resolve_published(retired_index, retired_root, "workbench-shell", catalog)
            self.assertFalse(blocked["ok"])
            self.assertEqual("INDEX_NOT_PUBLISHED", blocked["code"])
            self.assertEqual("project", blocked["origin"])

    def test_apply_close_only_reports_closed_session_and_never_deletes(self) -> None:
        from manage_template_index import session_closed

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / ".ui-template-apply"
            feedback = root / "feedback"
            feedback.mkdir(parents=True)
            (root / "checkpoint.yaml").write_text(
                "phases:\n- id: 9\n  status: complete\n",
                encoding="utf-8",
            )
            feedback.joinpath("proposed.yaml").write_text("status: proposed\n", encoding="utf-8")
            open = session_closed(root)
            self.assertFalse(open["ok"])
            self.assertFalse(open["may_delete_apply_root"])
            feedback.joinpath("proposed.yaml").unlink()
            closed = session_closed(root)
            self.assertTrue(closed["ok"])
            self.assertTrue(closed["may_delete_apply_root"])
            self.assertFalse(closed["may_delete_templates"])
            self.assertTrue(root.is_dir())

    def test_authoring_write_verbs_adopt_catalog_only_once_and_do_not_overwrite(self) -> None:
        from manage_template_index import seed_from_catalog

        catalog = ROOT / "skills/ui-template-author/catalog"
        script = ROOT / "scripts/manage_template_index.py"
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            project.mkdir()
            index = project / "INDEX.md"
            retired = subprocess.run(
                [sys.executable, str(script), "retire", "workbench-shell", "--reason", "test",
                 "--catalog", str(catalog), "--index", str(index), "--templates", str(project)],
                capture_output=True, text=True,
            )
            self.assertEqual(0, retired.returncode, retired.stderr + retired.stdout)
            self.assertIn("retired", index.read_text(encoding="utf-8"))
            self.assertTrue((project / "workbench-shell/spec.md").is_file())

            orphan = Path(temp) / "orphan"
            orphan.mkdir()
            (orphan / "workbench-shell").mkdir()
            (orphan / "workbench-shell/spec.md").write_text("user-owned\n", encoding="utf-8")
            blocked = subprocess.run(
                [sys.executable, str(script), "retire", "workbench-shell", "--reason", "test",
                 "--catalog", str(catalog), "--index", str(orphan / "INDEX.md"), "--templates", str(orphan)],
                capture_output=True, text=True,
            )
            self.assertEqual(1, blocked.returncode)
            self.assertIn("INDEX_MISSING", blocked.stderr)
            self.assertEqual("user-owned\n", (orphan / "workbench-shell/spec.md").read_text(encoding="utf-8"))

            deleted_root = Path(temp) / "deleted"
            deleted_root.mkdir()
            deleted = seed_from_catalog(
                catalog, deleted_root / "INDEX.md", deleted_root, ["workbench-shell"]
            )
            self.assertIn("workbench-shell", deleted["seeded"])
            remove = subprocess.run(
                [sys.executable, str(script), "delete", "workbench-shell",
                 "--catalog", str(catalog), "--index", str(deleted_root / "INDEX.md"), "--templates", str(deleted_root)],
                capture_output=True, text=True,
            )
            self.assertEqual(1, remove.returncode)
            self.assertIn("DELETE_REQUIRES_RETIRED", remove.stderr)
            self.assertTrue((deleted_root / "workbench-shell/spec.md").is_file())

            catalog_only_delete = Path(temp) / "catalog-only-delete"
            catalog_only_delete.mkdir()
            removed = subprocess.run(
                [sys.executable, str(script), "delete", "workbench-shell",
                 "--catalog", str(catalog), "--index", str(catalog_only_delete / "INDEX.md"), "--templates", str(catalog_only_delete)],
                capture_output=True, text=True,
            )
            self.assertEqual(0, removed.returncode, removed.stderr + removed.stdout)
            self.assertFalse((catalog_only_delete / "workbench-shell").exists())
            self.assertNotIn("workbench-shell", (catalog_only_delete / "INDEX.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
