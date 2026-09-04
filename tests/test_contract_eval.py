from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/run_contract_evals.py"
sys.path.insert(0, str(ROOT / "scripts"))

from contract_eval.runner import junit, run  # noqa: E402


class ContractEvalTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        files = [
            "skills/ui-template/SKILL.md",
            "skills/ui-template/evals/cases.yaml",
            "skills/ui-template-apply/SKILL.md",
            "skills/ui-template-apply/evals/cases.yaml",
            "scripts/check_template_apply_state.py",
            "scripts/contract_eval/runner.py",
            "tests/fixtures/eval/script-contracts.yaml",
            "tests/fixtures/eval/llm-contracts.yaml",
            "governance/eval/deterministic-baseline.json",
        ]
        files.extend(
            str(path.relative_to(ROOT))
            for directory in (ROOT / "schemas/eval", ROOT / "schemas/template/v2")
            for path in directory.glob("*.json")
        )
        files.extend(
            str(path.relative_to(ROOT))
            for directory in (ROOT / "skills/ui-template/references", ROOT / "skills/ui-template-apply/references")
            for path in directory.glob("*.md")
        )
        for relative in files:
            source = ROOT / relative
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)

    def cli(self, *args: str) -> tuple[subprocess.CompletedProcess[str], dict]:
        extra = args
        if "--cases" not in args:
            extra = (
                "--cases", "skills/ui-template/evals/cases.yaml",
                "--cases", "skills/ui-template-apply/evals/cases.yaml",
                *args,
            )
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(self.root), *extra],
            text=True,
            capture_output=True,
            check=False,
        )
        return proc, json.loads(proc.stdout)

    def rewrite_all_script_hashes(self) -> str:
        fixture = self.root / "tests/fixtures/eval/script-contracts.yaml"
        digest = hashlib.sha256(fixture.read_bytes()).hexdigest()
        for relative in (
            "skills/ui-template/evals/cases.yaml",
            "skills/ui-template-apply/evals/cases.yaml",
        ):
            path = self.root / relative
            text = path.read_text(encoding="utf-8")
            document = yaml.safe_load(text)
            old_hashes = {case["fixture_sha256"] for case in document["cases"] if case["judge"] == "script"}
            self.assertEqual(1, len(old_hashes))
            path.write_text(text.replace(old_hashes.pop(), digest), encoding="utf-8")
        return digest

    def test_case_and_result_schemas_cover_all_current_cases(self) -> None:
        from contract_eval.runner import DEFAULT_CASES, LEGACY_CASES

        case_schema = json.loads((ROOT / "schemas/eval/case.schema.json").read_text(encoding="utf-8"))
        expected_ids = {
            "authoring-updates-index", "no-apply-handoff-after-authoring", "estimated-values-labeled",
            "existing-template-ask-update-or-new", "tokens-yaml-required-and-complete",
            "authoring-normalizes-and-fills-defaults", "no-engineering-structure-in-template",
            "doc-source-routed-correctly", "authoring-out-of-scope-rejected",
            "apply-requires-reference-reading", "no-apply-without-template", "no-phase-skipping",
            "browser-verification-evidence", "spec-wins-over-apply", "routing-semantics-enforced",
            "apply-token-freeze", "apply-out-of-scope-rejected",
            "fidelity-portable-structural", "fidelity-legacy-baseline", "fidelity-unknown-fail-closed",
            "fidelity-canonical-stable", "fidelity-negative-mutations", "fidelity-capture-reproducibility",
            "fidelity-example-exclusion", "apply-fidelity-projections", "apply-fidelity-facet-recovery",
        }
        actual_ids: set[str] = set()
        judges: dict[str, int] = {"script": 0, "llm": 0}
        for relative in DEFAULT_CASES:
            document = yaml.safe_load((ROOT / relative).read_text(encoding="utf-8"))
            errors = list(Draft202012Validator(case_schema).iter_errors(document))
            self.assertEqual([], errors)
            for case in document["cases"]:
                self.assertTrue(case["given"])
                self.assertTrue(case["expect"]["must"])
                self.assertIn("must_not", case["expect"])
                self.assertNotIn(case["id"], actual_ids)
                actual_ids.add(case["id"])
                judges[case["judge"]] += 1
        self.assertEqual(expected_ids, actual_ids)
        self.assertEqual({"script": 24, "llm": 2}, judges)
        self.assertEqual(
            {
                "skills/ui-template/evals/cases.yaml",
                "skills/ui-template-apply/evals/cases.yaml",
            },
            set(LEGACY_CASES),
        )
        for name in ("result.schema.json", "llm-judge-result.schema.json"):
            Draft202012Validator.check_schema(json.loads((ROOT / "schemas/eval" / name).read_text(encoding="utf-8")))

    def test_happy_path_is_stable_and_matches_locked_baseline(self) -> None:
        first = run(ROOT)
        second = run(ROOT)
        self.assertEqual("passed", first["status"])
        self.assertEqual({"declared": 26, "parsed": 26, "executed": 26, "script": 24, "llm": 2}, first["counts"])
        self.assertEqual("matched", first["baseline"]["status"])
        self.assertEqual({"added": [], "removed": [], "changed": []}, first["baseline"]["diff"])
        self.assertEqual(first, second)
        self.assertEqual(junit(first), junit(second))
        self.assertIn("<testsuite", junit(first))
        self.assertEqual(2, sum(item["status"] == "asset-valid" for item in first["results"]))
        self.assertTrue(first["discovery"]["example_excluded"])
        self.assertIn("example/**", first["discovery"]["exclusions"])
        self.assertFalse(any(item.startswith("example/") for item in first["discovery"]["inputs"]))

    def test_injected_script_failure_returns_nonzero(self) -> None:
        fixture = self.root / "tests/fixtures/eval/script-contracts.yaml"
        text = fixture.read_text(encoding="utf-8").replace("templates/INDEX.md", "templates/DOES-NOT-EXIST.md", 1)
        fixture.write_text(text, encoding="utf-8")
        self.rewrite_all_script_hashes()
        proc, report = self.cli("--no-baseline")
        self.assertNotEqual(0, proc.returncode)
        self.assertEqual("failed", report["status"])
        self.assertIn("JUDGE_FAILURE authoring-updates-index", report["failures"])

    def test_injected_fixture_hash_mismatch_returns_nonzero(self) -> None:
        fixture = self.root / "tests/fixtures/eval/script-contracts.yaml"
        fixture.write_text(fixture.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        proc, report = self.cli("--no-baseline")
        self.assertNotEqual(0, proc.returncode)
        self.assertEqual("failed", report["status"])
        self.assertTrue(any(item.startswith("FIXTURE_HASH_MISMATCH") for item in report["failures"]))

    def test_injected_llm_result_count_mismatch_returns_nonzero(self) -> None:
        adapter = {
            "schema_version": 1,
            "revision": "harden-template-lifecycle-eval-v1",
            "runtime_fingerprint": "sha256:" + "0" * 64,
            "authorization": {"external_data_authorized": True, "scope": "fixed-eval-fixtures-only"},
            "results": [
                {"id": "estimated-values-labeled", "status": "passed", "rationale": "固定 rubric 全部满足"}
            ],
        }
        (self.root / "llm-results.json").write_text(json.dumps(adapter), encoding="utf-8")
        proc, report = self.cli("--no-baseline", "--llm-results", "llm-results.json")
        self.assertNotEqual(0, proc.returncode)
        self.assertEqual("failed", report["status"])
        self.assertTrue(any(item.startswith("LLM_RESULT_COUNT_MISMATCH") for item in report["failures"]))

    def test_parse_failure_and_global_duplicate_id_return_nonzero(self) -> None:
        authoring = self.root / "skills/ui-template/evals/cases.yaml"
        authoring.write_text(authoring.read_text(encoding="utf-8").replace("judge: script", "judge: invalid", 1), encoding="utf-8")
        proc, report = self.cli("--no-baseline")
        self.assertNotEqual(0, proc.returncode)
        self.assertTrue(any(item.startswith("EVAL_PARSE_FAILURE") for item in report["failures"]))
        self.assertNotEqual(report["counts"]["declared"], report["counts"]["parsed"])

        shutil.copy2(ROOT / "skills/ui-template/evals/cases.yaml", authoring)
        apply_cases = self.root / "skills/ui-template-apply/evals/cases.yaml"
        apply_cases.write_text(
            apply_cases.read_text(encoding="utf-8").replace(
                "id: apply-requires-reference-reading", "id: authoring-updates-index", 1,
            ),
            encoding="utf-8",
        )
        proc, report = self.cli("--no-baseline")
        self.assertNotEqual(0, proc.returncode)
        self.assertTrue(any(item.startswith("EVAL_DUPLICATE_ID") for item in report["failures"]))

    def test_runner_never_discovers_history_or_example_paths(self) -> None:
        source = (ROOT / "scripts/contract_eval/runner.py").read_text(encoding="utf-8")
        self.assertNotIn("patches", source)
        self.assertNotIn("experience", source)
        self.assertNotIn("web-v2", source)
        self.assertEqual(
            {
                "skills/ui-template/evals/cases.yaml",
                "skills/ui-template/evals/fidelity-cases.yaml",
                "skills/ui-template-apply/evals/cases.yaml",
                "skills/ui-template-apply/evals/fidelity-cases.yaml",
            },
            set(__import__("contract_eval.runner", fromlist=["DEFAULT_CASES"]).DEFAULT_CASES),
        )


if __name__ == "__main__":
    unittest.main()
