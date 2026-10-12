from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_design_system as v  # noqa: E402
from check_anatomy_conformance import check  # noqa: E402
from template_authoring.chrome import mandatory_fact_gaps, parse_slot_inventory  # noqa: E402

CONTRACT = {
    "nav-item": [
        {"slot": "icon", "order": 1, "content": "icon"},
        {"slot": "label", "order": 2, "content": "text"},
        {"slot": "count", "order": 3, "required": False, "content": "number"},
    ],
    "page-shell": [],
}


def node(*slots, primitive="nav-item"):
    return {"primitive": primitive, "slots": [dict(s) for s in slots]}


ICON = {"slot": "icon", "has_graphic": True, "text": ""}
LABEL = {"slot": "label", "has_graphic": False, "text": "Inbox"}


class AnatomyConformanceTests(unittest.TestCase):
    def codes(self, rendered, require_all=False):
        return [e["code"] for e in check(CONTRACT, rendered, require_all)["errors"]]

    def test_conforming_dom_passes(self):
        self.assertEqual(self.codes([node(ICON, LABEL)]), [])

    def test_dropped_icon_fails(self):
        self.assertIn("ANATOMY_SLOT_MISSING", self.codes([node(LABEL)]))

    def test_empty_icon_slot_fails(self):
        self.assertIn("ANATOMY_ICON_EMPTY", self.codes([node({"slot": "icon", "has_graphic": False, "text": ""}, LABEL)]))

    def test_order_is_enforced(self):
        self.assertIn("ANATOMY_ORDER", self.codes([node(LABEL, ICON)]))

    def test_optional_slot_may_be_absent(self):
        self.assertNotIn("ANATOMY_SLOT_MISSING", self.codes([node(ICON, LABEL)]))

    def test_unmarked_dom_fails_closed(self):
        self.assertIn("ANATOMY_CONTRACT_MISSING", self.codes([]))

    def test_hidden_roots_are_skipped(self):
        hidden = dict(node(LABEL), visible=False)
        self.assertEqual(self.codes([node(ICON, LABEL), hidden]), [])

    def test_require_all(self):
        rendered = [node(primitive="page-shell")]
        self.assertIn("PRIMITIVE_NOT_RENDERED", self.codes(rendered, require_all=True))
        self.assertNotIn("PRIMITIVE_NOT_RENDERED", self.codes(rendered))


def _validate(primitives, tokens, capability="ui-kit"):
    report = v.Report("package", Path("."))
    v.validate_anatomy_closure({"primitives": primitives, "tokens": tokens}, capability, report)
    return [e["code"] if isinstance(e, dict) else getattr(e, "code", e) for e in getattr(report, "errors", [])]


ICON_TOKENS = {"tokens": {"icon": {
    "library": {"value": "any-icons", "origin": "default"},
    "stroke-width": {"value": 1.5, "unit": "unitless", "origin": "default"},
    "size": {"default": {"value": 16, "unit": "px", "origin": "default"}},
}}}


class AnatomyValidatorTests(unittest.TestCase):
    def test_ui_kit_requires_anatomy_or_exempt(self):
        prim = {"items": [{"id": "primitive/x"}]}
        self.assertIn("PRIMITIVE_ANATOMY_UNDECLARED", _validate(prim, ICON_TOKENS))
        prim["items"][0]["anatomy_exempt"] = "layout only"
        self.assertNotIn("PRIMITIVE_ANATOMY_UNDECLARED", _validate(prim, ICON_TOKENS))

    def test_tokens_only_not_gated(self):
        self.assertEqual(_validate({"items": [{"id": "primitive/x"}]}, {"tokens": {}}, "tokens-only"), [])

    def test_icon_slot_requires_icon_foundation(self):
        prim = {"items": [{"id": "primitive/x", "anatomy": [{"slot": "icon", "order": 1}]}]}
        self.assertIn("ICON_FOUNDATION_MISSING", _validate(prim, {"tokens": {}}))
        self.assertNotIn("ICON_FOUNDATION_MISSING", _validate(prim, ICON_TOKENS))

    def test_dangling_size_ref(self):
        prim = {"items": [{"id": "primitive/x", "anatomy": [{"slot": "icon", "order": 1, "size_ref": "token/icon.size.huge"}]}]}
        self.assertIn("PRIMITIVE_ANATOMY_SIZE_DANGLING", _validate(prim, ICON_TOKENS))


class SlotInventoryCaptureTests(unittest.TestCase):
    def graph(self, facts):
        return {"definitions": [{"id": "component.button", "kind": "component", "name": "button",
                                 "locator": "g.yaml#/definitions/component.button", "exports": [], "facts": facts}],
                "usages": [], "exclusions": []}

    def test_parse(self):
        self.assertEqual(parse_slot_inventory({"value": "icon, label"}), ["icon", "label"])
        self.assertIsNone(parse_slot_inventory({"value": "icon, sparkle"}))

    def test_silence_fails_closed(self):
        self.assertIn("slot-inventory:button", mandatory_fact_gaps(self.graph([]), "g.yaml", []))

    def test_inventory_fact_answers(self):
        fact = {"id": "f", "facet": "component_geometry", "subject": "button", "context": None, "slot": "root",
                "state": "default", "property": "slot_inventory", "value": {"kind": "semantic", "value": "icon,label"},
                "negative": False, "rule_id": "X"}
        self.assertNotIn("slot-inventory:button", mandatory_fact_gaps(self.graph([fact]), "g.yaml", []))


if __name__ == "__main__":
    unittest.main()
