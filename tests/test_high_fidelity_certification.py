from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from template_apply_state.fidelity import derive_scenario_ids
from validate_design_system import canonical_digest


CANDIDATE = ROOT / "governance/candidates/workbench-shell-contracts"
CERTIFICATION = CANDIDATE / "certification"


class HighFidelityCertificationTests(unittest.TestCase):
    def _base_argv(self) -> list[str]:
        return [
            sys.executable, str(ROOT / "scripts/run_template_certification.py"), "verify",
            "--report", str(CERTIFICATION / "report.yaml"),
            "--inventory", str(CERTIFICATION / "inventory.yaml"),
            "--coverage-matrix", str(CERTIFICATION / "coverage-matrix.yaml"),
            "--expectations", str(CANDIDATE / "measured-expectations.yaml"),
            "--package-root", str(CANDIDATE),
            "--evidence-root", str(CANDIDATE),
            "--output-root", "/tmp/workbench-contracts-cert-web-03",
            "--oracle-revision", "200dcb44cc1527ef24a1c892e9c3e5508377b386",
        ]

    def _write_checkpoint(self, root: Path, *, full_coverage: bool = True, build_identity: str | None = None) -> Path:
        report = yaml.safe_load((CERTIFICATION / "report.yaml").read_text(encoding="utf-8"))
        build_identity = build_identity or report["gate"]["build"]["identity"]
        artifact_source = CERTIFICATION / "current-output/08-contract-verification.json"
        apply_root = root / "apply"
        apply_root.mkdir(parents=True, exist_ok=True)
        artifact = apply_root / "08-verification.json"
        artifact_data = json.loads(artifact_source.read_text())
        if full_coverage:
            profile = yaml.safe_load((CANDIDATE / "active-instance/fidelity.yaml").read_text(encoding="utf-8"))
            layout = yaml.safe_load((CANDIDATE / "active-instance/core/layout.yaml").read_text(encoding="utf-8"))
            primitives = yaml.safe_load((CANDIDATE / "active-instance/core/primitives.yaml").read_text(encoding="utf-8"))
            expectations = yaml.safe_load((CANDIDATE / "measured-expectations.yaml").read_text(encoding="utf-8"))
            expected = derive_scenario_ids(profile, layout, expectations, primitives)
            artifact_data["records"].append({
                "id": "00000000-0000-4000-8000-000000000000",
                "rule_id": "QUALITY-101", "status": "passed",
                "expected": "all derived scenarios", "actual": "all derived scenarios covered",
                "route": "/dev/design-system", "viewport": "desktop", "theme": "light", "state": "ready",
                "scenario_ids": expected, "evidence_refs": ["evidence/contract-gallery.json"],
            })
        checkpoint = {
            "schema": "design-system-apply-checkpoint/v1",
            "mode": "bootstrap",
            "contract": {
                "id": report["gate"]["package"]["id"],
                "version": report["gate"]["package"]["version"],
                "digest": report["gate"]["package"]["digest"],
            },
            "binding_digest": report["gate"]["active_instance"]["binding_digest"],
            "build_identity": build_identity,
            "source_identity": "source-blind:active-instance:200dcb44cc1527ef24a1c892e9c3e5508377b386",
            "template": {
                "name": "workbench-shell", "version": "3.1.0",
                "digest": {"algorithm": "sha256-canonical-json-v1", "value": "d8cef8100400273b6c0ab17c2fcfbafbc42d07bdcc63513c483f32e478f43454"},
            },
            "phases": [
                {"id": phase, "status": "complete" if phase == 8 else "pending", "artifacts": []}
                for phase in range(10)
            ],
        }
        artifact_data["template_digest"] = checkpoint["template"]["digest"]
        artifact_data["source_identity"] = checkpoint["source_identity"]
        artifact_data["build_identity"] = checkpoint["build_identity"]
        artifact.write_text(json.dumps(artifact_data, indent=2) + "\n")
        digest = canonical_digest(artifact_data)
        phase8 = next(item for item in checkpoint["phases"] if item["id"] == 8)
        phase8["status"] = "complete"
        phase8["artifacts"] = [{"path": "08-verification.json", "digest": {"algorithm": "sha256-canonical-json-v1", "value": digest}}]
        evidence_dir = apply_root / "evidence"
        evidence_dir.mkdir(exist_ok=True)
        # The checkpoint under test is synthetic; synthesize the referenced
        # evidence locally instead of depending on leftover candidate
        # artifacts (which cleanup commits may remove).
        (evidence_dir / "contract-gallery.json").write_text(
            json.dumps({"records": len(artifact_data["records"])}, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (evidence_dir / "contract-gallery.png").write_bytes(
            bytes.fromhex(
                "89504e470d0a1a0a0000000d494844520000000100000001080600000"
                "01f15c4890000000d4944415478da63fcffff3f030005fe02fea73581460000000049454e44ae426082"
            )
        )
        path = apply_root / "checkpoint.yaml"
        path.write_text(yaml.safe_dump(checkpoint, sort_keys=False, allow_unicode=True), encoding="utf-8")
        return path

    def test_missing_apply_checkpoint_blocks_certification(self) -> None:
        """certification 不得接受没有普通 Apply checkpoint 的高保真构建。"""
        process = subprocess.run(self._base_argv(), cwd=ROOT, text=True, capture_output=True, check=False)
        self.assertNotEqual(0, process.returncode, process.stdout)
        payload = json.loads(process.stdout)
        self.assertFalse(payload["accepted"])
        self.assertIn(
            "CERT_APPLY_CHECKPOINT_REQUIRED",
            {error["code"] for error in payload["result"]["errors"]},
        )

    def test_bound_apply_checkpoint_certifies(self) -> None:
        """绑定 contract/binding/build 的 Apply checkpoint 可通过 certification verify。"""
        with tempfile.TemporaryDirectory() as temp:
            checkpoint = self._write_checkpoint(Path(temp))
            process = subprocess.run(
                self._base_argv() + ["--apply-checkpoint", str(checkpoint)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertEqual(0, process.returncode, process.stdout)
            payload = json.loads(process.stdout)
            self.assertTrue(payload["accepted"])
            self.assertEqual("certification-accepted", payload["outcome"])
            self.assertTrue(payload["result"]["apply_checkpoint"]["valid"])

    def test_partial_phase8_coverage_blocks_certification(self) -> None:
        """23 条 Primitive contract 记录不能替代 187 个派生 scenario。"""
        with tempfile.TemporaryDirectory() as temp:
            checkpoint = self._write_checkpoint(Path(temp), full_coverage=False)
            process = subprocess.run(
                self._base_argv() + ["--apply-checkpoint", str(checkpoint)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertNotEqual(0, process.returncode, process.stdout)
            payload = json.loads(process.stdout)
            self.assertFalse(payload["accepted"])
            errors = payload["result"]["errors"]
            self.assertIn("CERT_APPLY_CHECKPOINT_SCENARIO_COVERAGE_MISSING", {error["code"] for error in errors})
            coverage = payload["result"]["apply_checkpoint"]["scenario_coverage"]
            self.assertEqual(187, coverage["expected_count"])
            self.assertLess(coverage["covered_count"], coverage["expected_count"])

    def test_checkpoint_contract_drift_blocks_certification(self) -> None:
        """checkpoint contract 与 certification package 失配时必须 fail closed。"""
        with tempfile.TemporaryDirectory() as temp:
            checkpoint = self._write_checkpoint(Path(temp))
            document = yaml.safe_load(checkpoint.read_text(encoding="utf-8"))
            document["contract"]["version"] = "0.0.0"
            checkpoint.write_text(yaml.safe_dump(document, sort_keys=False, allow_unicode=True), encoding="utf-8")
            process = subprocess.run(
                self._base_argv() + ["--apply-checkpoint", str(checkpoint)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertNotEqual(0, process.returncode, process.stdout)
            payload = json.loads(process.stdout)
            self.assertFalse(payload["accepted"])
            self.assertIn(
                "CERT_APPLY_CHECKPOINT_CONTRACT_MISMATCH",
                {error["code"] for error in payload["result"]["errors"]},
            )

    def test_measured_expectations_stay_bound_to_report(self) -> None:
        """Expectation set 的 prompts/oracle/package binding 不容许漂移。"""
        import shutil
        from validate_design_system import validate_expectations

        report = CERTIFICATION / "report.yaml"
        package = CANDIDATE
        source = CANDIDATE / "measured-expectations.yaml"
        accepted = validate_expectations(source, package_root=package, certification_report=report)
        self.assertEqual([], accepted["errors"], accepted)

        with tempfile.TemporaryDirectory() as temp:
            stale = yaml.safe_load(source.read_text(encoding="utf-8"))
            stale["prompts_digest"] = dict(stale["prompts_digest"], value="c" * 64)
            path = Path(temp) / "measured-expectations.yaml"
            path.write_text(yaml.safe_dump(stale, sort_keys=False, allow_unicode=True), encoding="utf-8")
            result = validate_expectations(path, package_root=package, certification_report=report)
            self.assertIn(
                "EXPECTATION_PROMPTS_DIGEST_MISMATCH",
                {error["code"] for error in result["errors"]},
            )


if __name__ == "__main__":
    unittest.main()
