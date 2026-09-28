from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_authoring.capture import CaptureError, _validate_fact
from template_authoring.chrome import mandatory_answer_states, mandatory_fact_gaps
from template_authoring.profile import facts_to_fidelity
from template_validation.model import ValidationResult

GRAPH_PATH = "ui-source-graph.yaml"


def _fact(fid: str, **overrides: Any) -> dict[str, Any]:
    fact: dict[str, Any] = {
        "id": fid,
        "facet": "layout_scenes",
        "subject": "shell",
        "context": None,
        "slot": "page-header",
        "state": "default",
        "property": "slot_role",
        "value": {"kind": "semantic", "value": "page-header"},
        "negative": False,
        "rule_id": "LAYOUT-001",
    }
    fact.update(overrides)
    return fact


def _shell_graph(extra_facts: list[dict[str, Any]]) -> dict[str, Any]:
    base_facts = [
        _fact("fact.variant", property="shell_variant", slot="page-canvas", value={"kind": "semantic", "value": "inset"}),
        _fact("fact.slot.canvas", property="slot_role", slot="page-canvas", value={"kind": "semantic", "value": "page-canvas"}),
        _fact("fact.order.canvas", property="slot_order", slot="page-canvas", value={"kind": "semantic", "value": "10"}),
        _fact("fact.slot.header", property="slot_role", slot="page-header"),
        _fact("fact.order.header", property="slot_order", slot="page-header", value={"kind": "semantic", "value": "8"}),
        _fact("fact.slot.toolbar", property="slot_role", slot="page-toolbar", value={"kind": "semantic", "value": "page-toolbar"}),
        _fact("fact.order.toolbar", property="slot_order", slot="page-toolbar", value={"kind": "semantic", "value": "9"}),
        _fact("fact.slot.nav", property="slot_role", slot="nav-group", value={"kind": "semantic", "value": "nav-group"}),
        _fact("fact.order.nav", property="slot_order", slot="nav-group", value={"kind": "semantic", "value": "4"}),
        _fact("fact.header.container", property="container_role", slot="page-header", value={"kind": "semantic", "value": "page-canvas"}),
    ]
    return {
        "definitions": [
            {"id": "scene.shell", "kind": "scene", "name": "shell", "locator": f"{GRAPH_PATH}#/definitions/scene.shell", "exports": [], "facts": base_facts + extra_facts},
        ],
        "usages": [],
        "exclusions": [],
    }


def _settings_graph(extra_facts: list[dict[str, Any]]) -> dict[str, Any]:
    base_facts = [
        _fact("fact.settings.root-no-scroll", subject="settings", slot=None, property="root_scroll", value={"kind": "semantic", "value": "none"}, negative=True, rule_id="LAYOUT-002"),
        _fact("fact.settings.nav-placement", subject="settings", slot="section-nav", property="arrangement", value={"kind": "semantic", "value": "vertical"}, rule_id="LAYOUT-002"),
        _fact("fact.settings.nav-scroll", subject="settings", slot="section-nav", property="scroll_block", value={"kind": "semantic", "value": "region"}, rule_id="LAYOUT-002"),
        _fact("fact.settings.content-scroll", subject="settings", slot="page-canvas", property="scroll_block", value={"kind": "semantic", "value": "region"}, rule_id="LAYOUT-002"),
        _fact("fact.settings.nav-stretch", subject="settings", slot="section-nav", property="container_presentation", value={"kind": "semantic", "value": "fill"}, rule_id="LAYOUT-002"),
        _fact("fact.settings.nav-anatomy", subject="settings", slot="section-nav", property="anatomy", value={"kind": "semantic", "value": "icon-label"}, rule_id="LAYOUT-002"),
        _fact("fact.settings.nav-selected", subject="settings", facet="state_presentations", context="navigation-link", slot="section-nav", state="selected", property="background", value={"kind": "token-ref", "value": "color.surface-selected"}, rule_id="QUALITY-103"),
        _fact("fact.settings.nav-hover", subject="settings", facet="state_presentations", context="navigation-link", slot="section-nav", state="hover", property="background", value={"kind": "token-ref", "value": "color.surface-hover"}, rule_id="QUALITY-103"),
    ]
    return {
        "definitions": [
            {"id": "scene.settings", "kind": "scene", "name": "settings", "locator": f"{GRAPH_PATH}#/definitions/scene.settings", "exports": [], "facts": []},
        ],
        "usages": [
            {"id": "usage.settings-nav", "definition_id": "scene.settings", "scene": "settings", "component": None, "context": None, "slot": "section-nav", "state": "default", "locator": f"{GRAPH_PATH}#/usages/usage.settings-nav", "facts": base_facts + extra_facts},
        ],
        "exclusions": [],
    }


def _components_graph(components: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "definitions": [{"id": f"component.{name}", "kind": "component", "name": name, "locator": f"{GRAPH_PATH}#/definitions/component.{name}", "exports": [], "facts": facts} for name, facts in components],
        "usages": [],
        "exclusions": [],
    }


def _receipt(facts: list[dict[str, Any]], scenes: list[str] | None = None, components: list[str] | None = None) -> dict[str, Any]:
    return {
        "request": {
            "source_id": "source-001",
            "graph_path": GRAPH_PATH,
            "conformance": "structural",
            "scope": {"scenes": scenes or [], "components": components or [], "contexts": []},
        },
        "source": {"revision": "0" * 40},
        "closure": {"definitions": [], "exports": [], "imports": [], "usages": [], "exclusions": [], "dynamic": []},
        "facts": facts,
        "unresolved": [],
    }


class Round4MandatoryMatrixTests(unittest.TestCase):
    def gaps(self, graph: dict[str, Any], scenes: list[str], contexts: list[str] | None = None) -> list[str]:
        return mandatory_fact_gaps(graph, GRAPH_PATH, scenes, contexts)

    # ---- chrome-edge ----
    def test_chrome_edge_silence_fails_closed(self) -> None:
        self.assertIn("chrome-edge:shell", self.gaps(_shell_graph([]), ["shell"]))

    def test_chrome_edge_zero_negative_answers(self) -> None:
        graph = _shell_graph([
            _fact("fact.canvas.pbs-zero", slot="page-canvas", property="padding_block_start", value={"kind": "semantic", "value": "zero"}, negative=True),
        ])
        self.assertNotIn("chrome-edge:shell", self.gaps(graph, ["shell"]))

    def test_chrome_edge_token_ref_answers(self) -> None:
        graph = _shell_graph([
            _fact("fact.canvas.pbs", slot="page-canvas", property="padding_block_start", value={"kind": "token-ref", "value": "space.2"}),
        ])
        self.assertNotIn("chrome-edge:shell", self.gaps(graph, ["shell"]))

    def test_chrome_edge_not_asked_without_header_slots(self) -> None:
        graph = _shell_graph([])
        graph["definitions"][0]["facts"] = [
            fact for fact in graph["definitions"][0]["facts"]
            if fact.get("property") != "slot_role" or fact.get("value", {}).get("value") not in {"page-header", "page-toolbar"}
        ]
        self.assertNotIn("chrome-edge:shell", self.gaps(graph, ["shell"]))

    # ---- content-region ----
    def test_content_region_silence_fails_closed(self) -> None:
        self.assertIn("content-region:shell", self.gaps(_shell_graph([]), ["shell"]))

    def test_content_region_partial_answers_still_fail(self) -> None:
        graph = _shell_graph([
            _fact("fact.content.slot", slot="content", property="slot_role", value={"kind": "semantic", "value": "content"}),
            _fact("fact.content.pbs", slot="content", property="padding_block_start", value={"kind": "token-ref", "value": "space.2"}),
            _fact("fact.content.scroll", slot="content", property="scroll_block", value={"kind": "semantic", "value": "region"}),
        ])
        gaps = self.gaps(graph, ["shell"])
        self.assertIn("content-region:shell", gaps)

    def test_content_region_full_answers(self) -> None:
        graph = _shell_graph([
            _fact("fact.content.slot", slot="content", property="slot_role", value={"kind": "semantic", "value": "content"}),
            _fact("fact.content.order", slot="content", property="slot_order", value={"kind": "semantic", "value": "11"}),
            _fact("fact.content.container", slot="content", property="container_role", value={"kind": "semantic", "value": "page-canvas"}),
            _fact("fact.content.pbs", slot="content", property="padding_block_start", value={"kind": "token-ref", "value": "space.2"}),
            _fact("fact.content.scroll", slot="content", property="scroll_block", value={"kind": "semantic", "value": "region"}),
        ])
        self.assertNotIn("content-region:shell", self.gaps(graph, ["shell"]))

    # ---- header-anatomy ----
    def test_header_anatomy_silence_fails_closed(self) -> None:
        graph = _components_graph([("page-header", [])])
        self.assertIn("header-anatomy:page-header", self.gaps(graph, []))

    def test_header_anatomy_icon_title_answers(self) -> None:
        facts = [{
            "id": "fact.page-header.anatomy",
            "facet": "component_geometry",
            "subject": "page-header",
            "context": None,
            "slot": "title",
            "state": "default",
            "property": "anatomy",
            "value": {"kind": "semantic", "value": "icon-title"},
            "negative": False,
            "rule_id": "QUALITY-106",
        }]
        graph = _components_graph([("page-header", facts)])
        self.assertNotIn("header-anatomy:page-header", self.gaps(graph, []))

    def test_header_anatomy_suffix_component_asked(self) -> None:
        graph = _components_graph([("collection-page-header", [])])
        self.assertIn("header-anatomy:collection-page-header", self.gaps(graph, []))

    def test_header_anatomy_unknown_semantic_rejected(self) -> None:
        fact = _fact(
            "fact.bad.anatomy",
            facet="component_geometry",
            subject="page-header",
            slot="title",
            property="anatomy",
            value={"kind": "semantic", "value": "fancy-title"},
        )
        with self.assertRaises(CaptureError):
            _validate_fact(fact, "$.definitions[0].facts[0]")

    def test_non_header_component_not_asked(self) -> None:
        graph = _components_graph([("badge", [])])
        self.assertEqual([], self.gaps(graph, []))

    # ---- nav-item-geometry / nav-item-type ----
    def test_nav_item_geometry_silence_fails_closed(self) -> None:
        self.assertIn("nav-item-geometry:settings", self.gaps(_settings_graph([]), ["settings"]))

    def test_nav_item_type_silence_fails_closed(self) -> None:
        self.assertIn("nav-item-type:settings", self.gaps(_settings_graph([]), ["settings"]))

    def test_nav_item_geometry_and_type_answers(self) -> None:
        extra = [
            _fact("fact.settings.nav-item-size", subject="settings", facet="component_geometry", slot="section-nav", property="size", value={"kind": "token-ref", "value": "size.control-height-lg"}),
            _fact("fact.settings.nav-text-default", subject="settings", facet="state_presentations", context="navigation-link", slot="section-nav", state="default", property="text", value={"kind": "token-ref", "value": "color.text-secondary"}),
            _fact("fact.settings.nav-text-selected", subject="settings", facet="state_presentations", context="navigation-link", slot="section-nav", state="selected", property="text", value={"kind": "token-ref", "value": "color.text-primary"}),
        ]
        gaps = self.gaps(_settings_graph(extra), ["settings"])
        self.assertNotIn("nav-item-geometry:settings", gaps)
        self.assertNotIn("nav-item-type:settings", gaps)

    def test_nav_item_type_single_state_does_not_answer(self) -> None:
        extra = [
            _fact("fact.settings.nav-text-default", subject="settings", facet="state_presentations", context="navigation-link", slot="section-nav", state="default", property="text", value={"kind": "token-ref", "value": "color.text-secondary"}),
        ]
        self.assertIn("nav-item-type:settings", self.gaps(_settings_graph(extra), ["settings"]))

    # ---- row-disclosure ----
    def test_row_disclosure_silence_fails_closed(self) -> None:
        graph = _components_graph([("data-table", [])])
        self.assertIn("row-disclosure:data-table", self.gaps(graph, []))

    def test_row_disclosure_default_only_does_not_answer(self) -> None:
        facts = [{
            "id": "fact.data-table.actions-default",
            "facet": "state_presentations",
            "subject": "data-table",
            "context": "navigation-link",
            "slot": "row-actions",
            "state": "default",
            "property": "visibility",
            "value": {"kind": "semantic", "value": "hidden"},
            "negative": True,
            "rule_id": "DENSITY-101",
        }]
        graph = _components_graph([("data-table", facts)])
        self.assertIn("row-disclosure:data-table", self.gaps(graph, []))

    def test_row_disclosure_default_and_hover_answers(self) -> None:
        facts = [
            {
                "id": "fact.data-table.actions-default",
                "facet": "state_presentations",
                "subject": "data-table",
                "context": "navigation-link",
                "slot": "row-actions",
                "state": "default",
                "property": "visibility",
                "value": {"kind": "semantic", "value": "hidden"},
                "negative": True,
                "rule_id": "DENSITY-101",
            },
            {
                "id": "fact.data-table.actions-hover",
                "facet": "state_presentations",
                "subject": "data-table",
                "context": "navigation-link",
                "slot": "row-actions",
                "state": "hover",
                "property": "visibility",
                "value": {"kind": "semantic", "value": "visible"},
                "negative": False,
                "rule_id": "DENSITY-101",
            },
        ]
        graph = _components_graph([("data-table", facts)])
        self.assertNotIn("row-disclosure:data-table", self.gaps(graph, []))

    def test_exclusion_answers_round4_questions(self) -> None:
        graph = _shell_graph([])
        graph["exclusions"].append({"id": "exclusion.shell", "locator": f"{GRAPH_PATH}#/definitions/scene.shell", "reason": "out-of-scope"})
        gaps = self.gaps(graph, ["shell"])
        self.assertNotIn("chrome-edge:shell", gaps)
        self.assertNotIn("content-region:shell", gaps)


class Round4ProjectionTests(unittest.TestCase):
    def test_content_region_projects_nested_region_scroll_and_scenario(self) -> None:
        from template_apply_state.fidelity import derive_scenario_ids

        fidelity = facts_to_fidelity(_receipt([
            _fact("fact.variant", property="shell_variant", slot="page-canvas", value={"kind": "semantic", "value": "inset"}),
            _fact("fact.slot.canvas", property="slot_role", slot="page-canvas", value={"kind": "semantic", "value": "page-canvas"}),
            _fact("fact.order.canvas", property="slot_order", slot="page-canvas", value={"kind": "semantic", "value": "10"}),
            _fact("fact.canvas.pbs-zero", slot="page-canvas", property="padding_block_start", value={"kind": "semantic", "value": "zero"}, negative=True),
            _fact("fact.slot.header", property="slot_role", slot="page-header"),
            _fact("fact.order.header", property="slot_order", slot="page-header", value={"kind": "semantic", "value": "8"}),
            _fact("fact.header.container", property="container_role", slot="page-header", value={"kind": "semantic", "value": "page-canvas"}),
            _fact("fact.slot.content", slot="content", property="slot_role", value={"kind": "semantic", "value": "content"}),
            _fact("fact.order.content", slot="content", property="slot_order", value={"kind": "semantic", "value": "11"}),
            _fact("fact.content.container", slot="content", property="container_role", value={"kind": "semantic", "value": "page-canvas"}),
            _fact("fact.content.pbs", slot="content", property="padding_block_start", value={"kind": "token-ref", "value": "space.2"}),
            _fact("fact.content.scroll", slot="content", property="scroll_block", value={"kind": "semantic", "value": "region"}),
        ], scenes=["shell"]))
        scene = fidelity["layout_scenes"][0]
        content = next(item for item in scene["regions"] if item["id"] == "region.shell.content")
        self.assertEqual("region.shell.page-canvas", content["parent"])
        owner = next(item for item in scene["scroll_domains"] if item["owner"] == "region.shell.content")
        self.assertEqual("block", owner["axis"])
        scenarios = derive_scenario_ids(fidelity)
        self.assertIn("phase8:containment:scene.shell:region.shell.content:in:region.shell.page-canvas", scenarios)
        self.assertIn("phase8:scroll:scene.shell:scroll.shell.content:block:region.shell.content", scenarios)

    def test_header_anatomy_projects_into_geometry_properties(self) -> None:
        fidelity = facts_to_fidelity(_receipt([
            {
                "id": "fact.page-header.anatomy",
                "facet": "component_geometry",
                "subject": "page-header",
                "context": None,
                "slot": "title",
                "state": "default",
                "property": "anatomy",
                "value": {"kind": "semantic", "value": "icon-title"},
                "negative": False,
                "rule_id": "QUALITY-106",
            },
        ], components=["page-header"]))
        record = fidelity["component_geometry"][0]
        self.assertEqual({"kind": "semantic", "value": "icon-title"}, record["properties"]["anatomy"])

    def test_row_disclosure_projects_visibility_with_negative(self) -> None:
        fidelity = facts_to_fidelity(_receipt([
            {
                "id": "fact.data-table.actions-default",
                "facet": "state_presentations",
                "subject": "data-table",
                "context": "navigation-link",
                "slot": "row-actions",
                "state": "default",
                "property": "visibility",
                "value": {"kind": "semantic", "value": "hidden"},
                "negative": True,
                "rule_id": "DENSITY-101",
            },
            {
                "id": "fact.data-table.actions-hover",
                "facet": "state_presentations",
                "subject": "data-table",
                "context": "navigation-link",
                "slot": "row-actions",
                "state": "hover",
                "property": "visibility",
                "value": {"kind": "semantic", "value": "visible"},
                "negative": False,
                "rule_id": "DENSITY-101",
            },
        ], components=["data-table"]))
        default = next(item for item in fidelity["state_presentations"] if item["state"] == "default")
        hover = next(item for item in fidelity["state_presentations"] if item["state"] == "hover")
        self.assertEqual("hidden", default["visibility"])
        self.assertIn({"property": "visibility", "value": "hidden"}, default["negative_facts"])
        self.assertEqual("visible", hover["visibility"])

    def test_state_visibility_hidden_without_negative_fails_validation(self) -> None:
        from template_validation.fidelity import validate_semantics

        data = {
            "schema_version": 1,
            "profile": "repo-structural-v1",
            "conformance": "structural",
            "scope": {"scenes": [], "components": ["data-table"], "contexts": ["navigation-link"]},
            "layout_scenes": [],
            "component_geometry": [],
            "state_presentations": [
                {
                    "id": "state.data-table.navigation-link.default.row-actions",
                    "subject_role": "data-table",
                    "context": "navigation-link",
                    "state": "default",
                    "surface": "row-actions",
                    "rule_id": "rule.DENSITY-101",
                    "status": "observed",
                    "text_decoration": "none",
                    "visibility": "hidden",
                    "negative_facts": [{"property": "text_decoration", "value": "none"}],
                    "provenance": {"source_id": "source-002", "source_revision": "0" * 40, "locator": {"path": GRAPH_PATH, "symbol": None, "selector": None, "pointer": "#/x", "line": None}, "method": "source-graph", "source_span_sha256": "sha256:" + "0" * 64, "captured_at": "2026-01-01T00:00:00Z", "confidence": "high"},
                }
            ],
            "unresolved": [],
        }
        result = ValidationResult()
        validate_semantics(data, result=result, path=Path("fidelity.yaml"), rel="fidelity.yaml", token_paths=set(), rule_ids={"rule.DENSITY-101"}, source_ids={"source-002"})
        codes = {finding.code for finding in result.findings}
        self.assertIn("FIDELITY_NEGATIVE_FACT_MISSING", codes)

    def test_mandatory_answers_include_round4_labels(self) -> None:
        states = mandatory_answer_states(_shell_graph([]), GRAPH_PATH, ["shell"])
        self.assertEqual("unresolved", states["chrome-edge:shell"])
        self.assertEqual("unresolved", states["content-region:shell"])


if __name__ == "__main__":
    unittest.main()
