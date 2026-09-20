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
        _fact("fact.slot.header", property="slot_role", slot="page-header"),
        _fact("fact.order.header", property="slot_order", slot="page-header", value={"kind": "semantic", "value": "8"}),
        _fact("fact.slot.nav", property="slot_role", slot="nav-group", value={"kind": "semantic", "value": "nav-group"}),
        _fact("fact.order.nav", property="slot_order", slot="nav-group", value={"kind": "semantic", "value": "4"}),
    ]
    return {
        "definitions": [
            {"id": "scene.shell", "kind": "scene", "name": "shell", "locator": f"{GRAPH_PATH}#/definitions/scene.shell", "exports": [], "facts": base_facts + extra_facts},
        ],
        "usages": [],
        "exclusions": [],
    }


class Round3MandatoryMatrixTests(unittest.TestCase):
    def gaps(self, graph: dict[str, Any], contexts: list[str] | None = None) -> list[str]:
        return mandatory_fact_gaps(graph, GRAPH_PATH, ["shell"], contexts)

    def test_chrome_containment_silence_fails_closed(self) -> None:
        self.assertIn("chrome-containment:shell", self.gaps(_shell_graph([])))

    def test_chrome_containment_answered_by_container_role(self) -> None:
        graph = _shell_graph([
            _fact("fact.header.container", property="container_role", value={"kind": "semantic", "value": "page-canvas"}),
        ])
        self.assertNotIn("chrome-containment:shell", self.gaps(graph))

    def test_chrome_containment_root_still_answers(self) -> None:
        graph = _shell_graph([
            _fact("fact.header.container", property="container_role", value={"kind": "semantic", "value": "root"}),
        ])
        self.assertNotIn("chrome-containment:shell", self.gaps(graph))

    def test_chrome_separation_silence_fails_closed(self) -> None:
        self.assertIn("chrome-separation:shell", self.gaps(_shell_graph([])))

    def test_chrome_separation_negative_border_answers(self) -> None:
        graph = _shell_graph([
            _fact("fact.nav.border-none", facet="component_geometry", property="border", slot="nav-group", value={"kind": "semantic", "value": "none"}, negative=True),
        ])
        self.assertNotIn("chrome-separation:shell", self.gaps(graph))

    def test_state_decoration_silence_fails_closed(self) -> None:
        gaps = self.gaps(_shell_graph([]), ["navigation-link"])
        self.assertIn("state-decoration:navigation-link", gaps)

    def test_state_decoration_default_state_answers(self) -> None:
        graph = _shell_graph([
            _fact(
                "fact.nav-link.default-decoration",
                facet="state_presentations",
                subject="link",
                context="navigation-link",
                slot="item",
                state="default",
                property="text_decoration",
                value={"kind": "semantic", "value": "none"},
                negative=True,
            ),
        ])
        self.assertNotIn("state-decoration:navigation-link", self.gaps(graph, ["navigation-link"]))

    def test_state_decoration_hover_state_does_not_answer(self) -> None:
        graph = _shell_graph([
            _fact(
                "fact.nav-link.hover-decoration",
                facet="state_presentations",
                subject="link",
                context="navigation-link",
                slot="item",
                state="hover",
                property="text_decoration",
                value={"kind": "semantic", "value": "none"},
                negative=True,
            ),
        ])
        self.assertIn("state-decoration:navigation-link", self.gaps(graph, ["navigation-link"]))

    def test_state_decoration_non_link_context_not_asked(self) -> None:
        states = mandatory_answer_states(_shell_graph([]), GRAPH_PATH, ["shell"], ["action-trigger"])
        self.assertNotIn("state-decoration:action-trigger", states)

    def test_trigger_anatomy_silence_fails_closed(self) -> None:
        graph = {
            "definitions": [
                {"id": "component.select", "kind": "component", "name": "select", "locator": f"{GRAPH_PATH}#/definitions/component.select", "exports": [], "facts": []},
            ],
            "usages": [],
            "exclusions": [],
        }
        self.assertIn("trigger-anatomy:select", self.gaps(graph))

    def test_trigger_anatomy_whole_trigger_answers(self) -> None:
        graph = {
            "definitions": [
                {
                    "id": "component.select",
                    "kind": "component",
                    "name": "select",
                    "locator": f"{GRAPH_PATH}#/definitions/component.select",
                    "exports": [],
                    "facts": [
                        {
                            "id": "fact.select.anatomy",
                            "facet": "component_geometry",
                            "subject": "select",
                            "context": None,
                            "slot": "trigger",
                            "state": "default",
                            "property": "anatomy",
                            "value": {"kind": "semantic", "value": "whole-trigger"},
                            "negative": False,
                            "rule_id": "QUALITY-101",
                        }
                    ],
                },
            ],
            "usages": [],
            "exclusions": [],
        }
        self.assertNotIn("trigger-anatomy:select", self.gaps(graph))


class NegativeSemanticTests(unittest.TestCase):
    def test_positive_semantic_marked_negative_is_rejected(self) -> None:
        fact = _fact("fact.bad", facet="state_presentations", property="text_decoration", value={"kind": "semantic", "value": "underline"}, negative=True)
        with self.assertRaises(CaptureError) as caught:
            _validate_fact(fact, "$.definitions[0].facts[0]")
        self.assertEqual("NEGATIVE_FACT_INVALID", caught.exception.code)

    def test_underline_positive_still_accepted(self) -> None:
        fact = _fact("fact.ok", facet="state_presentations", property="text_decoration", value={"kind": "semantic", "value": "underline"}, negative=False)
        self.assertEqual("fact.ok", _validate_fact(fact, "$.definitions[0].facts[0]")["id"])


def _receipt(facts: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "request": {
            "source_id": "source-001",
            "graph_path": GRAPH_PATH,
            "conformance": "structural",
            "scope": {"scenes": ["shell"], "components": [], "contexts": []},
        },
        "source": {"revision": "0" * 40},
        "closure": {"definitions": [], "exports": [], "imports": [], "usages": [], "exclusions": [], "dynamic": []},
        "facts": facts,
        "unresolved": [],
    }


class ProjectionTests(unittest.TestCase):
    def test_container_role_projects_nested_region_and_relation(self) -> None:
        fidelity = facts_to_fidelity(_receipt([
            _fact("fact.variant", property="shell_variant", slot="page-canvas", value={"kind": "semantic", "value": "inset"}),
            _fact("fact.slot.canvas", property="slot_role", slot="page-canvas", value={"kind": "semantic", "value": "page-canvas"}),
            _fact("fact.order.canvas", property="slot_order", slot="page-canvas", value={"kind": "semantic", "value": "10"}),
            _fact("fact.slot.header", property="slot_role", slot="page-header"),
            _fact("fact.order.header", property="slot_order", slot="page-header", value={"kind": "semantic", "value": "8"}),
            _fact("fact.header.container", property="container_role", value={"kind": "semantic", "value": "page-canvas"}),
        ]))
        scene = fidelity["layout_scenes"][0]
        header = next(item for item in scene["regions"] if item["id"] == "region.shell.page-header")
        self.assertEqual("region.shell.page-canvas", header["parent"])
        edge = next(item for item in scene["relations"] if item["to"] == "region.shell.page-header")
        self.assertEqual("region.shell.page-canvas", edge["from"])
        root_edge = next(item for item in scene["relations"] if item["to"] == "region.shell.page-canvas")
        self.assertEqual("region.shell.root", root_edge["from"])

    def test_container_role_root_keeps_flat_topology(self) -> None:
        fidelity = facts_to_fidelity(_receipt([
            _fact("fact.variant", property="shell_variant", slot="page-canvas", value={"kind": "semantic", "value": "inset"}),
            _fact("fact.slot.header", property="slot_role", slot="page-header"),
            _fact("fact.order.header", property="slot_order", slot="page-header", value={"kind": "semantic", "value": "8"}),
            _fact("fact.header.container", property="container_role", value={"kind": "semantic", "value": "root"}),
        ]))
        scene = fidelity["layout_scenes"][0]
        header = next(item for item in scene["regions"] if item["id"] == "region.shell.page-header")
        self.assertNotIn("parent", header)

    def test_trigger_anatomy_projects_into_geometry_properties(self) -> None:
        fidelity = facts_to_fidelity(_receipt([
            {
                "id": "fact.select.anatomy",
                "facet": "component_geometry",
                "subject": "select",
                "context": None,
                "slot": "trigger",
                "state": "default",
                "property": "anatomy",
                "value": {"kind": "semantic", "value": "whole-trigger"},
                "negative": False,
                "rule_id": "QUALITY-101",
            },
        ]))
        record = fidelity["component_geometry"][0]
        self.assertEqual({"kind": "semantic", "value": "whole-trigger"}, record["properties"]["anatomy"])

    def test_contradictory_decoration_projection_fails(self) -> None:
        with self.assertRaises(ValueError):
            facts_to_fidelity(_receipt([
                _fact(
                    "fact.link.default-underline",
                    facet="state_presentations",
                    subject="link",
                    context="navigation-link",
                    slot="item",
                    state="default",
                    property="text_decoration",
                    value={"kind": "semantic", "value": "underline"},
                    negative=True,
                ),
            ]))


class SidecarSemanticTests(unittest.TestCase):
    def test_v2_sidecar_decoration_conflict_fails_closed(self) -> None:
        from template_validation.fidelity import validate_semantics

        data = {
            "schema_version": 1,
            "profile": "repo-structural-v1",
            "conformance": "structural",
            "scope": {"scenes": [], "components": [], "contexts": ["navigation-link"]},
            "layout_scenes": [],
            "component_geometry": [],
            "state_presentations": [
                {
                    "id": "state.nav-link.navigation-link.default.item",
                    "subject_role": "nav-link",
                    "context": "navigation-link",
                    "state": "default",
                    "surface": "item",
                    "rule_id": "rule.QUALITY-103",
                    "status": "observed",
                    "text_decoration": "underline",
                    "visibility": "visible",
                    "negative_facts": [{"property": "text_decoration", "value": "underline"}],
                    "provenance": {"source_id": "source-002", "source_revision": "0" * 40, "locator": {"path": GRAPH_PATH, "symbol": None, "selector": None, "pointer": "#/x", "line": None}, "method": "source-graph", "source_span_sha256": "sha256:" + "0" * 64, "captured_at": "2026-01-01T00:00:00Z", "confidence": "high"},
                }
            ],
        }
        result = ValidationResult()
        validate_semantics(data, result=result, path=Path("fidelity.yaml"), rel="fidelity.yaml", token_paths=set(), rule_ids={"rule.QUALITY-103"}, source_ids={"source-002"})
        codes = {finding.code for finding in result.findings}
        self.assertIn("FIDELITY_STATE_DECORATION_CONFLICT", codes)

    def test_v2_sidecar_parent_dangling_fails_closed(self) -> None:
        from template_validation.fidelity import validate_semantics

        data = {
            "schema_version": 1,
            "profile": "repo-structural-v1",
            "conformance": "structural",
            "scope": {"scenes": ["shell"], "components": [], "contexts": []},
            "layout_scenes": [
                {
                    "id": "scene.shell",
                    "scene": "shell",
                    "scene_kind": "shell",
                    "rule_id": "rule.LAYOUT-101",
                    "status": "observed",
                    "regions": [
                        {"id": "region.shell.root", "role": "root"},
                        {"id": "region.shell.page-header", "role": "page-header", "parent": "region.shell.ghost"},
                    ],
                    "relations": [],
                    "arrangement": "horizontal",
                    "fill": "intrinsic",
                    "wrap": "wrap",
                    "shrink": "shrink",
                    "scroll_domains": [],
                    "overlays": [],
                    "responsive_modes": [],
                    "negative_facts": [{"property": "root_scroll", "value": "none"}],
                    "shell_variant": "inset",
                    "slots": [],
                    "provenance": {"source_id": "source-002", "source_revision": "0" * 40, "locator": {"path": GRAPH_PATH, "symbol": None, "selector": None, "pointer": "#/x", "line": None}, "method": "source-graph", "source_span_sha256": "sha256:" + "0" * 64, "captured_at": "2026-01-01T00:00:00Z", "confidence": "high"},
                }
            ],
            "component_geometry": [],
            "state_presentations": [],
        }
        result = ValidationResult()
        validate_semantics(data, result=result, path=Path("fidelity.yaml"), rel="fidelity.yaml", token_paths=set(), rule_ids={"rule.LAYOUT-101"}, source_ids={"source-002"})
        codes = {finding.code for finding in result.findings}
        self.assertIn("FIDELITY_REGION_PARENT_DANGLING", codes)


class ContainmentScenarioTests(unittest.TestCase):
    def test_fidelity_region_parent_derives_scenario(self) -> None:
        from template_apply_state.fidelity import derive_scenario_ids

        profile = {
            "conformance": "structural",
            "layout_scenes": [
                {
                    "id": "scene.shell",
                    "regions": [
                        {"id": "region.shell.root", "role": "root"},
                        {"id": "region.shell.page-canvas", "role": "page-canvas"},
                        {"id": "region.shell.page-header", "role": "page-header", "parent": "region.shell.page-canvas"},
                    ],
                }
            ],
        }
        self.assertIn(
            "phase8:containment:scene.shell:region.shell.page-header:in:region.shell.page-canvas",
            derive_scenario_ids(profile),
        )

    def test_core_layout_region_parent_derives_scenario(self) -> None:
        from template_apply_state.fidelity import derive_scenario_ids

        profile = {"conformance": "structural", "layout_scenes": [], "component_geometry": [], "state_presentations": []}
        layout = {
            "items": [
                {
                    "id": "route/shell",
                    "placement": {
                        "id": "shell",
                        "regions": [
                            {"id": "region.shell.page-canvas", "role": "page-canvas"},
                            {"id": "region.shell.page-header", "role": "page-header", "parent": "region.shell.page-canvas"},
                        ],
                        "pattern_refs": ["pattern/app-shell"],
                    },
                }
            ]
        }
        self.assertIn(
            "phase8:placement-containment:route/shell:region.shell.page-header:in:region.shell.page-canvas",
            derive_scenario_ids(profile, layout),
        )


class V1SidecarTests(unittest.TestCase):
    def test_v1_package_sidecar_decoration_conflict_fails_closed(self) -> None:
        import tempfile

        from validate_design_system import Report, validate_fidelity_sidecar

        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp)
            (target / "fidelity.yaml").write_text(
                """
schema_version: 1
profile: repo-structural-v1
conformance: structural
scope: {scenes: [], components: [], contexts: []}
layout_scenes: []
component_geometry: []
state_presentations:
- id: state.nav-link.navigation-link.default.item
  subject_role: nav-link
  context: navigation-link
  state: default
  surface: item
  rule_id: rule.QUALITY-103
  status: observed
  text_decoration: underline
  visibility: visible
  negative_facts:
  - property: text_decoration
    value: underline
""".lstrip(),
                encoding="utf-8",
            )
            report = Report("package", target)
            validate_fidelity_sidecar(target, report)
            codes = {error["code"] for error in report.to_dict()["errors"]}
            self.assertIn("FIDELITY_STATE_DECORATION_CONFLICT", codes)


if __name__ == "__main__":
    unittest.main()
