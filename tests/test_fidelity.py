from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
TESTS = ROOT / "tests"
if str(TESTS) not in sys.path:
    sys.path.insert(0, str(TESTS))
sys.path.insert(0, str(ROOT / "scripts"))

from template_apply_state.fidelity import derive_scenario_ids, facet_change_phase, project_geometry_state, project_layout
from template_authoring.capture import capture_from_files
from template_authoring.profile import facts_to_fidelity
from template_validation.fidelity import canonical_digest, canonicalize, classify_sidecar, load_fidelity, replay_profile
from template_validation.validator import validate_paths

from test_repo_capture import RepoCaptureTests

STRUCTURAL = ROOT / "tests/fixtures/fidelity/structural"


class FidelityContractTests(unittest.TestCase):
    def test_changed_paths_do_not_include_example(self) -> None:
        import check_governance_scope as scope

        self.assertEqual(scope.guard_example_paths(), [])
        self.assertTrue(scope.path_has_example_prefix("example/workbench-shell/" + "web-v2/package.json"))
        self.assertFalse(scope.path_has_example_prefix("tests/fixtures/fidelity/README.md"))

    def test_structural_fixture_passes_portable_with_counts_and_not_run_replay(self) -> None:
        result = validate_paths([STRUCTURAL / "templates"], ROOT, index=STRUCTURAL / "templates/INDEX.md")
        payload = result.to_dict()
        self.assertEqual(0, payload["exit_code"], payload["findings"])
        fidelity = payload["templates"][0]["fidelity"]
        self.assertEqual("structural", fidelity["conformance"])
        self.assertEqual("repo-structural-v1", fidelity["profile"])
        self.assertTrue(fidelity["canonical_digest"].startswith("sha256:"))
        self.assertEqual("not-run", fidelity["replay"]["status"])
        self.assertGreater(fidelity["counts"]["layout_scenes"]["total"], 0)
        self.assertGreater(fidelity["counts"]["component_geometry"]["total"], 0)
        self.assertGreater(fidelity["counts"]["state_presentations"]["total"], 0)
        self.assertEqual(1, payload["fidelity"]["structural"])
        self.assertTrue(payload["discovery"]["example_excluded"])
        self.assertIn("example/**", payload["discovery"]["exclusions"])

    def test_legacy_baseline_has_no_sidecar(self) -> None:
        result = validate_paths([ROOT / "tests/fixtures/validator/good/templates"], ROOT)
        payload = result.to_dict()
        self.assertEqual(0, payload["exit_code"], payload["findings"])
        self.assertEqual("legacy-baseline", payload["templates"][0]["fidelity"]["conformance"])
        self.assertIsNone(payload["templates"][0]["fidelity"]["canonical_digest"])
        self.assertEqual("not-run", payload["templates"][0]["fidelity"]["replay"]["status"])

    def test_style_only_is_distinct_from_legacy(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "templates"
            shutil.copytree(STRUCTURAL / "templates", root)
            template = root / "structural-template"
            shutil.copyfile(ROOT / "tests/fixtures/fidelity/style-only.yaml", template / "fidelity.yaml")
            meta = yaml.safe_load((template / "meta.yaml").read_text(encoding="utf-8"))
            meta["confidence"]["layout"] = "medium"
            (template / "meta.yaml").write_text(yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
            result = validate_paths([root], ROOT, index=root / "INDEX.md")
            payload = result.to_dict()
            self.assertEqual(0, payload["exit_code"], payload["findings"])
            self.assertEqual("style-only", payload["templates"][0]["fidelity"]["conformance"])
            self.assertNotEqual("legacy-baseline", payload["templates"][0]["fidelity"]["conformance"])

    def test_unknown_profile_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "templates"
            shutil.copytree(STRUCTURAL / "templates", root)
            shutil.copyfile(ROOT / "tests/fixtures/fidelity/unknown-profile.yaml", root / "structural-template/fidelity.yaml")
            result = validate_paths([root], ROOT)
            codes = {finding.code for finding in result.findings}
            self.assertTrue(result.failed)
            self.assertTrue({"FIDELITY_PROFILE_UNSUPPORTED", "FIDELITY_SCHEMA_INVALID"} & codes)

    def test_canonicalizer_ignores_description_and_line_noise(self) -> None:
        data = load_fidelity(STRUCTURAL / "templates/structural-template/fidelity.yaml")
        noisy = json.loads(json.dumps(data))
        noisy["layout_scenes"][0]["description"] = "prose that must not change identity"
        noisy["layout_scenes"][0]["provenance"]["locator"]["line"] = 99
        noisy["layout_scenes"] = list(reversed(noisy["layout_scenes"]))
        self.assertEqual(canonical_digest(data), canonical_digest(noisy))
        changed = json.loads(json.dumps(data))
        changed["layout_scenes"][1]["wrap"] = "wrap"
        self.assertNotEqual(canonical_digest(data), canonical_digest(changed))

    def test_geometry_and_state_mutations_fail(self) -> None:
        cases = [
            ("padding_block_start", "FIDELITY_GEOMETRY_INCOMPLETE"),
            ("text_decoration", "FIDELITY_STATE_CONFLICT"),
            ("scroll_owner", "FIDELITY_SCROLL_OWNER_NOT_UNIQUE"),
            ("dangling_token", "FIDELITY_TOKEN_DANGLING"),
            ("engineering", "FIDELITY_ENGINEERING_CONTENT"),
        ]
        data = yaml.safe_load((STRUCTURAL / "templates/structural-template/fidelity.yaml").read_text(encoding="utf-8"))
        for kind, expected in cases:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temp:
                root = Path(temp) / "templates"
                shutil.copytree(STRUCTURAL / "templates", root)
                mutated = json.loads(json.dumps(data))
                if kind == "padding_block_start":
                    del mutated["component_geometry"][0]["properties"]["padding_block_start"]
                elif kind == "text_decoration":
                    extra = json.loads(json.dumps(mutated["state_presentations"][0]))
                    extra["id"] = "state.link.navigation-link.hover.item.conflict"
                    extra["text_decoration"] = "underline"
                    extra["negative_facts"] = []
                    mutated["state_presentations"].append(extra)
                elif kind == "scroll_owner":
                    mutated["layout_scenes"][1]["scroll_domains"].append({
                        "id": "scroll.board.inline", "axis": "inline", "owner": "region.board.root", "nested_in": None,
                    })
                elif kind == "dangling_token":
                    mutated["component_geometry"][0]["properties"]["gap"] = {"kind": "token-ref", "value": "spacing.missing.token"}
                else:
                    mutated["layout_scenes"][0]["arrangement"] = "horizontal"
                    mutated["component_geometry"][0]["properties"]["surface"] = {"kind": "semantic", "value": "none"}
                    mutated["layout_scenes"][0]["id"] = "scene.shell"
                    mutated["unresolved"] = []
                    mutated["layout_scenes"][0]["regions"][0]["role"] = "flex"
                    mutated["layout_scenes"][0]["description"] = "Tailwind flex px-4 React import"
                path = root / "structural-template/fidelity.yaml"
                path.write_text(yaml.safe_dump(mutated, sort_keys=False, allow_unicode=True), encoding="utf-8")
                result = validate_paths([root], ROOT)
                self.assertTrue(result.failed)
                self.assertTrue(
                    any(finding.code == expected for finding in result.findings),
                    [finding.to_dict() for finding in result.findings],
                )

    def test_example_path_is_rejected_without_opening_content(self) -> None:
        result = validate_paths([Path("example") / "workbench-shell" / "web-v3"], ROOT)
        self.assertTrue(result.failed)
        self.assertEqual("EXAMPLE_PATH_IN_SCOPE", result.findings[0].code)
        self.assertEqual(["example/**"], result.to_dict()["discovery"]["exclusions"])

    def test_capture_to_profile_replay_and_reproducibility(self) -> None:
        helper = RepoCaptureTests()
        with tempfile.TemporaryDirectory() as temp:
            source, request_path, revision = helper.materialize(temp)
            first = capture_from_files(request_path, source)
            second = capture_from_files(request_path, source)
            profile = facts_to_fidelity(first)
            again = facts_to_fidelity(second)
            self.assertEqual(canonical_digest(profile), canonical_digest(again))
            self.assertEqual("structural", profile["conformance"])
            self.assertFalse(profile["unresolved"])

            def rewrite_source(document: dict) -> dict:
                payload = json.loads(json.dumps(document))
                for collection in ("layout_scenes", "component_geometry", "state_presentations"):
                    for record in payload.get(collection) or []:
                        if isinstance(record, dict) and isinstance(record.get("provenance"), dict):
                            record["provenance"]["source_id"] = "source-001"
                return payload

            profile = rewrite_source(profile)
            root = Path(temp) / "templates"
            shutil.copytree(STRUCTURAL / "templates", root)
            template = root / "structural-template"
            meta = yaml.safe_load((template / "meta.yaml").read_text(encoding="utf-8"))
            meta["sources"][0]["revision"] = revision
            (template / "meta.yaml").write_text(yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
            evidence = yaml.safe_load((template / "evidence.yaml").read_text(encoding="utf-8"))
            for entry in evidence["entries"]:
                entry["source_revision"] = revision
            (template / "evidence.yaml").write_text(yaml.safe_dump(evidence, sort_keys=False, allow_unicode=True), encoding="utf-8")
            (template / "fidelity.yaml").write_text(yaml.safe_dump(profile, sort_keys=False, allow_unicode=True), encoding="utf-8")
            result = validate_paths(
                [root],
                ROOT,
                index=root / "INDEX.md",
                source_roots={"source-001": source},
                require_source_replay=True,
                capture_receipt=first,
            )
            payload = result.to_dict()
            self.assertEqual(0, payload["exit_code"], payload["findings"])
            replay = payload["templates"][0]["fidelity"]["replay"]
            self.assertEqual("passed", replay["status"])
            self.assertEqual(replay["declared"], replay["resolved"])
            self.assertEqual(replay["resolved"], replay["executed"])
            self.assertEqual(replay["executed"], replay["passed"])
            self.assertGreater(replay["declared"], 0)

            laundered = json.loads(json.dumps(profile))
            laundered["layout_scenes"][0]["provenance"]["locator"]["path"] = "fidelity.yaml"
            (template / "fidelity.yaml").write_text(yaml.safe_dump(laundered, sort_keys=False, allow_unicode=True), encoding="utf-8")
            failed = validate_paths(
                [root], ROOT, source_roots={"source-001": source}, require_source_replay=True, capture_receipt=first,
            )
            self.assertTrue(failed.failed)
            self.assertTrue({finding.code for finding in failed.findings} & {"FIDELITY_SOURCE_REPLAY_FAILED", "STRUCTURAL_REPLAY_REQUIRED", "SOURCE_BOUNDARY"})

    def test_apply_projection_ids_are_stable_across_dom_shapes(self) -> None:
        data = load_fidelity(STRUCTURAL / "templates/structural-template/fidelity.yaml")
        layout = project_layout(data)
        geometry = project_geometry_state(data)
        scenarios = derive_scenario_ids(data)
        self.assertTrue(any(item.startswith("scroll:scene.board:") for item in layout))
        self.assertTrue(any("scroll:scene.master-detail:scroll.master-detail.master" in item for item in layout))
        self.assertTrue(any("scroll:scene.master-detail:scroll.master-detail.detail" in item for item in layout))
        self.assertTrue(any("padding_block_start" in item for item in geometry))
        self.assertTrue(any("navigation-link" in item and "text_decoration:none" in item for item in geometry))
        self.assertTrue(any("button-link" in item and "underline" in item for item in geometry))
        self.assertEqual(layout, project_layout(canonicalize(data)))
        self.assertEqual(scenarios, derive_scenario_ids(canonicalize(data)))
        self.assertTrue(all(item.startswith("phase8:") for item in scenarios))
        self.assertIsNone(facet_change_phase(data, data))
        mutated = json.loads(json.dumps(data))
        mutated["state_presentations"][0]["text_decoration"] = "underline"
        self.assertEqual(4, facet_change_phase(data, mutated))
        layout_changed = json.loads(json.dumps(data))
        layout_changed["layout_scenes"][1]["wrap"] = "wrap"
        self.assertEqual(2, facet_change_phase(data, layout_changed))
        chrome_changed = json.loads(json.dumps(data))
        chrome_changed["layout_scenes"][0]["shell_variant"] = "flush"
        self.assertEqual(2, facet_change_phase(data, chrome_changed))
        swapped = json.loads(json.dumps(data))
        swapped["layout_scenes"][0]["slots"][0]["order"] = 2
        swapped["layout_scenes"][0]["slots"][2]["order"] = 0
        self.assertEqual(2, facet_change_phase(data, swapped))
        misanchored = json.loads(json.dumps(data))
        misanchored["layout_scenes"][0]["chrome_anchors"][0]["region"] = "region.shell.canvas"
        self.assertEqual(2, facet_change_phase(data, misanchored))
        self.assertTrue(any(item.startswith("shell_variant:scene.shell:inset") for item in layout))
        self.assertTrue(any(item == "slot:workspace-switcher:0" for item in layout))
        self.assertTrue(any(item.startswith("anchor:header-trigger→") for item in layout))
        self.assertTrue(any(item.startswith("phase8:shell_variant:") for item in scenarios))
        style_only = load_fidelity(ROOT / "tests/fixtures/fidelity/style-only.yaml")
        self.assertFalse(any(item.startswith("shell_variant:") for item in project_layout(style_only)))
        self.assertEqual([], derive_scenario_ids(style_only))

    def test_chrome_mutations_and_layout_high_without_sidecar(self) -> None:
        data = yaml.safe_load((STRUCTURAL / "templates/structural-template/fidelity.yaml").read_text(encoding="utf-8"))
        cases = [
            ("missing-variant", "CHROME_COMPOSITION_INCOMPLETE"),
            ("duplicate-order", "CHROME_COMPOSITION_INCOMPLETE"),
            ("missing-anchor", "CHROME_COMPOSITION_INCOMPLETE"),
            ("evasion", "CHROME_COMPOSITION_INCOMPLETE"),
            ("layout-high", "LAYOUT_CONFIDENCE_WITHOUT_CHROME"),
        ]
        for kind, expected in cases:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temp:
                root = Path(temp) / "templates"
                shutil.copytree(STRUCTURAL / "templates", root)
                template = root / "structural-template"
                if kind == "layout-high":
                    (template / "fidelity.yaml").unlink()
                    spec = template / "spec.md"
                    spec.write_text(spec.read_text(encoding="utf-8").replace("[fidelity.yaml](fidelity.yaml)", "core v2 files"), encoding="utf-8")
                else:
                    mutated = json.loads(json.dumps(data))
                    if kind == "missing-variant":
                        mutated["layout_scenes"][0].pop("shell_variant", None)
                    elif kind == "duplicate-order":
                        mutated["layout_scenes"][0]["slots"][0]["order"] = 0
                        mutated["layout_scenes"][0]["slots"][1]["order"] = 0
                    elif kind == "missing-anchor":
                        mutated["layout_scenes"][0]["chrome_anchors"] = [
                            item for item in mutated["layout_scenes"][0]["chrome_anchors"]
                            if item.get("role") != "header-trigger"
                        ]
                    else:
                        mutated["layout_scenes"][0]["scene_kind"] = "other"
                    (template / "fidelity.yaml").write_text(yaml.safe_dump(mutated, sort_keys=False, allow_unicode=True), encoding="utf-8")
                result = validate_paths([root], ROOT)
                self.assertTrue(result.failed)
                self.assertTrue(
                    any(finding.code == expected for finding in result.findings),
                    [finding.to_dict() for finding in result.findings],
                )

    def test_workbench_stays_legacy_baseline_without_source_root(self) -> None:
        result = validate_paths([ROOT / "templates/workbench-shell"], ROOT, index=ROOT / "templates/INDEX.md")
        payload = result.to_dict()
        self.assertEqual(0, payload["exit_code"], payload["findings"])
        self.assertFalse((ROOT / "templates/workbench-shell/fidelity.yaml").exists())
        self.assertEqual("legacy-baseline", payload["templates"][0]["fidelity"]["conformance"])
        self.assertEqual(
            "medium",
            yaml.safe_load((ROOT / "templates/workbench-shell/meta.yaml").read_text(encoding="utf-8"))["confidence"]["layout"],
        )
        self.assertEqual("not-run", payload["templates"][0]["fidelity"]["replay"]["status"])
        self.assertNotIn("请提供本地绝对路径", json.dumps(payload, ensure_ascii=False))

    def test_classify_helpers(self) -> None:
        self.assertEqual("legacy-baseline", classify_sidecar(None, present=False))
        self.assertEqual("unknown", classify_sidecar({"schema_version": 1, "profile": "other"}, present=True))


if __name__ == "__main__":
    unittest.main()
