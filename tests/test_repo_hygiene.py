import re
import unittest

from _util import APPLY, AUTHOR, DESIGN, ROOT, run

BUDGET = {APPLY: 70, DESIGN: 60, AUTHOR: 80}


class RepoHygiene(unittest.TestCase):
    def test_no_project_names(self):
        result = run(ROOT / "scripts/check_no_project_names.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_registry_up_to_date(self):
        result = run(ROOT / "scripts/build_registry.py", "--check")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_catalog_in_sync(self):
        result = run(ROOT / "scripts/sync_catalog.py", "--check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_skill_size_budget(self):
        for skill, limit in BUDGET.items():
            lines = (skill / "SKILL.md").read_text(encoding="utf-8").count("\n")
            self.assertLessEqual(lines, limit, skill.name)
        for doc in [*APPLY.glob("steps/*.md"), *DESIGN.glob("references/*.md"), *AUTHOR.glob("references/*.md")]:
            self.assertLessEqual(doc.read_text(encoding="utf-8").count("\n"), 150, doc.name)

    def test_skill_front_matter(self):
        for skill in BUDGET:
            text = (skill / "SKILL.md").read_text(encoding="utf-8")
            m = re.match(r"---\nname: (\S+)\ndescription: (.+?)\n---\n", text, re.S)
            self.assertIsNotNone(m, skill.name)
            self.assertEqual(m.group(1), skill.name)
            self.assertLess(len(m.group(2)), 400)

    def test_relative_links_resolve(self):
        for doc in ROOT.glob("skills/**/*.md"):
            for target in re.findall(r"\]\(([^)#:]+)\)", doc.read_text(encoding="utf-8")):
                self.assertTrue((doc.parent / target).exists(), f"{doc.relative_to(ROOT)} → {target}")

    def test_doc_references_exist(self):
        """Paths named in backticks inside the skills must exist (scripts/, steps/, patterns/, references/)."""
        for skill in BUDGET:
            for doc in skill.rglob("*.md"):
                for ref in re.findall(r"`((?:scripts|steps|patterns|references)/[\w./-]+\.(?:py|md))`", doc.read_text(encoding="utf-8")):
                    self.assertTrue((skill / ref).exists(), f"{doc.relative_to(ROOT)} → {ref}")


if __name__ == "__main__":
    unittest.main()
