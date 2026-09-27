from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
APPLY = ROOT / "skills/ui-template-apply/runtime"
FIXTURES = ROOT / "tests/fixtures/design-system"
ACTIVE = FIXTURES / "active/increment"


class DesignApplyTests(unittest.TestCase):
    def test_vendor_manifest_is_valid_and_resolves_by_binding(self) -> None:
        code, report = self.validate(ACTIVE, vendor=ROOT / "skills/ui-template-apply/references/vendor/vendor.yaml")
        self.assertEqual(0, code, report)
        self.assertTrue(report["valid"], report)
        process = subprocess.run(
            [sys.executable, str(APPLY / "resolve_vendor_refs.py"), "--binding", str(ACTIVE / "binding.yaml"), "--vendor-manifest", str(ROOT / "skills/ui-template-apply/references/vendor/vendor.yaml")],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, process.returncode, process.stderr)
        payload = json.loads(process.stdout)
        self.assertEqual({"component-system:shadcn", "style-engine:tailwind", "token-projection:tailwind-v4", "visual-direction"}, set(payload["triggers"]))
        self.assertEqual({"frontend-design", "shadcn", "tailwind-css-patterns", "tailwind-design-system"}, {item["name"] for item in payload["allowed"]})

    def test_impact_resume_reopens_only_dependent_phases(self) -> None:
        contract = yaml.safe_load((ACTIVE / "design-system.yaml").read_text(encoding="utf-8"))
        binding = yaml.safe_load((ACTIVE / "binding.yaml").read_text(encoding="utf-8"))
        checkpoint = {
            "schema": "design-system-apply-checkpoint/v1",
            "mode": "increment",
            "change_set": ["tokens"],
            "contract": {"id": contract["id"], "version": contract["version"], "digest": contract["contract_digest"]},
            "binding_digest": binding["binding_digest"],
            "projection_digests": [{"name": item["name"], "digest": item["digest"]} for item in binding["projections"]],
            "stable_ids": ["primitive/button"],
            "output_root": "app",
            "build_identity": "fixture-build",
            "phases": [{"id": phase, "status": "complete"} for phase in range(10)],
        }
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "checkpoint.yaml"
            path.write_text(yaml.safe_dump(checkpoint, sort_keys=False), encoding="utf-8")
            process = subprocess.run(
                [sys.executable, str(APPLY / "check_apply_resume.py"), str(path), "--design-root", str(ACTIVE), "--json"],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            payload = json.loads(process.stdout)
            self.assertEqual(0, process.returncode, payload)
            self.assertFalse(payload["blocked"])
            self.assertEqual([1, 4, 5, 6, 7, 8], payload["reopened_phases"])

    def test_digest_mismatch_blocks_selective_resume(self) -> None:
        contract = yaml.safe_load((ACTIVE / "design-system.yaml").read_text(encoding="utf-8"))
        binding = yaml.safe_load((ACTIVE / "binding.yaml").read_text(encoding="utf-8"))
        contract["contract_digest"]["value"] = "0" * 64
        checkpoint = {
            "schema": "design-system-apply-checkpoint/v1", "mode": "increment", "change_set": ["tokens"],
            "contract": {"id": contract["id"], "version": contract["version"], "digest": contract["contract_digest"]},
            "binding_digest": binding["binding_digest"],
            "projection_digests": [{"name": item["name"], "digest": item["digest"]} for item in binding["projections"]],
            "stable_ids": [], "output_root": "app", "build_identity": "fixture-build",
            "phases": [{"id": phase, "status": "complete"} for phase in range(10)],
        }
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "checkpoint.yaml"
            path.write_text(yaml.safe_dump(checkpoint, sort_keys=False), encoding="utf-8")
            process = subprocess.run(
                [sys.executable, str(APPLY / "check_apply_resume.py"), str(path), "--design-root", str(ACTIVE), "--json"],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            payload = json.loads(process.stdout)
            self.assertNotEqual(0, process.returncode)
            self.assertTrue(payload["blocked"])
            self.assertEqual(list(range(10)), payload["reopened_phases"])

    def validate(self, target: Path, *, vendor: Path | None = None):
        command = [sys.executable, str(ROOT / "scripts/validate_design_system.py"), "validate", str(target), "--kind", "active"]
        if vendor:
            command += ["--vendor", str(vendor)]
        process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
        return process.returncode, json.loads(process.stdout)

    def test_apply_skill_declares_active_and_vendor_gates(self) -> None:
        skill = (ROOT / "skills/ui-template-apply/SKILL.md").read_text(encoding="utf-8")
        reference = (ROOT / "skills/ui-template-apply/references/active-implementation.md").read_text(encoding="utf-8")
        for required in ("bootstrap | increment", "adopt-only", "design-system/v1", "resolve_vendor_refs.py", "ownership: package | binding | apply-skill"):
            self.assertIn(required, skill)
        for required in ("Impact-based Resume", "frontend-design", "tailwind-design-system", "design-system-feedback/v1", "UPSTREAM"):
            self.assertIn(required, reference)


if __name__ == "__main__":
    unittest.main()
