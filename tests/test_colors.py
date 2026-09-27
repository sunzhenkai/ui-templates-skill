from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_validation.colors import composite, contrast_ratio, parse_color


class ColorTests(unittest.TestCase):
    def test_hex_vectors(self) -> None:
        red = parse_color("#ff0000")
        self.assertAlmostEqual(red.r, 1.0, places=7)
        self.assertAlmostEqual(red.g, 0.0, places=7)
        self.assertAlmostEqual(parse_color("#00000080").a, 128 / 255, places=7)
        self.assertAlmostEqual(contrast_ratio(parse_color("#000000"), parse_color("#ffffff")), 21.0, places=7)

    def test_oklch_vectors_and_tolerance(self) -> None:
        white = parse_color("oklch(1 0 0)")
        black = parse_color("oklch(0 0 0 / 50%)")
        red = parse_color("oklch(0.627955 0.257683 29.2339)")
        self.assertAlmostEqual(white.r, 1.0, places=6)
        self.assertAlmostEqual(black.a, 0.5, places=7)
        self.assertAlmostEqual(red.r, 1.0, delta=0.0002)
        self.assertAlmostEqual(red.g, 0.0, delta=0.0002)
        self.assertAlmostEqual(red.b, 0.0, delta=0.0002)

    def test_alpha_composition_uses_background(self) -> None:
        result = composite(parse_color("#00000080"), parse_color("#ffffff"))
        self.assertTrue(result.opaque())
        self.assertAlmostEqual(result.r, 127 / 255, delta=0.01)

    def test_invalid_syntax_fails(self) -> None:
        for value in ("transparent", "#fff", "oklch(2 0 0)", "oklch(0.5 -1 20)", "rgb(0 0 0)"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_color(value)


if __name__ == "__main__":
    unittest.main()
