from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SkillContractTests(unittest.TestCase):
    def read(self, relative: str) -> str:
        return (ROOT / relative).read_text(encoding="utf-8")

    def test_authoring_schema_v2_evidence_rules_coverage_units_and_ownership(self) -> None:
        text = self.read("skills/ui-template/references/spec-format.md")
        for required in ("schema_version: 2", "evidence.yaml", "NN-###", "observed/defaulted/unsupported", "unit", "apply/", "implementation/", "stack adapter", ".ui-template-apply/03-structure.md"):
            self.assertIn(required, text)
        self.assertIn("精确值唯一载体", text)
        self.assertIn("license", text)
        self.assertIn("redaction", text)

    def test_each_source_guide_requires_provenance_license_privacy_and_default_basis(self) -> None:
        for name in ("web", "repo", "image", "doc"):
            with self.subTest(source=name):
                text = self.read(f"skills/ui-template/references/source-{name}.md")
                for required in ("meta.sources[]", "revision", "locator", "confidence", "license", "redistribution", "redaction", "basis"):
                    self.assertIn(required, text)

    def test_authoring_gate_order_and_failed_index_rule(self) -> None:
        text = self.read("skills/ui-template/SKILL.md")
        positions = [text.index(f"### {index}. {name}") for index, name in ((1, "Generate"), (2, "Validate"), (3, "Eval"), (4, "Index"), (5, "Report"))]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("失败后不得修改生产 `templates/INDEX.md`", text)
        self.assertIn("bundle 与生产镜像在本 skill 根分发", text)
        self.assertTrue((ROOT / "skills/ui-template/runtime/validate_templates.py").is_file())
        self.assertTrue((ROOT / "skills/ui-template/runtime/run_contract_evals.py").is_file())
        self.assertIn("缺失或能力不满足即 fail closed", text)
        for variable in ("UI_TEMPLATE_VALIDATOR", "UI_TEMPLATE_EVAL_RUNNER"):
            self.assertIn(variable, text)

    def test_authoring_feedback_state_uuid_fingerprint_and_receipt(self) -> None:
        text = self.read("skills/ui-template/references/feedback-lifecycle.md")
        for required in (".ui-template-apply/feedback/", "UUID", "fingerprint", "NFKC", "accepted", "known-gap", "rejected", "applied", "verified", "receipt", "终态", "filename stem", "known_rule_ids", "符号链接越界", "原子替换", "回滚"):
            self.assertIn(required, text)

    def test_manager_is_repository_only_thin_router(self) -> None:
        text = self.read(".agents/skills/ui-template-manager/SKILL.md")
        self.assertLessEqual(len(text.splitlines()), 30)
        self.assertIn("repository-only wrapper", text)
        self.assertIn("skills/ui-template/SKILL.md", text)
        self.assertIn("skills/ui-template-apply/SKILL.md", text)
        self.assertNotIn("## Self-evolution", text)

    def test_apply_rejects_unknown_schema_and_origin(self) -> None:
        text = self.read("skills/ui-template-apply/references/template-contract.md")
        self.assertIn("schema_version: 2", text)
        self.assertIn("source | computed | estimated | default", text)
        self.assertIn("任意未知值即拒绝开始", text)
        self.assertIn("observed", text)

    def test_apply_artifact_tree_checkpoint_and_recovery_contract(self) -> None:
        text = self.read("skills/ui-template-apply/references/apply-workflow.md")
        for artifact in ("checkpoint.yaml", "00-intake.md", "01-design-direction.md", "01-token-map.yaml", "02-routes.yaml", "03-structure.md", "04-components.yaml", "05-07-progress.yaml", "08-verification.json", "09-review.md", "feedback/"):
            self.assertIn(artifact, text)
        for required in ("sha256-canonical-json-v1", "最早失效 phase", "source identity", "build identity", "recheck-passed", "recheck-failed", "expected/actual", "template_version", "filename stem", "known_rule_ids", "重新验证整个 inbox", "回滚"):
            self.assertIn(required, text)

    def test_query_contract_is_complete(self) -> None:
        text = self.read("skills/ui-template-apply/references/toolchain.md")
        for required in ("one intent", "explicit mode", "design-system", "domain", "stack", "2–5 terms", "top identity", "retry once", "abstain", "no persist by default", "--persist"):
            self.assertIn(required, text)

    def test_quality_uses_current_build_rule_evidence_not_fixed_counts(self) -> None:
        text = self.read("skills/ui-template-apply/references/quality-gates.md")
        for required in ("current-build", "rule ID", "template digest", "source identity", "build identity", "expected/actual", "evidence refs"):
            self.assertIn(required, text)
        self.assertIn("不由固定 checklist 数量驱动", text)
        self.assertNotIn("最低验收清单", text)


if __name__ == "__main__":
    unittest.main()
