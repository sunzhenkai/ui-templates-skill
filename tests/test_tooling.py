import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from _util import APPLY, ROOT, run

FIX = ROOT / "tests/fixtures"


def chromium_available() -> bool:
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            p.chromium.launch().close()
        return True
    except Exception:
        return False


@unittest.skipUnless(chromium_available(), "playwright chromium not installed")
class CheckRendered(unittest.TestCase):
    def check(self, name: str) -> tuple[int, set[str]]:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "r.json"
            result = run(APPLY / "scripts/check_rendered.py", (FIX / name).as_uri(), "--widths", "800", "--themes", "light", "--json", out, "--wait", "load")
            codes = {code for view in json.loads(out.read_text()) for code, _ in view["findings"]}
            return result.returncode, codes

    def check_out(self, name: str) -> tuple[int, str]:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "r.json"
            result = run(APPLY / "scripts/check_rendered.py", (FIX / name).as_uri(), "--widths", "800", "--themes", "light", "--json", out, "--wait", "load")
            return result.returncode, json.dumps(json.loads(out.read_text()), ensure_ascii=False)

    def test_bad_page(self):
        code, codes = self.check("rendered-bad.html")
        self.assertEqual(code, 1)
        self.assertTrue({"R01", "R02", "R04", "R05", "R06", "R07"} <= codes, codes)

    def test_geometry_invariants(self):
        code, codes = self.check("rendered-geometry-bad.html")
        self.assertEqual(code, 1)
        self.assertTrue({"R12", "R13", "R14"} <= codes, codes)

    def test_behavior_invariants(self):
        _, codes = self.check("rendered-behavior-bad.html")
        self.assertTrue({"R15", "R16"} <= codes, codes)

    def test_collection_invariants(self):
        code, out = self.check_out("rendered-collection-bad.html")
        self.assertEqual(code, 1)
        for needle in ["not sticky", "region top", "not opaque", "no load-more", "loaded 2 / total 8814"]:
            self.assertIn(needle, out)

    def test_unbounded_rows(self):
        _, codes = self.check("rendered-rows-bad.html")
        self.assertIn("R19", codes)

    def test_reports_more(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location("cr", APPLY / "scripts/check_rendered.py")
        cr = importlib.util.module_from_spec(spec); spec.loader.exec_module(cr)
        class R:
            def __init__(self, url, body): self.url, self.body, self.headers = url, body, {"content-type": "application/json"}
            def json(self): return self.body
        self.assertEqual(cr.reports_more(R("/m?limit=50", {"items": [1] * 50, "nextCursor": "c"})), [50])
        self.assertEqual(cr.reports_more(R("/t?limit=100", {"tasks": [1] * 100})), [100])
        self.assertEqual(cr.reports_more(R("/t?limit=100", {"tasks": [1] * 7})), [])
        self.assertEqual(cr.reports_more(R("/a", {"apps": [1, 2]})), [])

    def test_prose_tables_are_content(self):
        _, codes = self.check("rendered-prose.html")
        self.assertFalse({"R09", "R11"} & codes, codes)

    def test_good_page(self):
        code, codes = self.check("rendered-good.html")
        self.assertEqual((code, codes), (0, set()))


ESLINT_DIR = os.environ.get("UI_TEMPLATE_ESLINT_DIR")  # a node project with eslint + typescript-eslint installed


@unittest.skipUnless(ESLINT_DIR and shutil.which("node"), "set UI_TEMPLATE_ESLINT_DIR to run lint rule tests")
class LintRules(unittest.TestCase):
    def test_rules_fire_and_respect_scope(self):
        src = r'''
import { toast } from "sonner"
export function A() {
  const confirm = (s: string) => s.length > 0
  const open = confirm("x"); const cn = (...a: unknown[]) => String(a)
  confirm("fine")
  window.confirm("bad")
  return <div className="text-red-500 text-[13px] h-screen" style={{ color: "#fff" }}>
    <a href="/jobs">x</a><table /> {new Date().toLocaleString()}
    <span className={cn("mx-auto", open && "rounded-md p-4")} />
  </div>
}'''
        with tempfile.TemporaryDirectory(dir=ESLINT_DIR) as tmp:
            Path(tmp, "a.tsx").write_text(src)
            Path(tmp, "eslint.config.mjs").write_text(
                f'import tseslint from "typescript-eslint"\nimport ui from "{(APPLY / "library/lint/ui-template.mjs").as_posix()}"\n'
                'export default [{ files: ["**/*.tsx"], languageOptions: { parser: tseslint.parser }, plugins: { "ui-template": ui }, rules: ui.configs.recommended.rules }]\n')
            result = subprocess.run(["npx", "eslint", "-f", "json", "a.tsx"], cwd=tmp, capture_output=True, text=True)
            rules = [m["ruleId"] for m in json.loads(result.stdout)[0]["messages"]]
        expected = {"no-palette-colors", "no-raw-colors", "no-arbitrary-size", "no-window-dialogs", "no-adhoc-format",
                    "no-raw-internal-links", "no-direct-toast", "no-raw-table", "no-viewport-heights", "no-layout-classes"}
        self.assertEqual({r.split("/")[1] for r in rules}, expected)
        self.assertEqual(rules.count("ui-template/no-window-dialogs"), 1)
        self.assertEqual(rules.count("ui-template/no-layout-classes"), 1)  # one class string; mx-auto allowed


class VisualReview(unittest.TestCase):
    def test_archetype_mapping(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location("rv", APPLY / "scripts/review_visual.py")
        rv = importlib.util.module_from_spec(spec); spec.loader.exec_module(rv)
        pages = {"/jobs": "collection", "/jobs/:id": "detail", "/chat/:id": "conversation", "/settings/*": "settings"}
        self.assertEqual(rv.archetype_for("/jobs/42", pages), "detail")
        self.assertEqual(rv.archetype_for("/chat/x", pages), "list-detail")
        self.assertEqual(rv.archetype_for("/settings/keys", pages), "settings")
        self.assertIsNone(rv.archetype_for("/nope", pages))
        ordered = {"/jobs/:id": "detail", "/jobs/new": "form", "/empty": "empty"}  # param route declared first
        self.assertEqual(rv.archetype_for("/jobs/new", ordered), "form")
        self.assertEqual(rv.archetype_for("/empty", ordered), "empty")

    def test_references_shipped(self):
        names = {p.name for p in (APPLY / "catalog/workbench-shell/reference").glob("*.png")}
        for kind in ["collection", "detail", "form", "settings", "list-detail", "empty"]:
            for view in ["1280-light", "1280-dark", "768-light", "1280-light-end"]:
                self.assertIn(f"{kind}-{view}.png", names)
        for page in ["collection", "detail", "form", "settings", "list-detail", "empty"]:
            self.assertTrue((APPLY / f"reference/src/pages/{page}.tsx").is_file(), page)

    def test_open_findings_block_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            run(APPLY / "scripts/install_registry.py", "--project", tmp, "--package", "workbench-shell")
            Path(tmp, "ui-decisions.yaml").write_text("package: workbench-shell\npages:\n  /jobs: collection\n")
            Path(tmp, "ui-review.md").write_text("# UI review\n\n## /jobs\n- [ ] seams: gap\nstatus: pending\n")
            result = run(APPLY / "scripts/validate_package.py", "project", tmp)
            self.assertIn("J11", result.stdout + result.stderr)
            Path(tmp, "ui-review.md").write_text("# UI review\n\n## /jobs\n- [x] seams: gap → fixed\nstatus: reviewed\n")
            result = run(APPLY / "scripts/validate_package.py", "project", tmp)
            self.assertNotIn("J11", result.stdout + result.stderr)
            self.assertNotIn("J10", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
