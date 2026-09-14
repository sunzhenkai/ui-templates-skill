from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from skill_distribution.catalog import check_catalog, write_catalog  # noqa: E402
from skill_distribution.config import DistributionError  # noqa: E402


def _frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    return yaml.safe_load(text[3:end]) or {}


class CatalogAndDiscoveryTests(unittest.TestCase):
    def test_catalog_matches_published_production_library(self) -> None:
        self.assertEqual([], check_catalog(ROOT))
        self.assertTrue((ROOT / "skills/ui-template-author/catalog/workbench-shell/design-system.yaml").is_file())
        production = yaml.safe_load((ROOT / "templates/workbench-shell/meta.yaml").read_text(encoding="utf-8"))
        catalog = yaml.safe_load(
            (ROOT / "skills/ui-template-author/catalog/workbench-shell/meta.yaml").read_text(encoding="utf-8")
        )
        self.assertEqual(production["version"], catalog["version"])

    def _promotion_repo(self) -> Path:
        root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, root, ignore_errors=True)
        shutil.copytree(ROOT / "templates", root / "templates")
        catalog = root / "skills/ui-template-author/catalog"
        catalog.parent.mkdir(parents=True)
        shutil.copytree(ROOT / "skills/ui-template-author/catalog", catalog)
        return root

    def _write_certification(
        self, root: Path, status: str, accepted: bool, version: str, digest: str, outcome: str | None = None,
    ) -> None:
        cert = root / "governance/candidates/workbench-shell/certification"
        cert.mkdir(parents=True, exist_ok=True)
        (cert / "report.yaml").write_text(
            "schema: design-system-fidelity-certification/v1\n"
            f"gate:\n  package:\n    id: workbench-shell\n    version: {version}\n"
            "    digest:\n      algorithm: sha256-canonical-json-v1\n"
            f"      value: {digest}\n"
            "  oracle:\n    kind: git-revision\n    revision: " + "a" * 40 + "\n"
            "  prompts_digest:\n    algorithm: sha256-tree-v1\n    value: " + "b" * 64 + "\n"
            "  build:\n    generated_at: '2026-09-13T00:00:00Z'\n    identity: cert-build\n"
            "    output_root: out\n  apply_mode: bootstrap\n"
            f"status: {status}\n"
            "records: []\n",
            encoding="utf-8",
        )
        outcome_json = "null" if outcome is None else '"%s"' % outcome
        (cert / "verify-result.json").write_text(
            '{"accepted": %s, "outcome": %s, "result": {"valid": %s}, "failures": []}\n'
            % ("true" if accepted else "false", outcome_json, "true" if accepted else "false"),
            encoding="utf-8",
        )

    def _write_expectations(self, root: Path, package_digest: str) -> None:
        template_root = root / "templates/workbench-shell"
        template_root.mkdir(parents=True, exist_ok=True)
        (template_root / "measured-expectations.yaml").write_text(
            "schema: design-system-measured-expectations/v1\n"
            "package:\n  id: workbench-shell\n  version: 1.3.2\n"
            "  digest:\n    algorithm: sha256-canonical-json-v1\n"
            f"    value: {package_digest}\n"
            "oracle:\n  kind: git-revision\n  revision: " + "a" * 40 + "\n"
            "prompts_digest:\n  algorithm: sha256-tree-v1\n  value: " + "b" * 64 + "\n"
            "entries:\n"
            "- id: expectation-sidebar-width\n"
            "  pattern: pattern/page-chrome\n"
            "  dimension: spacing\n"
            "  method: computed-style\n"
            "  expected: 256px\n"
            "  unit: px\n"
            "  oracle_revision: " + "a" * 40 + "\n",
            encoding="utf-8",
        )

    def _real_digest(self) -> str:
        from skill_distribution.catalog import _canonical_manifest_digest

        return _canonical_manifest_digest(ROOT / "templates/workbench-shell")

    def test_promotion_requires_schema_status_and_acceptance(self) -> None:
        root = self._promotion_repo()
        self._write_certification(root, "accepted", True, "1.3.2", self._real_digest())
        with self.assertRaisesRegex(DistributionError, "CERTIFICATION_STATUS_INVALID"):
            write_catalog(root)

        root = self._promotion_repo()
        self._write_certification(root, "passed", False, "1.3.2", self._real_digest())
        with self.assertRaisesRegex(DistributionError, "CATALOG_PROMOTION_CERTIFICATION_REQUIRED"):
            write_catalog(root)

        root = self._promotion_repo()
        with self.assertRaisesRegex(DistributionError, "CATALOG_PROMOTION_CERTIFICATION_REQUIRED"):
            write_catalog(root)

    def test_promotion_certification_binds_promoted_package(self) -> None:
        root = self._promotion_repo()
        self._write_certification(root, "passed", True, "1.2.0", self._real_digest())
        with self.assertRaisesRegex(DistributionError, "CERTIFICATION_PACKAGE_MISMATCH"):
            write_catalog(root)

        root = self._promotion_repo()
        self._write_certification(root, "passed", True, "1.3.2", "c" * 64)
        with self.assertRaisesRegex(DistributionError, "CERTIFICATION_PACKAGE_MISMATCH"):
            write_catalog(root)

    def test_promotion_requires_measured_expectations(self) -> None:
        root = self._promotion_repo()
        self._write_certification(root, "passed", True, "1.3.2", self._real_digest())
        with self.assertRaisesRegex(DistributionError, "EXPECTATION_SET_MISSING"):
            write_catalog(root)

        self._write_expectations(root, "c" * 64)
        with self.assertRaisesRegex(DistributionError, "EXPECTATION_DIGEST_MISMATCH"):
            write_catalog(root)

    def test_self_consistency_outcome_blocks_promotion(self) -> None:
        root = self._promotion_repo()
        self._write_certification(root, "passed", False, "1.3.2", self._real_digest(), outcome="self-consistency")
        with self.assertRaisesRegex(DistributionError, "CERT_SELF_CONSISTENCY_ONLY"):
            write_catalog(root)

    def test_current_certification_allows_catalog_promotion(self) -> None:
        root = self._promotion_repo()
        self._write_certification(root, "passed", True, "1.3.2", self._real_digest())
        self._write_expectations(root, self._real_digest())
        payload = write_catalog(root)
        self.assertEqual(sorted(["workbench-shell"]), payload["templates"])
        self.assertEqual([], check_catalog(root))

    def test_internal_skills_are_hidden_from_default_npx_list(self) -> None:
        public = {"ui-template-author", "ui-template-apply", "ui-template-design"}
        required_internal = {"ui-template-manager"}
        optional_internal = {
            "openspec-explore",
            "openspec-propose",
            "openspec-apply-change",
            "openspec-archive-change",
        }
        discovered: dict[str, bool] = {}
        # `.kiro/skills` 被 gitignore，只是本机安装目标，不能当发现源，否则会掩盖仓库缺 skill。
        for skill_md in sorted(
            list((ROOT / "skills").glob("*/SKILL.md"))
            + list((ROOT / ".agents/skills").glob("*/SKILL.md"))
        ):
            meta = _frontmatter(skill_md)
            name = meta.get("name")
            if not name:
                continue
            hidden = bool((meta.get("metadata") or {}).get("internal"))
            if name in discovered and discovered[name] != hidden:
                self.fail(f"conflicting internal flag for {name}")
            discovered[name] = hidden
        self.assertTrue(public <= set(discovered))
        for name in public:
            self.assertFalse(discovered[name], name)
        for name in required_internal:
            self.assertTrue(discovered.get(name), name)
        for name in optional_internal:
            if name in discovered:
                self.assertTrue(discovered[name], name)
        env = {key: value for key, value in os.environ.items() if key != "INSTALL_INTERNAL_SKILLS"}
        proc = subprocess.run(
            ["npx", "--yes", "skills", "add", ".", "--list"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
            env=env,
        )
        self.assertEqual(0, proc.returncode, proc.stderr + proc.stdout)
        text = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", proc.stdout + "\n" + proc.stderr)
        self.assertIn("Found 3 skills", text)
        for name in public:
            self.assertIsNotNone(re.search(rf"[│|]\s+{re.escape(name)}\s*$", text, re.M), text)
        for name in required_internal | optional_internal:
            self.assertIsNone(re.search(rf"[│|]\s+{re.escape(name)}\s*$", text, re.M), text)


if __name__ == "__main__":
    unittest.main()
