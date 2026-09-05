from __future__ import annotations

import os
import re
import subprocess
import sys
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from skill_distribution.catalog import check_catalog  # noqa: E402


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
        self.assertTrue((ROOT / "skills/ui-template-author/catalog/workbench-shell/spec.md").is_file())
        production = yaml.safe_load((ROOT / "templates/workbench-shell/meta.yaml").read_text(encoding="utf-8"))
        catalog = yaml.safe_load(
            (ROOT / "skills/ui-template-author/catalog/workbench-shell/meta.yaml").read_text(encoding="utf-8")
        )
        self.assertEqual(production["template_version"], catalog["template_version"])

    def test_internal_skills_are_hidden_from_default_npx_list(self) -> None:
        public = {"ui-template-author", "ui-template-apply"}
        internal = {
            "ui-template-manager",
            "openspec-explore",
            "openspec-propose",
            "openspec-apply-change",
            "openspec-archive-change",
        }
        discovered: dict[str, bool] = {}
        for skill_md in sorted(
            list((ROOT / "skills").glob("*/SKILL.md"))
            + list((ROOT / ".agents/skills").glob("*/SKILL.md"))
            + list((ROOT / ".kiro/skills").glob("*/SKILL.md"))
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
        for name in internal:
            self.assertTrue(discovered.get(name), name)
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
        self.assertIn("Found 2 skills", text)
        for name in public:
            self.assertIsNotNone(re.search(rf"[│|]\s+{re.escape(name)}\s*$", text, re.M), text)
        for name in internal:
            self.assertIsNone(re.search(rf"[│|]\s+{re.escape(name)}\s*$", text, re.M), text)


if __name__ == "__main__":
    unittest.main()
