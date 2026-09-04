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
from scripts.template_apply_state.state import PHASE_ARTIFACTS, _artifact_value

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
                artifacts.append({"path": relative, "digest": canonical_digest(_artifact_value(self.root / relative))})
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

if __name__ == "__main__":
    unittest.main()
