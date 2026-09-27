from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import promote_sample as promotion  # noqa: E402


class SamplePromotionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / "repo"
        self.repo.mkdir()
        (self.repo / "example/sample").mkdir(parents=True)
        (self.repo / "example/sample/README.md").write_text("sample\n", encoding="utf-8")
        (self.repo / "openspec/changes/sample-change").mkdir(parents=True)
        (self.repo / "openspec/changes/sample-change/proposal.md").write_text("change\n", encoding="utf-8")
        (self.repo / "evidence").mkdir()
        for name in promotion.GATE_NAMES:
            (self.repo / f"evidence/{name}.txt").write_text(f"{name}\n", encoding="utf-8")
        (self.repo / "governance").mkdir()
        shutil.copy2(ROOT / "governance/scope.yaml", self.repo / "governance/scope.yaml")
        (self.repo / "schemas/governance").mkdir(parents=True)
        shutil.copy2(
            ROOT / "schemas/governance/sample-promotion-report.schema.json",
            self.repo / "schemas/governance/sample-promotion-report.schema.json",
        )
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.name", "Promotion Test"], cwd=self.repo, check=True)
        subprocess.run(["git", "add", "."], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-q", "-m", "fixture"], cwd=self.repo, check=True)
        self.revision = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=self.repo, check=True, text=True, capture_output=True,
        ).stdout.strip()
        gates = {
            name: {
                "status": "passed",
                "command": f"touch should-not-run-{name}",
                "evidence": [f"evidence/{name}.txt"],
            }
            for name in promotion.GATE_NAMES
        }
        gates["frozen_install"]["frozen_identity"] = "lockfile-sha256:fixture"
        self.gates = self.repo / "gates.yaml"
        self.gates.write_text(yaml.safe_dump({"gates": gates}, sort_keys=False), encoding="utf-8")

    def build(self, sample: str = "example/sample") -> dict:
        return promotion.build_report(
            self.repo,
            sample,
            "sample-change",
            self.revision,
            self.gates,
            self.repo / "reports/promotion.json",
            scope_path=self.repo / "governance/scope.yaml",
            schema_path=self.repo / "schemas/governance/sample-promotion-report.schema.json",
        )

    def test_schema_is_valid_and_closes_all_gate_names(self) -> None:
        schema = json.loads((ROOT / "schemas/governance/sample-promotion-report.schema.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        self.assertEqual(set(promotion.GATE_NAMES), set(schema["properties"]["gates"]["required"]))

    def test_tracked_evidence_only_report_is_eligible_and_executes_nothing(self) -> None:
        report = self.build()
        self.assertEqual("eligible", report["decision"])
        self.assertTrue(report["sample"]["tracked"])
        self.assertEqual(self.revision, report["sample"]["revision"])
        self.assertEqual({"mode": "evidence-only", "commands_executed": False}, report["execution"])
        self.assertFalse(any(self.repo.glob("should-not-run-*")))
        self.assertTrue((self.repo / "reports/promotion.json").is_file())

    def test_missing_gate_or_untracked_evidence_blocks_report(self) -> None:
        document = yaml.safe_load(self.gates.read_text(encoding="utf-8"))
        del document["gates"]["localization"]
        self.gates.write_text(yaml.safe_dump(document, sort_keys=False), encoding="utf-8")
        with self.assertRaisesRegex(promotion.PromotionError, "PROMOTION_GATES_INCOMPLETE"):
            self.build()

        self.setUp_gates_again()
        document = yaml.safe_load(self.gates.read_text(encoding="utf-8"))
        document["gates"]["feedback"]["evidence"] = ["evidence/untracked.txt"]
        self.gates.write_text(yaml.safe_dump(document, sort_keys=False), encoding="utf-8")
        with self.assertRaisesRegex(promotion.PromotionError, "PROMOTION_EVIDENCE_UNTRACKED"):
            self.build()

    def setUp_gates_again(self) -> None:
        gates = {
            name: {"status": "passed", "command": "declared-only", "evidence": [f"evidence/{name}.txt"]}
            for name in promotion.GATE_NAMES
        }
        gates["frozen_install"]["frozen_identity"] = "lockfile-sha256:fixture"
        self.gates.write_text(yaml.safe_dump({"gates": gates}, sort_keys=False), encoding="utf-8")

    def test_web_v2_and_web_v3_are_rejected_before_git_sample_lookup(self) -> None:
        prefix = "example/workbench-shell/"
        for sample in (prefix + "web-v2", prefix + "web-v3"):
            with self.subTest(sample=sample), mock.patch.object(promotion, "tracked_revision") as tracked:
                with self.assertRaisesRegex(promotion.PromotionError, "PROMOTION_SAMPLE_EXCLUDED"):
                    self.build(sample)
                tracked.assert_not_called()

    def test_output_cannot_modify_sample_or_excluded_path(self) -> None:
        with self.assertRaisesRegex(promotion.PromotionError, "PROMOTION_OUTPUT_IN_SAMPLE"):
            promotion.build_report(
                self.repo, "example/sample", "sample-change", self.revision, self.gates,
                self.repo / "example/sample/promotion.json",
                scope_path=self.repo / "governance/scope.yaml",
                schema_path=self.repo / "schemas/governance/sample-promotion-report.schema.json",
            )


if __name__ == "__main__":
    unittest.main()
