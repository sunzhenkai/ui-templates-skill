import tempfile
import unittest
from pathlib import Path

from _util import APPLY, AUTHOR, load, run

et = load(AUTHOR / "scripts/extract_theme.py")


class Extract(unittest.TestCase):
    def test_color_formats(self):
        self.assertEqual(et.to_oklch("#ffffff"), "oklch(1.000 0.0000 0.0)")
        self.assertTrue(et.to_oklch("0 0% 100%").startswith("oklch(1.000"))
        self.assertTrue(et.to_oklch("hsl(240 10% 3.9%)").startswith("oklch(0.14"))
        self.assertTrue(et.to_oklch("rgb(0 0 0 / 50%)").endswith("/ 50%)"))
        self.assertIsNone(et.to_oklch("color-mix(in oklab, red, blue)"))

    def test_shadcn_v3_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            css = Path(tmp) / "globals.css"
            css.write_text(":root{--background:0 0% 100%;--foreground:240 10% 3.9%;--primary:240 5.9% 10%;--primary-foreground:0 0% 98%;--danger:#b91c1c;--radius:0.75rem}\n"
                           ".dark{--background:240 10% 3.9%;--foreground:0 0% 98%}\n", encoding="utf-8")
            result = run(AUTHOR / "scripts/extract_theme.py", "--css", css, "--name", "x", "--out", tmp, "--license", "MIT")
            self.assertEqual(result.returncode, 0, result.stderr)
            report = (Path(tmp) / "x/EXTRACTION.txt").read_text(encoding="utf-8")
            self.assertIn("--danger → destructive", report)
            self.assertIn("--radius: 0.75rem", (Path(tmp) / "x/theme.css").read_text(encoding="utf-8"))
            self.assertEqual(run(APPLY / "scripts/validate_package.py", "package", Path(tmp) / "x").returncode, 0)

    def test_map_override(self):
        with tempfile.TemporaryDirectory() as tmp:
            css = Path(tmp) / "t.css"
            css.write_text(":root{--blue-9:#2563eb}\n", encoding="utf-8")
            run(AUTHOR / "scripts/extract_theme.py", "--css", css, "--name", "m", "--out", tmp, "--map", "blue-9=brand")
            self.assertIn("--blue-9 → brand", (Path(tmp) / "m/EXTRACTION.txt").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
