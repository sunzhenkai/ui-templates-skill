from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_authoring.capture import CaptureError, capture_from_files, load_document, replay, write_source_graph_skeleton
from template_authoring.gate import run_authoring_gate

FIXTURE = ROOT / "tests/fixtures/repo-capture"
FIXED_REVISION = "58397b5ae6c0fb56d75c21d790a0643595c743ac"
FIXED_CLOSURE_DIGEST = "sha256:84b6ea77c0ad95eb3fac81c8e57c7d5bff28c394283bb1b631c58c2918b7a879"


class RepoCaptureTests(unittest.TestCase):
    def materialize(self, temp: str, mutate=None, graph_format: str = "yaml") -> tuple[Path, Path, str]:
        source = Path(temp) / "source"
        shutil.copytree(FIXTURE / "source", source)
        graph_path = source / "ui-source-graph.yaml"
        if mutate is not None or graph_format == "json":
            graph = yaml.safe_load(graph_path.read_text(encoding="utf-8"))
            if mutate is not None:
                mutate(graph)
            if graph_format == "json":
                graph = json.loads(json.dumps(graph).replace("ui-source-graph.yaml", "ui-source-graph.json"))
                graph_path.unlink()
                graph_path = source / "ui-source-graph.json"
                graph_path.write_text(json.dumps(graph, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
            else:
                graph_path.write_text(yaml.safe_dump(graph, sort_keys=False, allow_unicode=True), encoding="utf-8")
        subprocess.run(["git", "init", "-q"], cwd=source, check=True)
        subprocess.run(["git", "config", "user.name", "UI Fixture"], cwd=source, check=True)
        subprocess.run(["git", "config", "user.email", "fixture@example.invalid"], cwd=source, check=True)
        subprocess.run(["git", "add", graph_path.name], cwd=source, check=True)
        env = dict(os.environ)
        env.update({"GIT_AUTHOR_DATE": "2026-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-01-01T00:00:00Z"})
        subprocess.run(["git", "commit", "-q", "-m", "fixed literal graph fixture"], cwd=source, check=True, env=env)
        revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=source, check=True, text=True, capture_output=True).stdout.strip()
        request = yaml.safe_load((FIXTURE / "capture-request.yaml").read_text(encoding="utf-8"))
        request["source_revision"] = revision
        request["graph_path"] = graph_path.name
        request_path = Path(temp) / "capture-request.yaml"
        request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
        return source, request_path, revision

    def test_fixed_revision_repeat_capture_and_source_replay(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            source, request_path, revision = self.materialize(temp)
            self.assertEqual(FIXED_REVISION, revision)
            first = capture_from_files(request_path, source)
            second = capture_from_files(request_path, source)
            self.assertEqual("captured", first["status"])
            self.assertEqual(first, second)
            self.assertEqual(FIXED_CLOSURE_DIGEST, first["closure_digest"])
            self.assertEqual(first["closure_digest"], second["closure_digest"])
            self.assertFalse(first["unresolved"])
            self.assertGreaterEqual(first["summary"]["definitions"], 12)
            self.assertEqual(10, first["summary"]["usages"])
            self.assertEqual(5, first["summary"]["negative_facts"])
            identities = [(item["id"], item["status"]) for item in first["facts"]]
            self.assertEqual(identities, [(item["id"], item["status"]) for item in second["facts"]])
            replayed = replay(load_document(request_path), source, first)
            self.assertEqual({"declared": 1, "resolved": 1, "executed": 1, "passed": 1}, {key: replayed[key] for key in ("declared", "resolved", "executed", "passed")})
            self.assertEqual("passed", replayed["status"])

            graph_path = source / "ui-source-graph.yaml"
            graph_path.write_text(graph_path.read_text(encoding="utf-8").replace("underline", "visible", 1), encoding="utf-8")
            changed = replay(load_document(request_path), source, first)
            self.assertEqual("failed", changed["status"])
            self.assertEqual("SOURCE_GRAPH_NOT_AT_REVISION", changed["error"]["code"])
            self.assertEqual(0, changed["executed"])

    def test_dynamic_ambiguity_and_limit_are_unresolved_without_sampling(self) -> None:
        def dynamic(graph):
            graph["dynamic"].append({
                "id": "dynamic.board", "locator": "ui-source-graph.yaml#/dynamic/dynamic.board",
                "reason": "runtime-expression", "scene": "board", "component": None, "context": None,
            })

        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp, dynamic)
            result = capture_from_files(request_path, source)
            self.assertEqual("unresolved", result["status"])
            self.assertIn("dynamic-source", {item["code"] for item in result["unresolved"]})

        def ambiguous(graph):
            graph["definitions"].append({
                "id": "theme.alt", "kind": "theme", "name": "alt",
                "locator": "ui-source-graph.yaml#/definitions/theme.alt", "exports": ["theme-alt"], "facts": [],
            })
            graph["canonical_candidates"]["themes"].append("theme.alt")

        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp, ambiguous)
            request = yaml.safe_load(request_path.read_text(encoding="utf-8"))
            request["decisions"]["theme_id"] = None
            request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
            result = capture_from_files(request_path, source)
            self.assertEqual("unresolved", result["status"])
            self.assertIn("ambiguous-theme", {item["code"] for item in result["unresolved"]})

        def ambiguous_definition(graph):
            graph["definitions"].append({
                "id": "component.dialog.alt", "kind": "component", "name": "dialog",
                "locator": "ui-source-graph.yaml#/definitions/component.dialog.alt", "exports": ["dialog-alt"], "facts": [],
            })

        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp, ambiguous_definition)
            result = capture_from_files(request_path, source)
            self.assertEqual("unresolved", result["status"])
            self.assertIn("ambiguous-definition", {item["code"] for item in result["unresolved"]})

        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp)
            request = yaml.safe_load(request_path.read_text(encoding="utf-8"))
            request["limits"]["max_usages"] = 1
            request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
            result = capture_from_files(request_path, source)
            self.assertEqual("unresolved", result["status"])
            self.assertEqual([], result["closure"]["usages"])
            self.assertEqual("limit-exceeded", result["unresolved"][0]["code"])

    def test_closed_json_graph_is_supported(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp, graph_format="json")
            result = capture_from_files(request_path, source)
            self.assertEqual("captured", result["status"])
            self.assertEqual("ui-source-graph.json", result["request"]["graph_path"])
            self.assertFalse(result["unresolved"])

    def test_only_closed_literal_graphs_are_supported(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp)
            request = yaml.safe_load(request_path.read_text(encoding="utf-8"))
            request["graph_path"] = "src/view.tsx"
            request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
            with self.assertRaises(CaptureError) as raised:
                capture_from_files(request_path, source)
            self.assertEqual("UNSUPPORTED_SOURCE_FORMAT", raised.exception.code)

    def test_shell_usage_without_chrome_facts_does_not_complete(self) -> None:
        def drop_chrome(graph):
            usage = next(item for item in graph["usages"] if item["id"] == "usage.shell")
            usage["facts"] = [item for item in usage["facts"] if item["property"] in {"root_scroll", "arrangement"}]

        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp, drop_chrome)
            with self.assertRaises(CaptureError) as raised:
                capture_from_files(request_path, source)
            self.assertEqual("CHROME_COMPOSITION_INCOMPLETE", raised.exception.code)

    def test_missing_graph_stays_unsupported_or_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp)
            request = yaml.safe_load(request_path.read_text(encoding="utf-8"))
            request["graph_path"] = "missing-graph.yaml"
            request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
            with self.assertRaises(CaptureError) as raised:
                capture_from_files(request_path, source)
            self.assertEqual("SOURCE_GRAPH_MISSING", raised.exception.code)

    def test_source_graph_skeleton_has_empty_facts_and_is_incomplete(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "ui-source-graph.yaml"
            written = write_source_graph_skeleton(path)
            graph = yaml.safe_load(written.read_text(encoding="utf-8"))
            self.assertFalse(graph["closure_complete"])
            self.assertEqual([], graph["usages"][0]["facts"])
            command = [
                sys.executable, str(ROOT / "scripts/capture_repo_fidelity.py"),
                "--init-source-graph", str(Path(temp) / "skeleton.yaml"),
            ]
            completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(0, completed.returncode, completed.stderr)
            payload = json.loads(completed.stdout)
            self.assertEqual("skeleton", payload["status"])
            self.assertFalse(payload["parses_source"])
            self.assertFalse(payload["closure_complete"])

    def _fake_tools(self, directory: Path, replay_status: str = "passed") -> tuple[Path, Path]:
        validator = directory / "validator.py"
        replay_counts = {"status": replay_status, "declared": 5, "resolved": 5, "executed": 5 if replay_status == "passed" else 0, "passed": 5 if replay_status == "passed" else 0, "identity": "sha256:replay"}
        validator_payload = {
            "exit_code": 0,
            "templates": [{"name": "candidate", "fidelity": {
                "schema_version": 1, "profile": "repo-structural-v1", "conformance": "structural",
                "scope": {"scenes": ["shell"]}, "canonical_digest": "sha256:profile",
                "unresolved": [], "replay": replay_counts,
            }}],
        }
        validator.write_text("import json\nprint(json.dumps(" + repr(validator_payload) + "))\n", encoding="utf-8")
        eval_runner = directory / "eval.py"
        eval_payload = {
            "schema_version": 1, "runner_version": "1.0.0", "revision": "fixture",
            "runtime_fingerprint": "sha256:runtime", "status": "passed",
            "counts": {"declared": 3, "parsed": 3, "executed": 3, "script": 3, "llm": 0},
        }
        eval_runner.write_text("import json\nprint(json.dumps(" + repr(eval_payload) + "))\n", encoding="utf-8")
        return validator, eval_runner

    def test_staging_gate_promotes_only_after_reproducibility_replay_and_eval(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            source, request_path, _ = self.materialize(temp)
            validator, eval_runner = self._fake_tools(base)
            candidate_template = base / "staging/template"
            candidate_template.mkdir(parents=True)
            candidate_index = base / "staging/INDEX.md"
            candidate_index.write_text("candidate index\n", encoding="utf-8")
            production_index = base / "production/INDEX.md"
            production_index.parent.mkdir()
            production_index.write_text("production index\n", encoding="utf-8")
            report = run_authoring_gate(
                request_path=request_path, source_root=source, candidate_template=candidate_template,
                candidate_index=candidate_index, production_index=production_index,
                validator=validator, eval_runner=eval_runner, receipt_out=base / "staging/capture-receipt.json",
                promote_index=True, cwd=ROOT,
            )
            self.assertEqual("passed", report["status"])
            self.assertEqual("sha256:profile", report["profile"]["canonical_digest"])
            self.assertEqual("sha256:replay", report["replay"]["identity"])
            self.assertEqual({"declared": 3, "parsed": 3, "executed": 3, "script": 3, "llm": 0}, report["eval"]["counts"])
            self.assertTrue(report["production_index"]["unchanged_during_gate"])
            self.assertTrue(report["production_index"]["promoted"])
            self.assertEqual("candidate index\n", production_index.read_text(encoding="utf-8"))

    def test_gate_cli_emits_machine_report_without_implicit_promotion(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            source, request_path, _ = self.materialize(temp)
            validator, eval_runner = self._fake_tools(base)
            candidate_template = base / "staging/template"
            candidate_template.mkdir(parents=True)
            candidate_index = base / "staging/INDEX.md"
            candidate_index.write_text("candidate index\n", encoding="utf-8")
            production_index = base / "production/INDEX.md"
            production_index.parent.mkdir()
            production_index.write_text("production index\n", encoding="utf-8")
            command = [
                sys.executable, str(ROOT / "scripts/run_authoring_gate.py"),
                "--request", str(request_path), "--source-root", str(source),
                "--candidate-template", str(candidate_template), "--candidate-index", str(candidate_index),
                "--production-index", str(production_index), "--validator", str(validator),
                "--eval-runner", str(eval_runner), "--receipt-out", str(base / "staging/receipt.json"),
                "--report-out", str(base / "staging/report.json"),
            ]
            completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(0, completed.returncode, completed.stderr)
            report = json.loads(completed.stdout)
            self.assertEqual("passed", report["status"])
            self.assertFalse(report["production_index"]["promoted"])
            self.assertEqual(report, json.loads((base / "staging/report.json").read_text(encoding="utf-8")))
            self.assertEqual("production index\n", production_index.read_text(encoding="utf-8"))

    def test_structural_replay_not_run_blocks_completion_and_keeps_index(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            source, request_path, _ = self.materialize(temp)
            validator, eval_runner = self._fake_tools(base, replay_status="not-run")
            candidate_template = base / "staging/template"
            candidate_template.mkdir(parents=True)
            candidate_index = base / "staging/INDEX.md"
            candidate_index.write_text("candidate index\n", encoding="utf-8")
            production_index = base / "production/INDEX.md"
            production_index.parent.mkdir()
            production_index.write_text("production index\n", encoding="utf-8")
            report = run_authoring_gate(
                request_path=request_path, source_root=source, candidate_template=candidate_template,
                candidate_index=candidate_index, production_index=production_index,
                validator=validator, eval_runner=eval_runner, receipt_out=base / "staging/capture-receipt.json",
                promote_index=True, cwd=ROOT,
            )
            self.assertEqual("failed", report["status"])
            self.assertIn("STRUCTURAL_REPLAY_REQUIRED", {item["code"] for item in report["issues"]})
            self.assertFalse(report["production_index"]["promoted"])
            self.assertEqual(report["production_index"]["before_digest"], report["production_index"]["after_digest"])
            self.assertEqual("production index\n", production_index.read_text(encoding="utf-8"))

    def test_capture_cli_is_deterministic_and_style_only_is_explicit(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            source, request_path, _ = self.materialize(temp)
            command = [
                sys.executable, str(ROOT / "scripts/capture_repo_fidelity.py"), str(request_path),
                "--source-root", str(source),
            ]
            first = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
            second = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(0, first.returncode, first.stderr)
            self.assertEqual(first.stdout, second.stdout)
            self.assertEqual("captured", json.loads(first.stdout)["status"])

            request = yaml.safe_load(request_path.read_text(encoding="utf-8"))
            request["conformance"] = "style-only"
            request["style_only_reason"] = "用户明确只提取视觉语言"
            request_path.write_text(yaml.safe_dump(request, sort_keys=False, allow_unicode=True), encoding="utf-8")
            receipt = capture_from_files(request_path, source)
            self.assertEqual("style-only", receipt["status"])
            self.assertEqual([], receipt["facts"])
            self.assertEqual("用户明确只提取视觉语言", receipt["style_only_reason"])

    def test_authoring_references_publish_authority_subset_and_report_contract(self) -> None:
        skill = (ROOT / "skills/ui-template-author/SKILL.md").read_text(encoding="utf-8")
        source = (ROOT / "skills/ui-template-author/references/source-repo.md").read_text(encoding="utf-8")
        format_text = (ROOT / "skills/ui-template-author/references/spec-format.md").read_text(encoding="utf-8")
        report = (ROOT / "skills/ui-template-author/references/authoring-report.md").read_text(encoding="utf-8")
        capture_format = (ROOT / "skills/ui-template-author/references/repo-capture-format.md").read_text(encoding="utf-8")
        for required in ("layout_scenes", "component_geometry", "state_presentations", "Non-Goals", "legacy-baseline"):
            self.assertIn(required, format_text)
        for required in ("literal source graph", "不执行来源代码", "regex", "3–5 个代表组件", "limit-exceeded", "negative"):
            self.assertIn(required, source)
        for required in ("closure digest", "canonical digest", "declared = resolved = executed = passed", "production INDEX"):
            self.assertIn(required, skill)
        for required in ("repo-literal-graph-v1", "closed", "unsupported", "不访问网络"):
            self.assertIn(required, capture_format)
        for required in ("canonical_digest", "replay", "unresolved", "legacy-baseline", "style-only"):
            self.assertIn(required, report)

    def test_production_runtime_is_synchronized_without_mirror_write(self) -> None:
        pairs = (
            ("scripts/template_authoring/__init__.py", "skills/ui-template-author/runtime/template_authoring/__init__.py"),
            ("scripts/template_authoring/chrome.py", "skills/ui-template-author/runtime/template_authoring/chrome.py"),
            ("scripts/template_authoring/capture.py", "skills/ui-template-author/runtime/template_authoring/capture.py"),
            ("scripts/template_authoring/profile.py", "skills/ui-template-author/runtime/template_authoring/profile.py"),
            ("scripts/template_authoring/gate.py", "skills/ui-template-author/runtime/template_authoring/gate.py"),
            ("scripts/capture_repo_fidelity.py", "skills/ui-template-author/runtime/capture_repo_fidelity.py"),
            ("scripts/run_authoring_gate.py", "skills/ui-template-author/runtime/run_authoring_gate.py"),
            ("scripts/template_validation/fidelity.py", "skills/ui-template-author/runtime/template_validation/fidelity.py"),
            ("scripts/template_validation/validator.py", "skills/ui-template-author/runtime/template_validation/validator.py"),
            ("scripts/template_apply_state/fidelity.py", "skills/ui-template-author/runtime/template_apply_state/fidelity.py"),
            ("scripts/contract_eval/runner.py", "skills/ui-template-author/runtime/contract_eval/runner.py"),
        )
        for source, runtime in pairs:
            with self.subTest(source=source):
                self.assertEqual((ROOT / source).read_bytes(), (ROOT / runtime).read_bytes())


if __name__ == "__main__":
    unittest.main()
