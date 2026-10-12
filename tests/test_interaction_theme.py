from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_design_system as v  # noqa: E402
from template_authoring.chrome import mandatory_fact_gaps, parse_comma_set, INTERACTION_VOCABULARY  # noqa: E402


def codes(documents):
    report = v.Report("package", Path("."))
    v.validate_theme_coverage(documents, report)
    v.validate_interaction_primitives(documents, report)
    v.validate_color_pairs(documents, report)
    return [e["code"] for e in report.errors]


def tokens(**themes):
    doc = {"tokens": {"color": {"fg": {"value": "#000000", "origin": "source"}, "bg": {"value": "#ffffff", "origin": "source"}}},
           "color_pairs": [{"foreground": "token/color.fg", "background": "token/color.bg", "min_ratio": 4.5}]}
    if themes:
        doc["themes"] = {"default": "light", "variants": themes}
    return {"tokens": doc}


DARK = {"overrides": {"color.fg": {"value": "#ffffff", "origin": "source"}, "color.bg": {"value": "#000000", "origin": "source"}}}


class ThemeCoverageTests(unittest.TestCase):
    def test_single_theme_untouched(self):
        self.assertEqual(codes(tokens()), [])

    def test_incomplete_variant(self):
        self.assertIn("THEME_COVERAGE_INCOMPLETE", codes(tokens(dark={"overrides": {"color.fg": {"value": "#fff", "origin": "source"}}})))

    def test_shared_counts_as_decided(self):
        docs = tokens(dark={"overrides": {"color.fg": {"value": "#ffffff", "origin": "source"}}, "shared": ["color.bg"]})
        self.assertNotIn("THEME_COVERAGE_INCOMPLETE", codes(docs))

    def test_variant_needs_own_pairs(self):
        self.assertIn("THEME_PAIRS_MISSING", codes(tokens(dark=DARK)))

    def test_pairs_resolve_through_theme(self):
        docs = tokens(dark=DARK)
        docs["tokens"]["color_pairs"].append({"foreground": "token/color.fg", "background": "token/color.bg", "min_ratio": 4.5, "theme": "dark"})
        self.assertEqual(codes(docs), [])
        docs["tokens"]["themes"]["variants"]["dark"]["overrides"]["color.bg"]["value"] = "#eeeeee"
        self.assertIn("COLOR_CONTRAST_TOO_LOW", codes(docs))

    def test_unknown_theme_and_dangling(self):
        docs = tokens(dark={"overrides": {**DARK["overrides"], "color.nope": {"value": "#000", "origin": "source"}}})
        docs["tokens"]["color_pairs"].append({"foreground": "token/color.fg", "background": "token/color.bg", "min_ratio": 4.5, "theme": "sepia"})
        found = codes(docs)
        self.assertIn("THEME_OVERRIDE_DANGLING", found)
        self.assertIn("THEME_UNKNOWN", found)


class InteractionPrimitiveTests(unittest.TestCase):
    def test_overlay_requires_trigger_escape_open(self):
        found = codes({"primitives": {"items": [{"id": "primitive/x", "states": ["default"], "interaction": {"kind": "overlay"}}]}})
        self.assertEqual(sorted(found), ["INTERACTION_DISMISS_MISSING", "INTERACTION_STATE_MISSING", "INTERACTION_TRIGGER_MISSING"])

    def test_complete_overlay(self):
        item = {"id": "primitive/x", "states": ["open"], "interaction": {"kind": "overlay", "trigger": ["hover"], "dismiss": ["escape"]}}
        self.assertEqual(codes({"primitives": {"items": [item]}}), [])


def scene_graph(facts):
    return {"definitions": [{"id": "scene.main", "kind": "scene", "name": "main", "locator": "g.yaml#/definitions/scene.main", "exports": [], "facts": facts}],
            "usages": [], "exclusions": []}


def fact(prop, value, negative=False):
    return {"id": f"f.{prop}", "facet": "layout_scenes", "subject": "main", "context": None, "slot": "root", "state": "default",
            "property": prop, "value": {"kind": "semantic", "value": value}, "negative": negative, "rule_id": "X"}


class Round5CaptureTests(unittest.TestCase):
    def test_vocabulary(self):
        self.assertEqual(parse_comma_set({"value": "tooltip,context-menu"}, INTERACTION_VOCABULARY), ["tooltip", "context-menu"])
        self.assertIsNone(parse_comma_set({"value": "tooltip,sparkles"}, INTERACTION_VOCABULARY))
        self.assertEqual(parse_comma_set({"value": "none"}, INTERACTION_VOCABULARY), ["none"])

    def test_silence_fails_closed(self):
        gaps = mandatory_fact_gaps(scene_graph([]), "g.yaml", ["main"])
        self.assertIn("interaction-inventory:main", gaps)
        self.assertIn("theme-set:main", gaps)

    def test_answers(self):
        gaps = mandatory_fact_gaps(scene_graph([fact("interaction_inventory", "tooltip"), fact("theme_set", "light,dark")]), "g.yaml", ["main"])
        self.assertNotIn("interaction-inventory:main", gaps)
        self.assertNotIn("theme-set:main", gaps)


if __name__ == "__main__":
    unittest.main()


class GateSurfaceClosureTests(unittest.TestCase):
    def test_captured_themes_and_interactions_must_be_carried(self):
        import tempfile
        import yaml
        from template_authoring.gate import captured_surface_closure

        receipt = {"facts": [
            {**fact("theme_set", "light,dark"), "status": "observed"},
            {**fact("interaction_inventory", "tooltip,context-menu"), "status": "observed"},
        ]}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "t.yaml").write_text(yaml.safe_dump({"tokens": {}}))
            (root / "p.yaml").write_text(yaml.safe_dump({"items": [{"id": "primitive/tip", "interaction": {"kind": "overlay", "covers": ["tooltip"]}}]}))
            manifest = {"layers": {"tokens": "t.yaml", "primitives": "p.yaml"}}
            found = {i["code"]: i["details"] for i in captured_surface_closure(receipt, root, manifest)}
            self.assertEqual(found["THEME_COVERAGE_REQUIRED"]["missing"], ["dark", "light"])
            self.assertEqual(found["INTERACTION_INVENTORY_UNCOVERED"]["uncovered"], ["context-menu"])
            (root / "t.yaml").write_text(yaml.safe_dump({"tokens": {}, "themes": {"default": "light", "variants": {"dark": {"overrides": {}}}}}))
            found = {i["code"] for i in captured_surface_closure(receipt, root, manifest)}
            self.assertNotIn("THEME_COVERAGE_REQUIRED", found)


class Round4ConventionTests(unittest.TestCase):
    def test_projection_naming_and_theme_block(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location("pt", ROOT / "scripts/project_tokens.py")
        pt = importlib.util.module_from_spec(spec); spec.loader.exec_module(pt)
        doc = {"tokens": {"color": {"primary": {"value": "#000", "origin": "source"}},
                          "space": {"2": {"value": 0.5, "unit": "rem", "origin": "source"}},
                          "size": {"dialog": {"value": 80, "unit": "dvh", "origin": "source"}},
                          "icon": {"size": {"default": {"value": 16, "unit": "px", "origin": "source"}}}},
               "themes": {"default": "light", "variants": {"dark": {"overrides": {"color.primary": {"value": "#fff", "origin": "source"}}}}}}
        css = pt.project(doc)
        for needle in ("--color-primary: #000", "--spacing-space-2: 0.5rem", "--spacing-dialog: 80dvh", "--spacing-icon: 16px", ".dark {", "color-scheme: dark", "--color-primary: #fff"):
            self.assertIn(needle, css)

    def test_projection_collision_fails(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location("pt", ROOT / "scripts/project_tokens.py")
        pt = importlib.util.module_from_spec(spec); spec.loader.exec_module(pt)
        doc = {"tokens": {"size": {"icon-sm": {"value": 14, "unit": "px", "origin": "source"}},
                          "icon": {"size": {"sm": {"value": 12, "unit": "px", "origin": "source"}}}}}
        with self.assertRaises(SystemExit):
            pt.project(doc)

    def test_template_variant_contracts_declare_colors(self):
        import yaml
        doc = yaml.safe_load((ROOT / "templates/workbench-shell/core/primitives.yaml").read_text())
        button = next(i for i in doc["items"] if i["id"] == "primitive/button")
        for name, contract in button["variant_contracts"].items():
            self.assertIn("foreground", contract, name)
