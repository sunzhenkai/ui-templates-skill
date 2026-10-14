import tempfile
import unittest
from pathlib import Path

from _util import APPLY, DESIGN, ROOT, load, run

vp = load(APPLY / "scripts/validate_package.py")


class PackageValidation(unittest.TestCase):
    def test_shipped_packages_pass(self):
        for meta in (ROOT / "templates").glob("*/meta.yaml"):
            result = run(APPLY / "scripts/validate_package.py", "package", meta.parent)
            self.assertEqual(result.returncode, 0, result.stdout)

    def test_patterns_pass(self):
        result = run(APPLY / "scripts/validate_package.py", "patterns", APPLY / "patterns")
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_package_defaults_are_declared_decisions(self):
        known = vp.pattern_decisions(APPLY / "patterns")
        import yaml
        for meta in (ROOT / "templates").glob("*/meta.yaml"):
            for key in (yaml.safe_load(meta.read_text(encoding="utf-8"))["defaults"] or {}):
                self.assertIn(key, known)

    def _theme(self, mutate) -> list[str]:
        css = (ROOT / "templates/workbench-shell/theme.css").read_text(encoding="utf-8")
        report = vp.Report()
        vp.check_theme(mutate(css), report, "t")
        return report.errors

    def test_missing_dark_variable_is_reported(self):
        errors = self._theme(lambda css: css.replace("  --info: oklch(0.65 0.18 250);\n", ""))
        self.assertTrue(any(e.startswith("T02") and "--info" in e for e in errors), errors)

    def test_low_contrast_is_reported(self):
        errors = self._theme(lambda css: css.replace("--muted-foreground: oklch(0.505", "--muted-foreground: oklch(0.8", 1))
        self.assertTrue(any(e.startswith("C01") and "muted-foreground" in e for e in errors), errors)

    def test_text_on_own_tint_is_reported(self):
        # 0.577 passes against plain background (C01) but fails as text on its own 10% tint (destructive button).
        errors = self._theme(lambda css: css.replace("--destructive: oklch(0.52 0.21 27.3)", "--destructive: oklch(0.577 0.245 27.3)", 1))
        self.assertFalse(any(e.startswith("C01") and "destructive" in e for e in errors), errors)
        self.assertTrue(any(e.startswith("C02") and "destructive on destructive" in e for e in errors), errors)

    def test_non_oklch_is_reported(self):
        errors = self._theme(lambda css: css.replace("--brand: oklch(0.55 0.16 255);", "--brand: #2563eb;", 1))
        self.assertTrue(any(e.startswith("T04") for e in errors), errors)

    def test_contrast_math(self):
        white, black = vp.parse_color("oklch(1 0 0)"), vp.parse_color("oklch(0 0 0)")
        self.assertAlmostEqual(vp.contrast(white, black), 21.0, delta=0.1)

    def test_pattern_rules(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "thing.md"
            decisions = "\n".join(f"  - key: thing.d{i}\n    options: [a, b]\n    default: a" for i in range(7))
            bad.write_text(f"---\nname: thing\nwhen: x\nblocks: [blocks/nope]\ndecisions:\n{decisions}\nself_review: []\n---\n# x\n", encoding="utf-8")
            result = run(APPLY / "scripts/validate_package.py", "patterns", tmp)
            self.assertIn("N04", result.stdout)
            self.assertIn("N09", result.stdout)

    def test_derived_packages_pass_across_hues(self):
        with tempfile.TemporaryDirectory() as tmp:
            for i, (hue, chroma, nh, primary) in enumerate([(255, 0.16, 286, "neutral"), (150, 0.14, 90, "accent"), (25, 0.2, 30, "accent"), (85, 0.17, 60, "accent"), (300, 0.1, 250, "neutral")]):
                name = f"p{i}"
                run(DESIGN / "scripts/derive_theme.py", "--name", name, "--out", tmp, "--accent-hue", str(hue), "--accent-chroma", str(chroma), "--neutral-hue", str(nh), "--primary", primary)
                result = run(APPLY / "scripts/validate_package.py", "package", Path(tmp) / name)
                self.assertEqual(result.returncode, 0, f"{hue}: {result.stdout}")

    def test_accent_hex(self):
        with tempfile.TemporaryDirectory() as tmp:
            run(DESIGN / "scripts/derive_theme.py", "--name", "hx", "--out", tmp, "--accent-hex", "#e11d48")
            self.assertIn("17.", (Path(tmp) / "hx/theme.css").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
