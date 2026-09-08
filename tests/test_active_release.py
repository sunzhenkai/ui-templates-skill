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
            ["skills/ui-template-author", "skills/ui-template-apply", "skills/ui-template-design"],
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

    def test_shared_validator_copy_drift_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            shutil.copytree(ROOT / "scripts", root / "scripts")
            shutil.copytree(ROOT / "schemas/design-system/v1", root / "schemas/design-system/v1")
            for skill in ("ui-template-author", "ui-template-apply", "ui-template-design"):
                runtime = root / "skills" / skill / "runtime"
                runtime.mkdir(parents=True)
                shutil.copy2(ROOT / "scripts/validate_design_system.py", runtime / "shared_validate_design_system.py")
                shutil.copy2(ROOT / "scripts/design_system_validator_discovery.py", runtime / "validator_discovery.py")
                shutil.copytree(ROOT / "schemas/design-system/v1", runtime / "schemas/design-system/v1")
            drifted = root / "skills/ui-template-author/runtime/shared_validate_design_system.py"
            drifted.write_text(drifted.read_text(encoding="utf-8") + "\n# drift\n", encoding="utf-8")
            findings = active.check_shared_validator_copies(root)
        self.assertIn(self.expected["shared-validator-drift"], {item.code for item in findings})

    def test_local_skills_allow_only_manager(self) -> None:
        self.assertEqual([], active.check_local_skill_boundary(ROOT))
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            skills = root / ".agents/skills"
            (skills / "ui-template-manager").mkdir(parents=True)
            (skills / "ui-template-author").mkdir()
            (skills / ".ui-template-public-manifest.yaml").write_text("schema_version: 1\n", encoding="utf-8")
            findings = active.check_local_skill_boundary(root)
        self.assertEqual(
            {"LOCAL_PUBLIC_SKILL_FORBIDDEN"},
            {item.code for item in findings},
        )

    def test_source_product_name_outside_provenance_is_rejected(self) -> None:
        terms = active.source_product_terms_from_ref("https://github.com/acme-labs/acme @ abc")
        self.assertEqual({"acme-labs", "acme"}, terms)
        findings = active.check_source_product_names(
            "governance/FUNCTIONAL-LOOP.md",
            "从首个模板 / acme 特例归纳更新协议",
            terms,
        )
        self.assertIn(self.expected["source-product-name-leak"], {item.code for item in findings})
        self.assertEqual(
            [],
            active.check_source_product_names("AGENTS.md", "公开 acme-labs/acme 仓库源码", terms),
        )
        self.assertEqual(
            [],
            active.check_source_product_names("governance/FUNCTIONAL-LOOP.md", "只对照可部署原版", terms),
        )

    def test_published_template_meta_supplies_source_product_terms(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            meta = root / "templates" / "demo-shell" / "meta.yaml"
            meta.parent.mkdir(parents=True)
            meta.write_text("sources:\n- ref: https://github.com/acme-labs/acme @ abc\n", encoding="utf-8")
            terms = active.collect_source_product_terms(
                root,
                {"templates/demo-shell/meta.yaml", "tests/fixtures/x/templates/x/meta.yaml"},
            )
        self.assertEqual({"acme-labs", "acme"}, terms)

    def test_workbench_impl_requirements_live_in_base_specs(self) -> None:
        implementation = active._safe_text(ROOT, "openspec/specs/workbench-shell-implementation/spec.md")
        self.assertIn("技术栈无关 apply 指南", implementation)
        self.assertNotIn("完整实施 playbook", implementation)


if __name__ == "__main__":
    unittest.main()
