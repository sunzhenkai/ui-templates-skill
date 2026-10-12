import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_no_project_names as chk  # noqa: E402


class NoProjectNamesTest(unittest.TestCase):
    def test_skills_tree_has_no_project_names(self) -> None:
        proc = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "check_no_project_names.py")],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_word_boundary_and_allow_marker(self) -> None:
        pattern = chk.build_pattern(["demo-app", "zork"])
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "a.md").write_text(
                "virtual-demo/app ok\nzorkish dezork ok\nsee apps/demo-app here\n"
                "Zork repo\nzork mention project-name-allow\n",
                encoding="utf-8",
            )
            hits = chk.scan([base], pattern, set())
        self.assertEqual(len(hits), 2, hits)
        self.assertTrue(any(":3:" in h for h in hits))
        self.assertTrue(any(":4:" in h for h in hits))


if __name__ == "__main__":
    unittest.main()
