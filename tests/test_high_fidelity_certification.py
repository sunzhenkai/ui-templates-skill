from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CERTIFICATION = ROOT / "governance/candidates/workbench-shell/certification"


class HighFidelityCertificationTests(unittest.TestCase):
    def test_accepted_certification_stays_valid(self) -> None:
        """report.yaml 通过认证后必须保持有效：这是晋级门禁的前提，回退即测试失败。"""
        process = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts/run_template_certification.py"),
                "verify",
                "--report", str(CERTIFICATION / "report.yaml"),
                "--inventory", str(CERTIFICATION / "inventory.yaml"),
                "--coverage-matrix", str(CERTIFICATION / "coverage-matrix.yaml"),
                "--package-root", str(ROOT / "governance/candidates/workbench-shell"),
                "--evidence-root", str(ROOT / "governance/candidates/workbench-shell"),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(0, process.returncode, process.stdout)
        payload = json.loads(process.stdout)
        self.assertTrue(payload["accepted"])
        self.assertEqual("certification-accepted", payload["outcome"])


if __name__ == "__main__":
    unittest.main()
