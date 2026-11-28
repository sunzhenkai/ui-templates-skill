import json
import shutil
import tempfile
import unittest
from pathlib import Path

from _util import APPLY, AUTHOR, ROOT, load, run

cp = load(APPLY / "scripts/compose_package.py")
vp = load(APPLY / "scripts/validate_package.py")


class Extensions(unittest.TestCase):
    def _copy_pkg(self, name: str, tmp: Path) -> Path:
        dst = tmp / name
        shutil.copytree(ROOT / "templates" / name, dst)
        return dst

    def test_compose_theme_merges_tokens_unsets_and_keeps_unique_blocks(self):
        base = (
            ":root {\n"
            "  --primary: oklch(0.56 0.16 275);\n"
            "  --sidebar-row-height: 28px;\n"
            "  --command-item-height: 46px;\n"
            "}\n"
            ".dark {\n"
            "  --primary: oklch(0.55 0.15 277);\n"
            "}\n"
        )
        ext = (
            "@theme inline {\n"
            "  --color-menu-active: var(--menu-active);\n"
            "}\n"
            ":root {\n"
            "  --sidebar-row-height: 30px;\n"
            "  --menu-active: color-mix(in oklch, var(--primary) 10%, var(--card));\n"
            "  /* @unset --command-item-height */\n"
            "}\n"
            ".dark {\n"
            "  --menu-active: color-mix(in oklch, var(--primary) 22%, transparent);\n"
            "}\n"
            '[data-surface="frame"] {\n'
            "  box-shadow: none;\n"
            "}\n"
        )
        composed, traces = cp.compose_theme(base, [("01-test", ext)])
        blocks = [sel for sel, *_ in cp.parse_top_blocks(composed)]
        self.assertEqual(blocks.count(":root"), 1)
        self.assertEqual(blocks.count(".dark"), 1)
        self.assertEqual(blocks.count("@theme inline"), 1)
        self.assertIn("--sidebar-row-height: 30px;", composed)
        self.assertNotIn("--command-item-height", composed)
        self.assertIn('--color-menu-active: var(--menu-active);', composed)
        self.assertIn('[data-surface="frame"]', composed)
        actions = {(t["token"], t["action"]) for t in traces}
        self.assertIn(("--sidebar-row-height", "override"), actions)
        self.assertIn(("--command-item-height", "unset"), actions)
        self.assertIn(("--menu-active", "add"), actions)

    def test_extract_theme_protects_and_updates_base_only(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            pkg = self._copy_pkg("quiet-inset", tmp)
            ext_before = (pkg / "extensions/01-workbench-polish.css").read_text(encoding="utf-8")
            changelog_before = (pkg / "CHANGELOG.md").read_text(encoding="utf-8")
            src_css = tmp / "upstream.css"
            src_css.write_text(
                ":root{--background:#fafafa;--foreground:#111111;--primary:#4f46e5;--primary-foreground:#ffffff;}\n"
                ".dark{--background:#18181b;--foreground:#f4f4f5;}\n",
                encoding="utf-8",
            )
            blocked = run(AUTHOR / "scripts/extract_theme.py", "--css", src_css, "--name", "quiet-inset", "--out", tmp, "--license", "MIT")
            self.assertEqual(blocked.returncode, 2)
            self.assertIn("extensions/", blocked.stderr)

            updated = run(
                AUTHOR / "scripts/extract_theme.py",
                "--css", src_css,
                "--name", "quiet-inset",
                "--out", tmp,
                "--source-ref", "updated-upstream",
                "--license", "MIT",
                "--update-base",
            )
            self.assertEqual(updated.returncode, 0, updated.stderr)
            self.assertEqual((pkg / "extensions/01-workbench-polish.css").read_text(encoding="utf-8"), ext_before)
            self.assertEqual((pkg / "CHANGELOG.md").read_text(encoding="utf-8"), changelog_before)
            meta_text = (pkg / "meta.yaml").read_text(encoding="utf-8")
            self.assertIn("01-workbench-polish", meta_text)
            self.assertIn("updated-upstream", meta_text)
            self.assertIn("shell.sidebar: inset", meta_text)

    def test_extension_validation_errors(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            pkg = self._copy_pkg("quiet-inset", tmp)
            # P16: orphan file in extensions/
            (pkg / "extensions/orphan.css").write_text(":root { --x: 1; }\n", encoding="utf-8")
            res_orphan = run(APPLY / "scripts/validate_package.py", "package", pkg)
            self.assertEqual(res_orphan.returncode, 1)
            self.assertIn("P16", res_orphan.stdout)
            (pkg / "extensions/orphan.css").unlink()

            # P15: missing declared extension
            meta = pkg / "meta.yaml"
            orig_meta = meta.read_text(encoding="utf-8")
            meta.write_text(orig_meta.replace("  - 01-workbench-polish\n", "  - 01-workbench-polish\n  - missing-ext\n", 1), encoding="utf-8")
            res_missing = run(APPLY / "scripts/validate_package.py", "package", pkg)
            self.assertEqual(res_missing.returncode, 1)
            self.assertIn("P15", res_missing.stdout)

            # P17: duplicate extension id
            meta.write_text(orig_meta.replace("  - 01-workbench-polish\n", "  - 01-workbench-polish\n  - 01-workbench-polish\n", 1), encoding="utf-8")
            res_dup = run(APPLY / "scripts/validate_package.py", "package", pkg)
            self.assertEqual(res_dup.returncode, 1)
            self.assertIn("P17", res_dup.stdout)

            # C01: contrast regression introduced by extension
            meta.write_text(orig_meta, encoding="utf-8")
            ext_css = pkg / "extensions/01-workbench-polish.css"
            ext_css.write_text(":root {\n  --muted-foreground: oklch(0.95 0 0);\n}\n", encoding="utf-8")
            res_contrast = run(APPLY / "scripts/validate_package.py", "package", pkg)
            self.assertEqual(res_contrast.returncode, 1)
            self.assertIn("C01", res_contrast.stdout)

    def test_quiet_inset_composed_package_and_upgrade_roundtrip(self):
        res_inspect = run(ROOT / "scripts/sync_catalog.py", "--inspect", "quiet-inset")
        self.assertEqual(res_inspect.returncode, 0, res_inspect.stderr)
        self.assertIn("01-workbench-polish", res_inspect.stdout)
        self.assertIn("--sidebar-row-height", res_inspect.stdout)
        self.assertIn("--command-item-height", res_inspect.stdout)

        with tempfile.TemporaryDirectory() as tmpdir:
            project = Path(tmpdir)
            res_install = run(APPLY / "scripts/install_registry.py", "--project", project, "--package", "quiet-inset")
            self.assertEqual(res_install.returncode, 0, res_install.stderr)
            theme_file = project / "src/styles/theme.css"
            theme_text = theme_file.read_text(encoding="utf-8")
            self.assertIn("--sidebar-row-height: 30px;", theme_text)
            self.assertIn("--menu-active:", theme_text)
            self.assertNotIn("--command-item-height", theme_text)

            # Project customizes whitelisted --primary, then runs --upgrade + validate project
            theme_file.write_text(theme_text.replace("--primary: oklch(0.563 0.159 275.2);", "--primary: oklch(0.52 0.12 284);", 1), encoding="utf-8")
            res_upgrade = run(APPLY / "scripts/install_registry.py", "--project", project, "--upgrade")
            self.assertEqual(res_upgrade.returncode, 0, res_upgrade.stderr)
            self.assertIn("--primary: oklch(0.52 0.12 284);", theme_file.read_text(encoding="utf-8"))
            res_validate = run(APPLY / "scripts/validate_package.py", "project", project)
            self.assertEqual(res_validate.returncode, 0, res_validate.stdout)


if __name__ == "__main__":
    unittest.main()
