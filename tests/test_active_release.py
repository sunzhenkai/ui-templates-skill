from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_active_release as active  # noqa: E402
from skill_distribution.mirror import check_mirror, write_mirror  # noqa: E402

FIXTURE = ROOT / "tests/fixtures/mutations/governance/cases.json"


class ActiveReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.expected = {
            item["id"]: item["expected_code"]
            for item in json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]
        }

    def test_repository_active_release_contract_passes_without_active_change(self) -> None:
        report = active.check_repository(ROOT, ROOT / "governance/scope.yaml")
        self.assertEqual("passed", report["status"], report["findings"])
        self.assertEqual([], report["pending_overlays"])
        self.assertTrue(all(item["content_read"] is False and item["traversed"] is False for item in report["exclusions"]))
        self.assertEqual("readability-only-no-semantic-rewrite", report["immutable_history"]["policy"])

    def test_excluded_sample_content_is_never_opened(self) -> None:
        original = active._safe_text
        reads: list[str] = []

        def recording(root: Path, relative: str) -> str:
            reads.append(relative)
            return original(root, relative)

        with mock.patch.object(active, "_safe_text", side_effect=recording):
            report = active.check_repository(ROOT, ROOT / "governance/scope.yaml")
        self.assertEqual("passed", report["status"], report["findings"])
        web_v2 = "example/workbench-shell/" + "web-v2/"
        web_v3 = "example/workbench-shell/" + "web-v3/"
        self.assertFalse(any(path.startswith(web_v2) for path in reads))
        self.assertFalse(any(path.startswith(web_v3) for path in reads))

    def test_mutation_broken_link_has_stable_code(self) -> None:
        findings = active.check_markdown_links(
            ROOT, "README.md", "[missing](missing-active-document.md)", {"README.md"}, set(),
        )
        self.assertIn(self.expected["broken-active-link"], {item.code for item in findings})

    def test_mutation_active_implementation_claim_has_stable_code(self) -> None:
        findings = active.check_active_semantics(
            "README.md", "模板提供 `implementation/` playbook 并允许项目直接消费。",
        )
        self.assertIn(self.expected["active-implementation-claim"], {item.code for item in findings})
        self.assertEqual([], active.check_active_semantics("README.md", "模板禁止 `implementation/`。"))

    def test_mutation_missing_public_skill_has_stable_code(self) -> None:
        findings = active.check_required_paths(
            {"skills/ui-template-author/SKILL.md"},
            ["skills/ui-template-author", "skills/ui-template-apply"],
        )
        self.assertIn(self.expected["missing-public-skill"], {item.code for item in findings})

    def test_mutation_production_mirror_drift_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            mirror = Path(temporary) / ".agents/skills"
            write_mirror(ROOT, mirror)
            changed = mirror / "ui-template-author/references/source-web.md"
            changed.write_text(changed.read_text(encoding="utf-8") + "\nmutation\n", encoding="utf-8")
            findings = check_mirror(ROOT, mirror)
        self.assertTrue(any(item.startswith(self.expected["production-mirror-drift"]) for item in findings))

    def test_archived_overlay_requirements_live_in_base_specs(self) -> None:
        # harden-template-lifecycle archive 时已把 delta 合入 base specs；
        # 归档后不再有 overlay，合并结果必须仍留在 base specs 中。
        workflow = active._safe_text(ROOT, "openspec/specs/ui-template-workflow/spec.md")
        self.assertNotIn("Optional implementation playbook 元数据", workflow)
        implementation = active._safe_text(ROOT, "openspec/specs/workbench-shell-implementation/spec.md")
        self.assertIn("技术栈无关 apply 指南", implementation)
        self.assertNotIn("完整实施 playbook", implementation)


if __name__ == "__main__":
    unittest.main()
