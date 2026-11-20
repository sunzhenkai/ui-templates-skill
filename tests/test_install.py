import json
import shutil
import tempfile
import unittest
from pathlib import Path

from _util import APPLY, run

INSTALL = APPLY / "scripts/install_registry.py"


class Install(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def install(self, *extra):
        return run(INSTALL, "--project", self.tmp, *extra)

    def test_fresh_install_writes_lock_and_files(self):
        result = self.install("--package", "workbench-shell")
        self.assertEqual(result.returncode, 0, result.stderr)
        lock = json.loads((self.tmp / "ui-template.lock.json").read_text())
        self.assertEqual(lock["package"], "workbench-shell")
        summary = (self.tmp / ".ui-template.md").read_text()
        self.assertIn("- 风格包：`workbench-shell`", summary)
        self.assertIn(f"- 版本：`{lock['version']}`", summary)
        self.assertIn("- `blocks/data-table`", summary)
        self.assertIn("`ui-decisions.yaml`", summary)
        self.assertIn("`ui-template.lock.json`", summary)
        for target in ("src/components/blocks/data-table.tsx", "src/lib/vocab.ts", "src/styles/theme.css", "src/components/ui/button.tsx", "eslint/ui-template.mjs"):
            self.assertIn(target, lock["files"])
            self.assertTrue((self.tmp / target).is_file(), target)
        self.assertIn("@tanstack/react-table@^8", result.stdout)
        self.assertEqual(run(APPLY / "scripts/validate_package.py", "project", self.tmp).returncode, 0)

    def test_subset_pulls_dependencies(self):
        self.install("--package", "workbench-shell", "--items", "blocks/data-table")
        self.assertTrue((self.tmp / "src/components/blocks/row-link.tsx").is_file())
        self.assertTrue((self.tmp / "src/components/ui/table.tsx").is_file())
        self.assertFalse((self.tmp / "src/components/blocks/log-view.tsx").exists())

    def test_adding_items_keeps_earlier_items_tracked(self):
        self.install("--package", "workbench-shell", "--items", "blocks/data-table")
        self.assertNotIn("- `blocks/theme-menu`", (self.tmp / ".ui-template.md").read_text())
        self.install("--items", "blocks/theme-menu")
        items = json.loads((self.tmp / "ui-template.lock.json").read_text())["items"]
        self.assertIn("blocks/data-table", items)
        self.assertIn("blocks/theme-menu", items)
        summary = (self.tmp / ".ui-template.md").read_text()
        self.assertIn("- `blocks/data-table`", summary)
        self.assertIn("- `blocks/theme-menu`", summary)

    def test_dry_run_does_not_write_project_state(self):
        result = self.install("--package", "workbench-shell", "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.tmp / "ui-template.lock.json").exists())
        self.assertFalse((self.tmp / ".ui-template.md").exists())

    def test_status_and_upgrade_preserve_local_edits(self):
        self.install("--package", "workbench-shell")
        edited = self.tmp / "src/lib/vocab.ts"
        edited.write_text(edited.read_text() + "\n// project statuses\n")
        status = self.install("--status")
        self.assertIn("local     src/lib/vocab.ts", status.stdout)
        self.assertEqual(status.returncode, 0)
        # a file edited locally whose upstream also moved on (lock hash ≠ both) is a conflict
        lock_path = self.tmp / "ui-template.lock.json"
        lock = json.loads(lock_path.read_text())
        lock["files"]["src/components/blocks/format.tsx"] = "0" * 64
        lock_path.write_text(json.dumps(lock))
        fmt = self.tmp / "src/components/blocks/format.tsx"
        fmt.write_text(fmt.read_text() + "\n// local tweak\n")
        status = self.install("--status")
        self.assertIn("conflict  src/components/blocks/format.tsx", status.stdout)
        self.assertEqual(status.returncode, 1)
        upgrade = self.install("--upgrade")
        self.assertEqual(upgrade.returncode, 1)
        self.assertIn("CONFLICT    src/components/blocks/format.tsx", upgrade.stdout)
        self.assertIn("// local tweak", fmt.read_text())
        self.assertIn("// project statuses", edited.read_text())
        # after a hand merge, --resolve rebases the file on the current upstream: it becomes a plain local edit
        resolve = self.install("--resolve", "src/components/blocks/format.tsx")
        self.assertEqual(resolve.returncode, 0, resolve.stderr)
        status = self.install("--status")
        self.assertIn("local     src/components/blocks/format.tsx", status.stdout)
        self.assertEqual(status.returncode, 0)
        self.assertNotEqual(self.install("--resolve", "src/not-installed.ts").returncode, 0)

    def test_existing_unmanaged_file_is_conflict(self):
        target = self.tmp / "src/components/ui/button.tsx"
        target.parent.mkdir(parents=True)
        target.write_text("export const Button = null\n")
        result = self.install("--package", "workbench-shell")
        self.assertEqual(result.returncode, 1)
        self.assertIn("CONFLICT    src/components/ui/button.tsx", result.stdout)
        self.assertEqual(target.read_text(), "export const Button = null\n")

    def test_project_decisions_are_checked(self):
        self.install("--package", "workbench-shell")
        (self.tmp / "ui-decisions.yaml").write_text(
            "decisions: {collection.paging: load_more}\n"
            "pages: {/a: collection, /b: dashboard}\n"
            "feedback:\n  - {said: rows too tall, layer: block, change: row height 36}\n  - {said: x, layer: css}\n")
        result = run(APPLY / "scripts/validate_package.py", "project", self.tmp)
        self.assertEqual(result.returncode, 1)
        self.assertIn("J07", result.stdout + result.stderr)
        self.assertIn("feedback[1]", result.stdout + result.stderr)
        self.assertNotIn("feedback[0]", result.stdout + result.stderr)

    def test_unknown_package(self):
        self.assertNotEqual(self.install("--package", "nope").returncode, 0)

    def test_init_copies_starter_and_keeps_existing_files(self):
        (self.tmp / "package.json").write_text('{"name": "mine"}\n')
        result = self.install("--package", "quiet-inset", "--init")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("kept        package.json", result.stdout)
        self.assertEqual((self.tmp / "package.json").read_text(), '{"name": "mine"}\n')
        for path in ("index.html", "vite.config.ts", "src/main.tsx", "src/index.css", ".storybook/preview.tsx",
                     "tests/ui-kit/fidelity.spec.ts", "src/components/page-templates/settings-page.tsx"):
            self.assertTrue((self.tmp / path).is_file(), path)
        self.assertIn("@fontsource-variable/inter", (self.tmp / "src/styles/fonts.css").read_text())
        self.assertIn("@fontsource-variable/inter@^5", result.stdout)
        lock = json.loads((self.tmp / "ui-template.lock.json").read_text())
        self.assertIn(":root --primary", lock["theme_base"])
        self.assertNotIn("src/main.tsx", lock["files"])  # starter files belong to the project

    def test_theme_upgrade_is_three_way(self):
        self.install("--package", "quiet-inset")
        theme = self.tmp / "src/styles/theme.css"
        package = theme.read_text()
        lock_path = self.tmp / "ui-template.lock.json"
        lock = json.loads(lock_path.read_text())
        # pretend the installed package had another muted-foreground, which the project never touched
        old_muted = "oklch(0.3 0 0)"
        new_muted = lock["theme_base"][":root --muted-foreground"]
        css = package.replace(f"--muted-foreground: {new_muted};", f"--muted-foreground: {old_muted};", 1)
        lock["theme_base"][":root --muted-foreground"] = old_muted
        lock["files"]["src/styles/theme.css"] = "0" * 64
        # the project customized primary (allowed) and border (not allowed)
        css = css.replace(f"--primary: {lock['theme_base'][':root --primary']};", "--primary: oklch(0.5 0.11 175);", 1)
        css = css.replace(f"--border: {lock['theme_base'][':root --border']};", "--border: oklch(0.877 0 0);", 1)
        theme.write_text(css)
        lock_path.write_text(json.dumps(lock))
        self.assertIn("merge     src/styles/theme.css", self.install("--status").stdout)
        upgrade = self.install("--upgrade")
        self.assertEqual(upgrade.returncode, 0, upgrade.stdout)
        self.assertIn("DROPPED     src/styles/theme.css :root --border", upgrade.stdout)
        merged = theme.read_text()
        self.assertIn("--primary: oklch(0.5 0.11 175);", merged)
        self.assertIn(f"--muted-foreground: {new_muted};", merged)
        self.assertNotIn("oklch(0.877 0 0)", merged)

    def test_theme_outside_whitelist_is_reported(self):
        self.install("--package", "quiet-inset")
        validate = lambda: run(APPLY / "scripts/validate_package.py", "project", self.tmp)
        theme = self.tmp / "src/styles/theme.css"
        base = json.loads((self.tmp / "ui-template.lock.json").read_text())["theme_base"]
        theme.write_text(theme.read_text().replace(f"--primary: {base[':root --primary']};", "--primary: oklch(0.5 0.11 175);", 1))
        self.assertNotIn("J12", validate().stdout)
        theme.write_text(theme.read_text().replace(f"--border: {base[':root --border']};", "--border: oklch(0.877 0 0);", 1))
        result = validate()
        self.assertIn("J12 src/styles/theme.css :root --border", result.stdout)
        self.assertEqual(result.returncode, 1)
        (self.tmp / "ui-decisions.yaml").write_text("theme_deviations:\n  - --border\n")
        self.assertNotIn("J12", validate().stdout)


if __name__ == "__main__":
    unittest.main()
