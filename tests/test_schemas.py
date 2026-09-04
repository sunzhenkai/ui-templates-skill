from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_validation.schema import SchemaStore
from template_validation.validator import TemplateValidator

FIXTURES = ROOT / "tests/fixtures/schema"


def mutate(document, dotted: str, value=...):
    parts = dotted.split(".")
    node = document
    for part in parts[:-1]:
        node = node[int(part)] if isinstance(node, list) else node[part]
    last = parts[-1]
    if value is ...:
        if isinstance(node, list):
            del node[int(last)]
        else:
            del node[last]
    elif isinstance(node, list):
        node[int(last)] = value
    else:
        node[last] = value


class SchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.store = SchemaStore(ROOT / "schemas/template/v2")
        cls.good = json.loads((FIXTURES / "good.json").read_text(encoding="utf-8"))
        cls.bad = json.loads((FIXTURES / "bad.json").read_text(encoding="utf-8"))

    def test_all_good_schema_fixtures_pass(self) -> None:
        for kind, data in self.good.items():
            with self.subTest(kind=kind):
                self.assertEqual(self.store.errors(kind, data), [])

    def test_bad_schema_fixtures_have_stable_paths(self) -> None:
        schema_cases = 0
        for case in self.bad:
            if "expected_path" not in case:
                continue
            schema_cases += 1
            data = copy.deepcopy(self.good[case["base"]])
            if "set" in case:
                mutate(data, case["set"][0], case["set"][1])
            else:
                mutate(data, case["delete"])
            errors = self.store.errors(case["schema"], data)
            paths = [path for path, _message, _details in errors]
            with self.subTest(case=case["id"], paths=paths):
                self.assertTrue(errors)
                self.assertTrue(any(path.startswith(case["expected_path"]) or case["expected_path"].startswith(path) for path in paths))
        self.assertEqual(schema_cases, 14)

    def test_semantic_bad_fixtures_have_stable_codes(self) -> None:
        for case in self.bad:
            if "expected_semantic" not in case:
                continue
            data = copy.deepcopy(self.good[case["base"]])
            mutate(data, case["set"][0], case["set"][1])
            validator = TemplateValidator(ROOT)
            if case["schema"] == "meta":
                validator._check_meta_semantics(Path("fixture"), data)
            else:
                validator._check_feedback_transitions(Path("feedback.yaml"), data)
            codes = {finding.code for finding in validator.result.findings}
            with self.subTest(case=case["id"]):
                self.assertIn(case["expected_semantic"], codes)



    def test_legacy_schema_field_is_explicitly_unsupported(self) -> None:
        validator = TemplateValidator(ROOT)
        self.assertFalse(validator.schema_validate("tokens", Path("tokens.yaml"), {"schema": 1}))
        findings = validator.result.findings
        self.assertEqual(findings[0].code, "SCHEMA_VERSION_UNSUPPORTED")
        self.assertEqual(findings[0].details["declared"], 1)
    def test_compound_numeric_units_cannot_be_bypassed(self) -> None:
        tokens = copy.deepcopy(self.good["tokens"])
        del tokens["spacing"]["allowed"]["unit"]
        self.assertTrue(self.store.errors("tokens", tokens), "numeric list without unit must fail")

        tokens = copy.deepcopy(self.good["tokens"])
        tokens["typography"] = {
            "body": {"value": {"size": 14, "lineHeight": 20}, "origin": "source"}
        }
        self.assertTrue(self.store.errors("tokens", tokens), "numeric mapping members cannot be bare")

        tokens["typography"]["body"]["value"] = {
            "size": {"value": 14, "unit": "px"},
            "lineHeight": {"value": 1.25, "unit": "ratio"},
        }
        tokens["opacity"] = {"disabled": {"value": 0.5, "unit": "unitless", "origin": "default"}}
        self.assertEqual(self.store.errors("tokens", tokens), [])

    def test_checkpoint_requires_exact_ordered_phase_set(self) -> None:
        checkpoint = copy.deepcopy(self.good["checkpoint"])
        checkpoint["phases"] = [copy.deepcopy(checkpoint["phases"][0]) for _ in range(10)]
        errors = self.store.errors("checkpoint", checkpoint)
        self.assertTrue(errors)
        self.assertTrue(any(path.startswith("phases.1") for path, _message, _details in errors))

    def test_manifest_paths_are_safe_and_unique_by_path(self) -> None:
        for bad_path in (
            "skills/ui-template/../../outside.txt",
            "/skills/ui-template/SKILL.md",
            "skills\\ui-template\\SKILL.md",
            "skills/ui-template-manager/SKILL.md",
            "skills/ui-template/.internal",
        ):
            manifest = copy.deepcopy(self.good["skills-manifest"])
            manifest["files"][0]["path"] = bad_path
            with self.subTest(path=bad_path):
                self.assertTrue(self.store.errors("skills-manifest", manifest))
        manifest = copy.deepcopy(self.good["skills-manifest"])
        manifest["files"][1]["path"] = manifest["files"][0]["path"]
        manifest["files"][1]["sha256"] = "c" * 64
        errors = self.store.errors("skills-manifest", manifest)
        self.assertTrue(any(details["validator"] == "uniquePath" for _path, _message, details in errors))


if __name__ == "__main__":
    unittest.main()
