from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CERTIFICATION = ROOT / "governance/candidates/workbench-shell/certification"


class HighFidelityCertificationTests(unittest.TestCase):
    def test_pending_oracle_candidate_cannot_be_accepted(self) -> None:
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
        self.assertNotEqual(0, process.returncode, process.stderr)
        payload = json.loads(process.stdout)
        self.assertFalse(payload["accepted"])
        codes = {failure["code"] for failure in payload["failures"]}
        self.assertIn("CERT_ACTIVE_INSTANCE_REQUIRED", codes)
        self.assertIn("CERT_PACKAGE_FEEDBACK_OPEN", codes)
        self.assertIn("CERT_ASSERTION_COVERAGE_INCOMPLETE", codes)
        self.assertIn("CERT_COVERAGE_MATRIX_PENDING", codes)


if __name__ == "__main__":
    unittest.main()
