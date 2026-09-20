from __future__ import annotations

import copy
import json
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import yaml

from scripts.template_apply_state import (
    ApplyStateError,
    Finding,
    build_identity,
    canonical_digest,
    create_feedback,
    detect_architecture_site,
    feedback_receipt,
    merge_feedback,
    recover_checkpoint,
    recovery_decision,
    source_identity,
    validate_checkpoint,
    validate_feedback,
    validate_feedback_inbox,
    validate_verification,
)
from scripts.template_apply_state.state import PHASE_ARTIFACTS, artifact_value

NOW = "2026-09-03T16:00:00Z"


class ApplyStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / ".ui-template-apply"
        self.root.mkdir()
        (self.root / "evidence").mkdir()
        (self.root / "feedback").mkdir()
        self.template = {"schema_version": 2, "name": "demo", "template_version": "2.0.0", "rules": ["NN-001"]}
        self.tokens = {"schema_version": 2, "themes": {"light": {"background": {"value": "#ffffff", "origin": "source"}}}}
        self.scope = {"included": ["/"], "deferred": [], "excluded": []}
        self.source = "git:abc:dirty:none"
        self.build = "build:test-1"
        self.phase8_record_id = str(uuid.uuid4())
        self._write_artifacts()
        self.checkpoint = self._checkpoint()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _record(self, status: str, evidence: str) -> dict:
        return {
            "id": str(uuid.uuid4()), "rule_id": "NN-001", "status": status,
            "expected": "符合规则", "actual": "符合规则", "route": "/",
            "viewport": "desktop", "theme": "light", "state": "default",
            "evidence_refs": [evidence],
        }

    def _verification(self, kind: str) -> dict:
        evidence = "evidence/phase8.txt" if kind == "phase-8-verification" else "evidence/phase9.txt"
        record = self._record("passed" if kind == "phase-8-verification" else "recheck-passed", evidence)
        if kind == "phase-8-verification":
            record["id"] = self.phase8_record_id
            record["scenario_ids"] = ["phase8:demo:default"]
        else:
            record["phase8_record_id"] = self.phase8_record_id
        return {
            "schema_version": 2, "kind": kind,
            "template_digest": canonical_digest(self.template),
            "source_identity": self.source, "build_identity": self.build,
            "browser_identity": "Chromium 128",
            "records": [record],
            "created_at": NOW,
        }

    def _write_artifacts(self) -> None:
        for phase, paths in PHASE_ARTIFACTS.items():
            for relative in paths:
                path = self.root / relative
                if path.exists():
                    continue
                if relative == "08-verification.json":
                    path.write_text(json.dumps(self._verification("phase-8-verification")), encoding="utf-8")
                elif relative == "09-review.md":
                    front = yaml.safe_dump(self._verification("phase-9-review"), allow_unicode=True, sort_keys=False).strip()
                    path.write_text(f"---\n{front}\n---\n# Review\n", encoding="utf-8")
                elif relative == "00-architecture.yaml":
                    layers = {name: "confirmed-by-user" for name in (
                        "language", "ui_framework", "bundler", "routing", "styling", "state",
                        "data", "unit_test", "browser", "package_manager", "repo_shape",
                    )}
                    path.write_text(yaml.safe_dump({
                        "schema_version": 2,
                        "site": "greenfield",
                        "output_root": ".",
                        "confirmed_by_user": True,
                        "build_identity": self.build,
                        "layers": layers,
                    }, allow_unicode=True, sort_keys=False), encoding="utf-8")
                elif path.suffix == ".yaml":
                    path.write_text("schema_version: 2\nitems: []\n", encoding="utf-8")
                else:
                    path.write_text(f"# Phase {phase}\n", encoding="utf-8")
        (self.root / "evidence/phase8.txt").write_text("phase8", encoding="utf-8")
        (self.root / "evidence/phase9.txt").write_text("phase9", encoding="utf-8")
        (self.root / "evidence/a.json").write_text('{"evidence":"a"}\n', encoding="utf-8")
        (self.root / "evidence/b.json").write_text('{"evidence":"b"}\n', encoding="utf-8")

    def _checkpoint(self) -> dict:
        phases = []
        for phase in range(10):
            artifacts = []
            for relative in PHASE_ARTIFACTS[phase]:
                artifacts.append({"path": relative, "digest": canonical_digest(artifact_value(self.root / relative))})
            phases.append({"id": phase, "status": "complete", "artifacts": artifacts, "evidence_refs": []})
        return {
            "schema_version": 2,
            "template": {"name": "demo", "version": "2.0.0", "digest": canonical_digest(self.template)},
            "scope": self.scope, "tokens_digest": canonical_digest(self.tokens), "phases": phases,
            "source_identity": self.source, "build_identity": self.build, "updated_at": NOW,
        }

    def validate(self, **overrides):
        kwargs = dict(apply_root=self.root, template_value=self.template, tokens_value=self.tokens, scope=self.scope, source_identity=self.source, build_identity=self.build, known_rule_ids={"NN-001"})
        kwargs.update(overrides)
        return validate_checkpoint(self.checkpoint, **kwargs)

    def test_canonical_digest_ignores_mapping_and_yaml_format_order(self) -> None:
        self.assertEqual(canonical_digest({"b": 2, "a": [1]}), canonical_digest({"a": [1], "b": 2}))
        self.assertNotEqual(canonical_digest({"a": 1}), canonical_digest({"a": "1"}))

    def test_complete_checkpoint_validates_template_artifact_source_and_build(self) -> None:
        self.assertEqual([], self.validate())

    def test_checkpoint_rejects_forged_template_name_and_version_at_phase_zero(self) -> None:
        cases = (("name", "forged"), ("version", "9.9.9"))
        for field, value in cases:
            with self.subTest(field=field):
                checkpoint = copy.deepcopy(self.checkpoint)
                checkpoint["template"][field] = value
                findings = validate_checkpoint(
                    checkpoint,
                    apply_root=self.root,
                    template_value=self.template,
                    tokens_value=self.tokens,
                    scope=self.scope,
                    source_identity=self.source,
                    build_identity=self.build,
                    known_rule_ids={"NN-001"},
                )
                identity_findings = [
                    finding for finding in findings
                    if finding.code == "CHECKPOINT_TEMPLATE_IDENTITY_MISMATCH"
                ]
                self.assertEqual(1, len(identity_findings))
                self.assertEqual(0, identity_findings[0].phase)

    def test_checkpoint_rejects_oracle_identity_but_accepts_expectation_digest(self) -> None:
        def run(checkpoint: dict) -> set[str]:
            return {
                finding.code
                for finding in validate_checkpoint(
                    checkpoint,
                    apply_root=self.root,
                    template_value=self.template,
                    tokens_value=self.tokens,
                    scope=self.scope,
                    source_identity=self.source,
                    build_identity=self.build,
                    known_rule_ids={"NN-001"},
                )
            }

        leaked = copy.deepcopy(self.checkpoint)
        leaked["fidelity"] = {"status": "fidelity-unverified", "oracle_revision": "a" * 40}
        self.assertIn("SOURCE_BLIND_VIOLATION", run(leaked))

        allowed = copy.deepcopy(self.checkpoint)
        allowed["fidelity"] = {
            "status": "verified",
            "expectation_digest": {"algorithm": "sha256-canonical-json-v1", "value": "d" * 64},
            "expectation_ids": ["expectation-sidebar-width"],
            "comparisons": [
                {
                    "expectation_id": "expectation-sidebar-width",
                    "result": "passed",
                    "expected": "256px",
                    "actual": "256px",
                    "tolerance": "<=2px",
                }
            ],
        }
        self.assertNotIn("SOURCE_BLIND_VIOLATION", run(allowed))

    def test_recovery_reopens_earliest_scope_token_artifact_and_stale_evidence_phase(self) -> None:
        cases = [
            (dict(scope={"included": ["/new"], "deferred": [], "excluded": []}), 0),
            (dict(tokens_value={**self.tokens, "changed": {"value": 1, "unit": "px", "origin": "default"}}), 1),
            (dict(source_identity="git:def"), 8),
            (dict(build_identity="build:test-2"), 8),
        ]
        for overrides, expected in cases:
            with self.subTest(expected=expected):
                decision = recovery_decision(self.validate(**overrides), self.checkpoint)
                self.assertEqual(expected, decision["earliest_phase"])
                recovered = recover_checkpoint(self.checkpoint, decision)
                self.assertEqual("pending", recovered["phases"][expected]["status"])
        (self.root / "03-structure.md").unlink()
        self.assertEqual(3, recovery_decision(self.validate(), self.checkpoint)["earliest_phase"])

    def test_phase8_and_phase9_are_structured_and_current_build_bound(self) -> None:
        data = json.loads((self.root / "08-verification.json").read_text())
        data["records"][0]["status"] = "recheck-passed"
        (self.root / "08-verification.json").write_text(json.dumps(data), encoding="utf-8")
        self.checkpoint = self._checkpoint()
        codes = {finding.code for finding in self.validate()}
        self.assertIn("VERIFICATION_STATUS_INVALID", codes)
        data["records"][0]["status"] = "failed"
        (self.root / "08-verification.json").write_text(json.dumps(data), encoding="utf-8")
        self.checkpoint = self._checkpoint()
        self.checkpoint["phases"][9]["status"] = "pending"
        codes = {finding.code for finding in self.validate()}
        self.assertIn("VERIFICATION_GATE_FAILED", codes)

    def test_phase8_failed_is_closed_only_by_linked_valid_phase9_recheck(self) -> None:
        phase8 = json.loads((self.root / "08-verification.json").read_text(encoding="utf-8"))
        phase8["records"][0]["status"] = "failed"
        phase8["records"][0]["actual"] = "不符合规则"
        (self.root / "08-verification.json").write_text(json.dumps(phase8), encoding="utf-8")
        self.checkpoint = self._checkpoint()
        self.assertEqual([], self.validate())

        review_path = self.root / "09-review.md"
        review = self._verification("phase-9-review")
        review["records"][0]["phase8_record_id"] = str(uuid.uuid4())
        front = yaml.safe_dump(review, allow_unicode=True, sort_keys=False).strip()
        review_path.write_text(f"---\n{front}\n---\n# Review\n", encoding="utf-8")
        self.checkpoint = self._checkpoint()
        codes = {finding.code for finding in self.validate()}
        self.assertIn("VERIFICATION_RECHECK_DANGLING", codes)
        self.assertIn("VERIFICATION_GATE_FAILED", codes)

    def test_phase8_browser_identity_is_required_fail_closed(self) -> None:
        data = json.loads((self.root / "08-verification.json").read_text(encoding="utf-8"))
        del data["browser_identity"]
        codes = {
            finding.code
            for finding in validate_verification(
                data,
                path="08-verification.json",
                apply_root=self.root,
                expected_kind="phase-8-verification",
            )
        }
        self.assertIn("APPLY_SCHEMA_INVALID", codes)
        self.assertIn("VERIFICATION_BROWSER_IDENTITY_REQUIRED", codes)

    def test_feedback_uuid_and_normalized_fingerprint_merge_evidence(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        first = create_feedback(template=template, scenario="Icon-only   Control", suggestion="补充命名规则", scope="template-rule", targets=["AX-001"], evidence_refs=["evidence/a.json"], feedback_id=str(uuid.uuid4()), now=NOW)
        second = create_feedback(template=template, scenario="  ＩＣＯＮ－ＯＮＬＹ\nＣＯＮＴＲＯＬ  ", suggestion="同一建议", scope="template-rule", targets=["AX-001"], evidence_refs=["evidence/b.json"], feedback_id=str(uuid.uuid4()), now=NOW)
        self.assertEqual(first["fingerprint"], second["fingerprint"])
        self.assertEqual([], validate_feedback(second, apply_root=self.root, known_rule_ids={"AX-001"}))
        path1, _, merged1 = merge_feedback(
            self.root / "feedback", first, apply_root=self.root, known_rule_ids={"AX-001"}, now=NOW,
        )
        path2, merged, merged2 = merge_feedback(
            self.root / "feedback", second, apply_root=self.root, known_rule_ids={"AX-001"}, now="2026-09-03T17:00:00Z",
        )
        self.assertFalse(merged1)
        self.assertTrue(merged2)
        self.assertEqual(path1, path2)
        self.assertEqual(["evidence/a.json", "evidence/b.json"], merged["evidence_refs"])
        self.assertEqual(1, len(list((self.root / "feedback").glob("*.yaml"))))
        receipt = feedback_receipt(merged)
        self.assertEqual(first["id"], receipt["id"])
        self.assertEqual(2, receipt["evidence_count"])

    def test_feedback_filename_collision_is_rejected_without_changing_bytes(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        candidate = create_feedback(
            template=template,
            scenario="新问题",
            suggestion="新增规则",
            scope="project-only",
            evidence_refs=["evidence/a.json"],
            feedback_id=str(uuid.uuid4()),
            now=NOW,
        )
        occupant = create_feedback(
            template=template,
            scenario="占位问题",
            suggestion="保持原内容",
            scope="project-only",
            evidence_refs=["evidence/b.json"],
            feedback_id=str(uuid.uuid4()),
            now=NOW,
        )
        collision = self.root / "feedback" / f"{candidate['id']}.yaml"
        original = yaml.safe_dump(occupant, allow_unicode=True, sort_keys=False).encode("utf-8")
        collision.write_bytes(original)

        inbox_codes = {
            finding.code for finding in validate_feedback_inbox(
                self.root / "feedback", apply_root=self.root, known_rule_ids={"NN-001"},
            )
        }
        self.assertIn("FEEDBACK_FILENAME_ID_MISMATCH", inbox_codes)
        with self.assertRaises(ApplyStateError):
            merge_feedback(
                self.root / "feedback",
                candidate,
                apply_root=self.root,
                known_rule_ids={"NN-001"},
                now=NOW,
            )
        self.assertEqual(original, collision.read_bytes())

    def test_feedback_post_write_validation_failure_rolls_back_new_file(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        candidate = create_feedback(
            template=template,
            scenario="写后失败",
            suggestion="验证回滚",
            scope="project-only",
            evidence_refs=["evidence/a.json"],
            now=NOW,
        )
        calls = 0

        def validate_with_post_write_failure(*args, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                return [Finding("INJECTED_POST_WRITE_FAILURE", "feedback", "注入写后失败")]
            return []

        target = self.root / "feedback" / f"{candidate['id']}.yaml"
        with patch(
            "scripts.template_apply_state.state.validate_feedback_inbox",
            side_effect=validate_with_post_write_failure,
        ):
            with self.assertRaisesRegex(ApplyStateError, "写后验证失败"):
                merge_feedback(
                    self.root / "feedback",
                    candidate,
                    apply_root=self.root,
                    known_rule_ids={"NN-001"},
                    now=NOW,
                )
        self.assertEqual(3, calls)
        self.assertFalse(target.exists())

    def test_feedback_rejects_missing_and_parent_traversal_evidence(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        outside = self.root.parent / "outside.json"
        outside.write_text("outside", encoding="utf-8")
        for evidence_ref in ("evidence/missing.json", "../outside.json"):
            with self.subTest(evidence_ref=evidence_ref):
                candidate = create_feedback(
                    template=template,
                    scenario=f"证据问题 {evidence_ref}",
                    suggestion="补规则",
                    scope="project-only",
                    evidence_refs=[evidence_ref],
                    now=NOW,
                )
                findings = validate_feedback(candidate, apply_root=self.root, known_rule_ids={"NN-001"})
                self.assertIn("FEEDBACK_EVIDENCE_MISSING", {finding.code for finding in findings})
                with self.assertRaisesRegex(ApplyStateError, "FEEDBACK_EVIDENCE_MISSING"):
                    merge_feedback(
                        self.root / "feedback",
                        candidate,
                        apply_root=self.root,
                        known_rule_ids={"NN-001"},
                        now=NOW,
                    )

    def test_feedback_targets_require_known_rule_context_and_must_resolve(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        candidate = create_feedback(
            template=template,
            scenario="悬空规则",
            suggestion="修复规则引用",
            scope="template-rule",
            targets=["AX-001"],
            evidence_refs=["evidence/a.json"],
            now=NOW,
        )
        no_context = validate_feedback(candidate, apply_root=self.root)
        self.assertIn("FEEDBACK_RULE_CONTEXT_REQUIRED", {finding.code for finding in no_context})
        dangling = validate_feedback(candidate, apply_root=self.root, known_rule_ids={"NN-001"})
        self.assertIn("FEEDBACK_TARGET_DANGLING", {finding.code for finding in dangling})
        with self.assertRaisesRegex(ApplyStateError, "FEEDBACK_TARGET_DANGLING"):
            merge_feedback(
                self.root / "feedback",
                candidate,
                apply_root=self.root,
                known_rule_ids={"NN-001"},
                now=NOW,
            )

    def test_feedback_rejects_local_design_rule_target(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        candidate = create_feedback(
            template=template,
            scenario="局部设计决定",
            suggestion="保留会话内约束",
            scope="template-rule",
            targets=["LOCAL-STYLE-001"],
            evidence_refs=["evidence/a.json"],
            now=NOW,
        )
        findings = validate_feedback(
            candidate,
            apply_root=self.root,
            known_rule_ids={"LOCAL-STYLE-001"},
        )
        self.assertIn("FEEDBACK_LOCAL_RULE_TARGET", {finding.code for finding in findings})
        with self.assertRaisesRegex(ApplyStateError, "FEEDBACK_LOCAL_RULE_TARGET"):
            merge_feedback(
                self.root / "feedback",
                candidate,
                apply_root=self.root,
                known_rule_ids={"LOCAL-STYLE-001"},
                now=NOW,
            )

    def test_feedback_requires_nonempty_evidence_and_each_transition_reason(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        with self.assertRaises(ApplyStateError):
            create_feedback(template=template, scenario="缺规则", suggestion="新增", scope="template-rule", evidence_refs=[], now=NOW)

        item = create_feedback(template=template, scenario="缺规则", suggestion="新增", scope="template-rule", evidence_refs=["evidence/a.json"], now=NOW)
        item["status"] = "accepted"
        item["status_history"].append({"from": "proposed", "to": "accepted", "at": NOW})
        codes = {finding.code for finding in validate_feedback(item, apply_root=self.root, known_rule_ids={"NN-001"})}
        self.assertIn("APPLY_SCHEMA_INVALID", codes)
        self.assertIn("FEEDBACK_TRANSITION_REASON_REQUIRED", codes)
        self.assertIn("FEEDBACK_REASON_REQUIRED", codes)
        self.assertIn("FEEDBACK_TARGET_REQUIRED", codes)


    def test_source_and_build_identity_change_with_relevant_content(self) -> None:
        project = Path(self.temp.name) / "plain-project"
        project.mkdir()
        source = project / "app.txt"
        source.write_text("v1", encoding="utf-8")
        first_source = source_identity(project)
        self.assertTrue(first_source.startswith("snapshot:"))
        state_dir = project / ".ui-template-apply"
        state_dir.mkdir()
        (state_dir / "checkpoint.yaml").write_text("state: changed", encoding="utf-8")
        self.assertEqual(first_source, source_identity(project))
        source.write_text("v2", encoding="utf-8")
        self.assertNotEqual(first_source, source_identity(project))
        artifact = project / "dist"
        artifact.mkdir()
        output = artifact / "app.js"
        output.write_text("one", encoding="utf-8")
        first_build = build_identity("build --prod", artifact)
        output.write_text("two", encoding="utf-8")
        self.assertNotEqual(first_build, build_identity("build --prod", artifact))
        self.assertNotEqual(build_identity("build --prod", artifact), build_identity("build --debug", artifact))

    def test_feedback_merge_rejects_invalid_existing_match_without_write(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        existing = create_feedback(
            template=template,
            scenario="同一缺口",
            suggestion="原建议",
            scope="template-rule",
            evidence_refs=["evidence/a.json"],
            now=NOW,
        )
        existing["status"] = "accepted"
        existing["status_history"].append({"from": "proposed", "to": "verified", "at": NOW})
        path = self.root / "feedback" / f"{existing['id']}.yaml"
        original = yaml.safe_dump(existing, allow_unicode=True, sort_keys=False)
        path.write_text(original, encoding="utf-8")
        candidate = create_feedback(
            template=template,
            scenario="同一缺口",
            suggestion="新建议",
            scope="template-rule",
            evidence_refs=["evidence/b.json"],
            now=NOW,
        )

        with self.assertRaisesRegex(ApplyStateError, "feedback inbox 无效"):
            merge_feedback(
                self.root / "feedback",
                candidate,
                apply_root=self.root,
                known_rule_ids={"NN-001"},
                now="2026-09-03T17:00:00Z",
            )
        self.assertEqual(original, path.read_text(encoding="utf-8"))

    def test_terminal_feedback_returns_receipt_without_mutation(self) -> None:
        template = {"name": "demo", "version": "2.0.0", "source_revision": "abc"}
        first = create_feedback(template=template, scenario="终态问题", suggestion="修复", scope="project-only", evidence_refs=["evidence/a.json"], now=NOW)
        path, stored, _ = merge_feedback(
            self.root / "feedback", first, apply_root=self.root, known_rule_ids={"NN-001"}, now=NOW,
        )
        stored["status"] = "rejected"
        stored["reason"] = "仅属于消费项目"
        stored["status_history"].append({"from": "proposed", "to": "rejected", "at": NOW, "reason": stored["reason"]})
        path.write_text(yaml.safe_dump(stored, allow_unicode=True, sort_keys=False), encoding="utf-8")
        duplicate = create_feedback(template=template, scenario="终态问题", suggestion="再次报告", scope="project-only", evidence_refs=["evidence/b.json"], now=NOW)
        same_path, unchanged, deduplicated = merge_feedback(
            self.root / "feedback",
            duplicate,
            apply_root=self.root,
            known_rule_ids={"NN-001"},
            now="2026-09-03T18:00:00Z",
        )
        self.assertTrue(deduplicated)
        self.assertEqual(path, same_path)
        self.assertEqual(["evidence/a.json"], unchanged["evidence_refs"])
        self.assertTrue(feedback_receipt(unchanged)["terminal"])

    def test_fidelity_facet_recovery_reopens_layout_or_geometry_phase(self) -> None:
        root = Path(__file__).resolve().parents[1]
        data = yaml.safe_load(
            (root / "tests/fixtures/fidelity/structural/templates/structural-template/fidelity.yaml").read_text(encoding="utf-8")
        )
        self.checkpoint["template"]["digest"] = canonical_digest({"template": self.template, "fidelity": data})
        layout = copy.deepcopy(data)
        layout["layout_scenes"][1]["wrap"] = "wrap"
        layout_findings = self.validate(fidelity_value=layout, previous_fidelity=data)
        self.assertIn("CHECKPOINT_FIDELITY_LAYOUT_DRIFT", {item.code for item in layout_findings})
        self.assertEqual(2, recovery_decision(layout_findings, self.checkpoint)["earliest_phase"])
        state = copy.deepcopy(data)
        state["state_presentations"][0]["text_decoration"] = "underline"
        state_findings = self.validate(fidelity_value=state, previous_fidelity=data)
        self.assertIn("CHECKPOINT_FIDELITY_GEOMETRY_STATE_DRIFT", {item.code for item in state_findings})
        self.assertEqual(4, recovery_decision(state_findings, self.checkpoint)["earliest_phase"])

    def test_architecture_site_detection_ignores_apply_ledger(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.assertEqual("greenfield", detect_architecture_site(root))
            (root / ".ui-template-apply").mkdir()
            (root / ".ui-template-apply/checkpoint.yaml").write_text("schema_version: 2\n", encoding="utf-8")
            self.assertEqual("greenfield", detect_architecture_site(root))
            (root / "README.md").write_text("# demo\n", encoding="utf-8")
            (root / ".gitignore").write_text(".ui-template-apply/\n", encoding="utf-8")
            self.assertEqual("greenfield", detect_architecture_site(root))
            (root / "src").mkdir()
            self.assertEqual("greenfield", detect_architecture_site(root))
            (root / "src/main.ts").write_text("export {}\n", encoding="utf-8")
            self.assertEqual("existing", detect_architecture_site(root))
            self.assertEqual("greenfield", detect_architecture_site(root, explicit_greenfield=True))

    def test_architecture_site_ignores_active_instance_state_dir(self) -> None:
        # adopt-only bootstrap 先落 .ui-template-design Active Instance，输出根仍是 greenfield
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / ".ui-template-design").mkdir()
            (root / ".ui-template-design/design-system.yaml").write_text("schema: design-system/v1\n", encoding="utf-8")
            (root / ".ui-template-design/binding.yaml").write_text("schema: design-system-binding/v1\n", encoding="utf-8")
            (root / ".ui-template-design/core").mkdir()
            (root / ".ui-template-design/core/tokens.yaml").write_text("schema: design-system-tokens/v1\n", encoding="utf-8")
            self.assertEqual("greenfield", detect_architecture_site(root))
            (root / ".ui-template-apply").mkdir()
            (root / ".ui-template-apply/checkpoint.yaml").write_text("schema_version: 2\n", encoding="utf-8")
            self.assertEqual("greenfield", detect_architecture_site(root))
            # 工程文件一旦出现仍按 existing 判定，不受状态目录影响
            (root / "package.json").write_text("{}\n", encoding="utf-8")
            self.assertEqual("existing", detect_architecture_site(root))

    def test_architecture_site_uses_output_root_not_repo_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp)
            (repo / "apps" / "legacy").mkdir(parents=True)
            (repo / "package.json").write_text("{}\n", encoding="utf-8")
            (repo / "apps" / "legacy" / "main.ts").write_text("export {}\n", encoding="utf-8")
            app = repo / "apps" / "agent-web"
            app.mkdir(parents=True)
            (app / "src").mkdir()
            self.assertEqual("existing", detect_architecture_site(repo))
            self.assertEqual("greenfield", detect_architecture_site(app))
            self.assertEqual("greenfield", detect_architecture_site(repo / "apps" / "missing"))
            apply_root = repo / ".ui-template-apply"
            apply_root.mkdir()
            layers = {name: "pending" for name in (
                "language", "ui_framework", "bundler", "routing", "styling", "state",
                "data", "unit_test", "browser", "package_manager", "repo_shape",
            )}
            (apply_root / "00-architecture.yaml").write_text(yaml.safe_dump({
                "schema_version": 2,
                "site": "existing",
                "output_root": "apps/agent-web",
                "confirmed_by_user": True,
                "observed_stack": "repo package.json",
                "layers": layers,
            }, allow_unicode=True, sort_keys=False), encoding="utf-8")
            from scripts.template_apply_state.state import _architecture_findings
            findings = _architecture_findings(apply_root, {0: {"status": "pending"}}, None)
            self.assertIn("ARCHITECTURE_SITE_MISMATCH", {item.code for item in findings})

    def test_phase0_architecture_is_required_and_confirmation_blocks_later_phases(self) -> None:
        self.assertEqual([], self.validate())
        phase0 = self.checkpoint["phases"][0]
        phase0["artifacts"] = [item for item in phase0["artifacts"] if item["path"] != "00-architecture.yaml"]
        self.assertIn("CHECKPOINT_ARTIFACT_UNDECLARED", {item.code for item in self.validate()})

        architecture = self.root / "00-architecture.yaml"
        data = yaml.safe_load(architecture.read_text(encoding="utf-8"))
        data["confirmed_by_user"] = False
        architecture.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
        for item in phase0["artifacts"]:
            if item["path"] == "00-architecture.yaml":
                item["digest"] = canonical_digest(artifact_value(architecture))
        findings = self.validate()
        blocked_phases = {finding.phase for finding in findings if finding.code == "ARCHITECTURE_UNCONFIRMED"}
        self.assertEqual(set(range(10)), blocked_phases)

    def test_template_origin_pin_is_pairwise_consistent_and_old_checkpoint_is_compatible(self) -> None:
        self.assertEqual([], self.validate())
        self.checkpoint["template"].update({"origin": "catalog", "resolved_path": "catalog/demo"})
        self.assertEqual([], self.validate())
        self.checkpoint["template"]["resolved_path"] = "templates/demo"
        self.assertIn("CHECKPOINT_RESOLVED_PATH_MISMATCH", {item.code for item in self.validate()})
        self.checkpoint["template"].pop("resolved_path")
        self.assertIn("CHECKPOINT_TEMPLATE_PIN_INCOMPLETE", {item.code for item in self.validate()})

    def test_schema_dir_candidates_cover_repo_runtime_and_installed_layouts(self) -> None:
        from scripts.template_apply_state.state import _schema_dir_candidates, _schema_store

        installed = Path("/home/x/.claude/skills/ui-template-apply/runtime/template_apply_state/state.py")
        candidates = _schema_dir_candidates(installed)
        self.assertEqual(Path("/home/x/.claude/skills/ui-template-apply/runtime/schemas/template/v2"), candidates[0])
        self.assertEqual(Path("/home/x/.claude/skills/ui-template-apply/schemas/template/v2"), candidates[1])
        self.assertEqual(
            Path("/home/x/.claude/skills/ui-template-author/runtime/schemas/template/v2"),
            candidates[2],
        )
        repo_root = Path(__file__).resolve().parents[1]
        store = _schema_store()
        self.assertEqual(repo_root / "schemas/template/v2", store.directory)
        self.assertIn("checkpoint.schema.json", store.schemas)

    def test_schema_store_missing_schema_file_raises_actionable_error(self) -> None:
        from scripts.template_apply_state.state import _schema_findings

        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError, "schema 文件缺失"):
                _schema_findings(
                    "architecture", {"schema_version": 2}, "00-architecture.yaml", schema_dir=Path(temp),
                )

    def test_apply_checkpoint_marker_skips_only_checkpoint_kind(self) -> None:
        from scripts.template_apply_state.state import _schema_findings

        marked = {"schema": "design-system-apply-checkpoint/v1", "records": []}
        self.assertEqual([], _schema_findings("checkpoint", marked, "checkpoint.yaml"))
        self.assertNotEqual([], _schema_findings("verification", marked, "08-verification.json"))

    def test_phase8_records_require_scenario_ids_and_phase9_forbids_them(self) -> None:
        from scripts.template_apply_state.state import _schema_findings

        schema_dir = Path(__file__).resolve().parents[1] / "schemas/template/v2"

        def record(scenario_ids: list[str] | None) -> dict:
            item = self._record("passed", "evidence/phase8.txt")
            if scenario_ids is None:
                item.pop("scenario_ids", None)
            else:
                item["scenario_ids"] = scenario_ids
            return item

        def phase8(item: dict) -> dict:
            return {
                "schema_version": 2, "kind": "phase-8-verification",
                "template_digest": canonical_digest(self.template),
                "source_identity": self.source, "build_identity": self.build,
                "browser_identity": "Chromium 128", "records": [item], "created_at": NOW,
            }

        missing = _schema_findings("verification", phase8(record(None)), "08.json", schema_dir=schema_dir, phase=8)
        self.assertTrue(any("scenario_ids" in item.message for item in missing))
        self.assertEqual([], _schema_findings("verification", phase8(record(["phase8:demo:default"])), "08.json", schema_dir=schema_dir, phase=8))
        forbidden = self._verification("phase-9-review")
        forbidden["records"][0]["scenario_ids"] = ["phase8:demo:default"]
        findings = _schema_findings("verification", forbidden, "09.md", schema_dir=schema_dir, phase=9)
        self.assertTrue(any("scenario_ids" in item.message for item in findings))

    def test_bootstrap_site_flip_after_implementation_does_not_mismatch(self) -> None:
        from scripts.template_apply_state.state import _architecture_findings

        (self.root.parent / "src").mkdir()
        (self.root.parent / "src/main.ts").write_text("export {}\n", encoding="utf-8")
        landed = _architecture_findings(self.root, {8: {"status": "complete"}}, None)
        self.assertNotIn("ARCHITECTURE_SITE_MISMATCH", {item.code for item in landed})
        early = _architecture_findings(self.root, {4: {"status": "complete"}}, None)
        self.assertIn("ARCHITECTURE_SITE_MISMATCH", {item.code for item in early})
        unconfirmed = yaml.safe_load((self.root / "00-architecture.yaml").read_text(encoding="utf-8"))
        unconfirmed["confirmed_by_user"] = False
        (self.root / "00-architecture.yaml").write_text(yaml.safe_dump(unconfirmed, allow_unicode=True, sort_keys=False), encoding="utf-8")
        flushed = _architecture_findings(self.root, {8: {"status": "complete"}}, None)
        self.assertIn("ARCHITECTURE_SITE_MISMATCH", {item.code for item in flushed})

    def test_scroll_owner_list_reports_finding_instead_of_typeerror(self) -> None:
        from scripts.template_apply_state.state import _route_composition_findings

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "02-routes.yaml").write_text(yaml.safe_dump({
                "routes": [{
                    "id": "route/detail", "path": "/detail", "page_type": "page-type/detail",
                    "pattern_refs": ["pattern/list-page"], "layout_ref": "layout/main",
                    "scroll_owner": ["region-canvas"], "structural_verification": "available",
                    "placement_plan": {"template_refs": ["pattern/list-page"]},
                }],
            }, sort_keys=False), encoding="utf-8")
            placement_context = {
                "layouts": {"layout/main": {"id": "layout/main", "page_type": "page-type/detail", "placement": {
                    "scroll_domains": [
                        {"id": "pane-nav", "axis": "y", "owner": "region-nav"},
                        {"id": "pane-canvas", "axis": "y", "owner": "region-canvas"},
                    ],
                }}},
                "page_type_patterns": {"page-type/detail": ["pattern/list-page"]},
            }
            findings = _route_composition_findings(
                root,
                {2: {"status": "complete"}},
                {"page_types": {"page-type/detail"}, "patterns": {"pattern/list-page"}},
                placement_context=placement_context,
                structural_available=True,
            )
            codes = {item.code for item in findings}
            self.assertIn("SCROLL_OWNER_UNTRACE", codes)
            self.assertIn("MULTI_PANE_ROOT_REQUIRED", codes)

    def test_recovery_decision_splits_checkpoint_valid_from_resume_cursor(self) -> None:
        decision = recovery_decision([], self.checkpoint)
        self.assertTrue(decision["checkpoint_valid"])
        self.assertIsNone(decision["earliest_phase"])
        blocked = recovery_decision([Finding("CHECKPOINT_TOKEN_DRIFT", "checkpoint.yaml#tokens_digest", "tokens 语义已变化", 1)], self.checkpoint)
        self.assertFalse(blocked["checkpoint_valid"])
        self.assertEqual(1, blocked["earliest_phase"])
        self.assertNotIn("valid", decision)

    def test_build_checkpoint_round_trips_zero_findings(self) -> None:
        from scripts.template_apply_state import build_checkpoint

        checkpoint = build_checkpoint(
            template_value=self.template,
            tokens_value=self.tokens,
            scope=self.scope,
            source_identity=self.source,
            build_identity=self.build,
            fidelity_value=None,
            now=NOW,
        )
        self.assertEqual("design-system-apply-checkpoint/v1", checkpoint["schema"])
        self.assertEqual("catalog/demo", checkpoint["template"]["resolved_path"])
        self.assertEqual(canonical_digest(self.template), checkpoint["template"]["digest"])
        self.assertEqual([phase["id"] for phase in checkpoint["phases"]], list(range(10)))
        self.assertEqual([], validate_checkpoint(
            checkpoint,
            apply_root=self.root,
            template_value=self.template,
            tokens_value=self.tokens,
            scope=self.scope,
            source_identity=self.source,
            build_identity=self.build,
            known_rule_ids={"NN-001"},
        ))


class CliScenariosAndLintTests(unittest.TestCase):
    """scenarios / artifact-lint 子命令：Phase 8 证据集合前置枚举与产物写时校验。"""

    ROOT = Path(__file__).resolve().parents[1]

    def _run_cli(self, *argv: str) -> tuple[int, dict]:
        import subprocess
        import sys

        proc = subprocess.run(
            [sys.executable, str(self.ROOT / "scripts/check_template_apply_state.py"), *argv],
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=self.ROOT,
        )
        return proc.returncode, json.loads(proc.stdout)

    def test_scenarios_cli_matches_derive_scenario_ids(self) -> None:
        from scripts.template_validation.loading import load_data
        from scripts.template_apply_state.fidelity import derive_scenario_ids

        fidelity = self.ROOT / "templates/workbench-shell/fidelity.yaml"
        layout = self.ROOT / "templates/workbench-shell/core/layout.yaml"
        expectations = self.ROOT / "templates/workbench-shell/measured-expectations.yaml"
        code, payload = self._run_cli(
            "scenarios",
            "--fidelity", str(fidelity),
            "--layout", str(layout),
            "--expectations", str(expectations),
        )
        self.assertEqual(0, code)
        expected = derive_scenario_ids(
            load_data(fidelity), load_data(layout), load_data(expectations)
        )
        self.assertEqual(expected, payload["scenarios"])
        self.assertEqual(len(expected), payload["count"])
        self.assertIn("phase8:expectation:expectation-app-shell", payload["scenarios"])
        self.assertTrue(payload["inputs"]["layout"])

    def test_scenarios_cli_without_sidecar_reports_empty(self) -> None:
        code, payload = self._run_cli("scenarios")
        self.assertEqual(0, code)
        self.assertEqual([], payload["scenarios"])
        self.assertEqual(0, payload["count"])

    def test_artifact_lint_accepts_quoted_timestamps_and_digest_objects(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            good = Path(temp) / "good.yaml"
            good.write_text(
                "schema_version: 2\n"
                "created_at: '2026-09-20T00:00:00Z'\n"
                "template_digest: {algorithm: sha256-canonical-json-v1, value: abc123}\n"
                "items: [\"快捷键帮助(?)\", \"@成员\"]\n",
                encoding="utf-8",
            )
            code, payload = self._run_cli("artifact-lint", str(good))
        self.assertEqual(0, code)
        self.assertTrue(payload["valid"])

    def test_artifact_lint_flags_bare_dates_and_digest_shapes(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            bad = Path(temp) / "bad.yaml"
            bad.write_text(
                "schema_version: 2\ncreated_at: 2026-09-20\ntemplate_digest: git:abc123\n",
                encoding="utf-8",
            )
            code, payload = self._run_cli("artifact-lint", str(bad))
        self.assertEqual(1, code)
        codes = {item["code"] for item in payload["findings"]}
        self.assertIn("ARTIFACT_BARE_DATE", codes)
        self.assertIn("ARTIFACT_DIGEST_SHAPE_INVALID", codes)
        self.assertIn("ARTIFACT_NOT_CANONICAL", codes)

    def test_artifact_lint_reports_flow_sequence_parse_errors(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            bad = Path(temp) / "flow.yaml"
            bad.write_text("entry_points: [快捷键帮助(?)， 各页对话框]\n", encoding="utf-8")
            code, payload = self._run_cli("artifact-lint", str(bad))
        self.assertEqual(1, code)
        self.assertEqual("ARTIFACT_UNPARSEABLE", payload["findings"][0]["code"])

    def test_digest_cli_uses_markdown_envelope_and_structured_loading(self) -> None:
        from scripts.template_apply_state import canonical_digest

        with tempfile.TemporaryDirectory() as temp:
            md = Path(temp) / "09-review.md"
            md.write_text("# Review\r\n| a | b |\r\n", encoding="utf-8")
            code, payload = self._run_cli("digest", str(md))
            self.assertEqual(0, code)
            self.assertEqual(
                canonical_digest({"media_type": "text/markdown", "text": "# Review\n| a | b |\n"}),
                payload,
            )
            structured = Path(temp) / "a.yaml"
            structured.write_text("b: 2\na: [1]\n", encoding="utf-8")
            code, payload = self._run_cli("digest", str(structured))
            self.assertEqual(0, code)
            self.assertEqual(canonical_digest({"a": [1], "b": 2}), payload)

    def test_checkpoint_init_round_trips_checkpoint_validation(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            template = base / "meta.yaml"
            template.write_text(
                yaml.safe_dump({"schema_version": 2, "name": "demo", "template_version": "2.0.0"}),
                encoding="utf-8",
            )
            tokens = base / "tokens.yaml"
            tokens.write_text("schema_version: 2\nthemes: {}\n", encoding="utf-8")
            scope = base / "scope.yaml"
            scope.write_text(
                yaml.safe_dump({"scope": {"included": ["/"], "deferred": [], "excluded": []}}),
                encoding="utf-8",
            )
            argv = [
                "--template", str(template), "--tokens", str(tokens), "--scope", str(scope),
                "--source-identity", "git:abc:clean", "--build-identity", "build:x",
            ]
            code, payload = self._run_cli(
                "checkpoint-init", "--apply-root", str(base / ".ui-template-apply"), *argv,
            )
            self.assertEqual(0, code)
            self.assertTrue(payload["valid"])

            code, payload = self._run_cli(
                "checkpoint-init", "--apply-root", str(base / ".ui-template-apply"), *argv,
            )
            self.assertEqual(1, code)
            self.assertIn("已存在", payload["error"])

            code, payload = self._run_cli("checkpoint", "--apply-root", str(base / ".ui-template-apply"), *argv)
            self.assertEqual(0, code)
            self.assertTrue(payload["checkpoint_valid"])
            self.assertEqual([], payload["findings"])
            self.assertEqual(0, payload["earliest_phase"])


if __name__ == "__main__":
    unittest.main()


class PlacementClosureTests(unittest.TestCase):
    def test_complete_route_and_component_closure_passes(self) -> None:
        from scripts.template_apply_state.state import _route_composition_findings

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "02-routes.yaml").write_text(yaml.safe_dump({
                "routes": [{
                    "id": "route/detail",
                    "path": "/detail",
                    "page_type": "page-type/detail",
                    "pattern_refs": ["pattern/list-page"],
                    "structural_verification": "unavailable",
                    "placement_plan": {"template_refs": ["pattern/list-page"]},
                }],
            }, sort_keys=False), encoding="utf-8")
            (root / "04-components.yaml").write_text(yaml.safe_dump({
                "routes": [{
                    "id": "component/list",
                    "pattern": "pattern/list-page",
                    "primitives": ["primitive/button"],
                    "placement_role": "section-navigation",
                    "route_refs": ["route/detail"],
                    "placement_pattern": "pattern/list-page",
                }],
            }, sort_keys=False), encoding="utf-8")
            layers = {
                "page_types": {"page-type/detail"},
                "patterns": {"pattern/list-page"},
                "primitives": {"primitive/button"},
            }
            context = {"page_type_patterns": {"page-type/detail": ["pattern/list-page"]}}
            phases = {2: {"id": 2, "status": "complete"}, 4: {"id": 4, "status": "complete"}}
            findings = _route_composition_findings(
                root, phases, layers,
                placement_context=context,
                structural_available=False,
            )
            self.assertEqual([], [finding.code for finding in findings])

    def test_unauthorized_placement_component_fails(self) -> None:
        from scripts.template_apply_state.state import _route_composition_findings

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "02-routes.yaml").write_text(yaml.safe_dump({
                "routes": [{
                    "id": "route/detail",
                    "path": "/detail",
                    "page_type": "page-type/detail",
                    "pattern_refs": ["pattern/list-page"],
                    "structural_verification": "unavailable",
                }],
            }, sort_keys=False), encoding="utf-8")
            (root / "04-components.yaml").write_text(yaml.safe_dump({
                "routes": [{
                    "id": "component/tabs",
                    "pattern": "pattern/list-page",
                    "placement_role": "section-navigation",
                    "route_refs": ["route/detail"],
                    "placement_pattern": "pattern/other",
                }],
            }, sort_keys=False), encoding="utf-8")
            layers = {
                "page_types": {"page-type/detail"},
                "patterns": {"pattern/list-page"},
                "primitives": {"primitive/button"},
            }
            context = {"page_type_patterns": {"page-type/detail": ["pattern/list-page"]}}
            findings = _route_composition_findings(
                root, {2: {"id": 2, "status": "complete"}, 4: {"id": 4, "status": "complete"}},
                layers,
                placement_context=context,
                structural_available=False,
            )
            codes = [finding.code for finding in findings]
            self.assertIn("PLACEMENT_COMPONENT_UNAUTHORIZED", codes)

    def test_unavailable_machine_assertion_reopens_phase_two(self) -> None:
        checkpoint = {
            "schema": "design-system-apply-checkpoint/v1",
            "mode": "bootstrap",
            "phases": [
                {"id": 2, "status": "complete"},
                {"id": 4, "status": "complete"},
                {"id": 8, "status": "complete"},
            ],
        }
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "02-routes.yaml").write_text(yaml.safe_dump({
                "routes": [{
                    "id": "route/detail",
                    "path": "/detail",
                    "page_type": "page-type/detail",
                    "pattern_refs": ["pattern/list-page"],
                    "structural_verification": "unavailable",
                    "shell_variant": "inset",
                }],
            }, sort_keys=False), encoding="utf-8")
            (root / "04-components.yaml").write_text("routes: []\n", encoding="utf-8")
            from scripts.template_apply_state.state import _route_composition_findings

            findings = _route_composition_findings(
                root,
                {phase["id"]: phase for phase in checkpoint["phases"]},
                {"page_types": {"page-type/detail"}, "patterns": {"pattern/list-page"}},
                placement_context={"page_type_patterns": {"page-type/detail": ["pattern/list-page"]}},
                structural_available=False,
            )
            decision = recovery_decision(findings, checkpoint)
            self.assertEqual(2, decision["earliest_phase"])
