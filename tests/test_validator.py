from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_validation.validator import validate_paths

FIXTURE = ROOT / "tests/fixtures/validator/good"
MUTATIONS = json.loads((ROOT / "tests/fixtures/validator/mutations/cases.json").read_text(encoding="utf-8"))


def set_path(document, dotted: str, value):
    node = document
    parts = dotted.split(".")
    for part in parts[:-1]:
        node = node[part]
    node[parts[-1]] = value


def apply_mutation(root: Path, case: dict) -> None:
    template = root / "templates/good-template"
    kind = case["mutation"]
    if kind == "token-value":
        path = template / "tokens.yaml"
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        set_path(data, case["path"], case["value"])
        extra = case.get("also", [])
        for index in range(0, len(extra), 2):
            set_path(data, extra[index], extra[index + 1])
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    elif kind == "remove-evidence":
        path = template / "evidence.yaml"
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        data["entries"] = [entry for entry in data["entries"] if entry["path"] != case["path"]]
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    elif kind == "set-evidence-field":
        path = template / "evidence.yaml"
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        entry = next(item for item in data["entries"] if item["id"] == case["evidence_id"])
        entry[case["field"]] = case["value"]
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    elif kind == "append-source":
        path = template / "meta.yaml"
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        data["sources"].append(case["value"])
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    elif kind == "append-evidence":
        path = template / "evidence.yaml"
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        data["entries"].append(case["value"])
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    elif kind == "unitless-integer-copy":
        tokens_path = template / "tokens.yaml"
        tokens = yaml.safe_load(tokens_path.read_text(encoding="utf-8"))
        tokens.setdefault("grid", {})["columns"] = {"value": case["value"], "unit": "unitless", "origin": "source"}
        tokens_path.write_text(yaml.safe_dump(tokens, sort_keys=False), encoding="utf-8")
        evidence_path = template / "evidence.yaml"
        evidence = yaml.safe_load(evidence_path.read_text(encoding="utf-8"))
        evidence["entries"].append({
            "id": "evidence-grid-columns", "kind": "token", "path": "grid.columns",
            "origin": "source", "method": "document", "source_id": "source-001",
            "source_revision": "rev-1", "locator": "fixture.md#grid", "status": "active",
            "confidence": "medium", "captured_at": "2026-09-03T00:00:00Z",
        })
        evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
        playbook = template / "apply/playbook.md"
        playbook.write_text(playbook.read_text(encoding="utf-8") + case["text"], encoding="utf-8")
    else:
        path = (template / case["file"]).resolve()
        if kind == "append":
            path.write_text(path.read_text(encoding="utf-8") + case["value"], encoding="utf-8")
        elif kind == "replace":
            path.write_text(path.read_text(encoding="utf-8").replace(case["old"], case["value"]), encoding="utf-8")
        elif kind == "create":
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(case["value"], encoding="utf-8")


class ValidatorTests(unittest.TestCase):
    def copied_fixture(self, temp: str) -> Path:
        root = Path(temp) / "fixture"
        shutil.copytree(FIXTURE, root)
        return root

    def test_good_fixture_passes_with_nonzero_pairs(self) -> None:
        result = validate_paths([FIXTURE / "templates"], ROOT)
        self.assertFalse(result.failed, [f.to_dict() for f in result.findings])
        self.assertTrue(result.contrast)
        self.assertTrue(all(counts["checked"] > 0 for counts in result.contrast.values()))

    def test_all_mutations_fail_with_expected_codes(self) -> None:
        self.assertEqual(len(MUTATIONS), 21)
        for case in MUTATIONS:
            with self.subTest(case=case["id"]), tempfile.TemporaryDirectory() as temp:
                root = self.copied_fixture(temp)
                apply_mutation(root, case)
                result = validate_paths([root / "templates"], ROOT)
                self.assertTrue(result.failed)
                matches = [finding for finding in result.findings if finding.code == case["expected"]]
                self.assertTrue(matches, [finding.to_dict() for finding in result.findings])
                if "expected_path" in case:
                    self.assertTrue(
                        any(finding.path.endswith(case["expected_path"]) for finding in matches),
                        [finding.to_dict() for finding in matches],
                    )

    def test_aggregate_all_findings(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            apply_mutation(root, MUTATIONS[0])
            apply_mutation(root, MUTATIONS[2])
            result = validate_paths([root / "templates"], ROOT)
            codes = {finding.code for finding in result.findings}
            self.assertIn("CONTRAST_TOO_LOW", codes)
            self.assertIn("RULE_REFERENCE_DANGLING", codes)

    def test_human_json_findings_and_exit_codes_match(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            apply_mutation(root, MUTATIONS[0])
            command = [sys.executable, str(ROOT / "scripts/validate_templates.py"), str(root / "templates")]
            human = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
            machine1 = subprocess.run([*command, "--json"], cwd=ROOT, text=True, capture_output=True)
            machine2 = subprocess.run([*command, "--json"], cwd=ROOT, text=True, capture_output=True)
            self.assertNotEqual(human.returncode, 0)
            self.assertEqual(human.returncode, machine1.returncode)
            self.assertEqual(machine1.stdout, machine2.stdout)
            payload = json.loads(machine1.stdout)
            codes = [item["code"] for item in payload["findings"]]
            for code in codes:
                self.assertIn(code, human.stdout)
            self.assertEqual(payload["exit_code"], 1)


    def test_waiver_expiry_and_backgroundless_alpha_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            template = root / "templates/good-template"
            tokens_path = template / "tokens.yaml"
            meta_path = template / "meta.yaml"
            tokens = yaml.safe_load(tokens_path.read_text(encoding="utf-8"))
            tokens["themes"]["light"]["foreground"]["value"] = "oklch(0.95 0 0)"
            tokens_path.write_text(yaml.safe_dump(tokens, sort_keys=False), encoding="utf-8")
            meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
            meta["waivers"] = [{"rule_id": "NN-001", "pair": "foreground/background", "reason": "临时兼容", "expires_at_template_version": "3.0.0"}]
            meta_path.write_text(yaml.safe_dump(meta, sort_keys=False), encoding="utf-8")
            valid = validate_paths([root / "templates"], ROOT)
            self.assertNotIn("CONTRAST_TOO_LOW", {item.code for item in valid.findings})
            self.assertEqual(valid.contrast["good-template/light"]["waived"], 1)
            meta["waivers"][0]["expires_at_template_version"] = "2.0.0"
            meta_path.write_text(yaml.safe_dump(meta, sort_keys=False), encoding="utf-8")
            expired = validate_paths([root / "templates"], ROOT)
            codes = {item.code for item in expired.findings}
            self.assertIn("WAIVER_EXPIRED", codes)
            self.assertIn("CONTRAST_TOO_LOW", codes)
            tokens["themes"]["light"]["background"]["value"] = "#ffffff80"
            tokens_path.write_text(yaml.safe_dump(tokens, sort_keys=False), encoding="utf-8")
            unresolved = validate_paths([root / "templates"], ROOT)
            self.assertIn("CONTRAST_BACKGROUND_UNRESOLVED", {item.code for item in unresolved.findings})

    def test_theme_coverage_confidence_asset_and_duplicate_key_guards(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            template = root / "templates/good-template"
            tokens_path = template / "tokens.yaml"
            meta_path = template / "meta.yaml"
            evidence_path = template / "evidence.yaml"
            tokens = yaml.safe_load(tokens_path.read_text(encoding="utf-8"))
            del tokens["themes"]["dark"]["ring"]
            tokens_path.write_text(yaml.safe_dump(tokens, sort_keys=False), encoding="utf-8")
            meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
            meta["confidence"]["overall"] = "high"
            meta["coverage"]["platforms"]["defaulted"] = ["web"]
            meta_path.write_text(yaml.safe_dump(meta, sort_keys=False), encoding="utf-8")
            evidence = yaml.safe_load(evidence_path.read_text(encoding="utf-8"))
            evidence["entries"].append({"id": "evidence-asset", "kind": "asset", "path": "assets/private.png", "origin": "source", "method": "capture", "source_id": "source-001", "source_revision": "rev-1", "locator": "screen", "status": "active", "confidence": "medium", "captured_at": "2026-09-03T00:00:00Z"})
            evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
            result = validate_paths([root / "templates"], ROOT)
            codes = {item.code for item in result.findings}
            self.assertTrue({"THEME_ROLE_MISMATCH", "COVERAGE_OVERLAP", "CONFIDENCE_OVERSTATED", "ASSET_PROVENANCE_MISSING"} <= codes)
            tokens_path.write_text("schema_version: 2\nschema_version: 2\nthemes: {}\n", encoding="utf-8")
            duplicate = validate_paths([root / "templates"], ROOT)
            self.assertIn("DATA_LOAD_ERROR", {item.code for item in duplicate.findings})

    def test_split_apply_verification_feedback_links_and_playbook(self) -> None:
        schema_good = json.loads((ROOT / "tests/fixtures/schema/good.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            template = root / "templates/good-template"
            (template / "layout.md").write_text("# Layout\n\n- [QUALITY-001] 质量规则。\n", encoding="utf-8")
            verification = schema_good["verification"]
            verification["records"][0]["rule_id"] = "QUALITY-001"
            (template / "verification.json").write_text(json.dumps(verification, ensure_ascii=False), encoding="utf-8")
            feedback_dir = template / "feedback"
            feedback_dir.mkdir()
            feedback = schema_good["feedback"]
            feedback["targets"] = ["QUALITY-001"]
            (feedback_dir / "feedback.yaml").write_text(yaml.safe_dump(feedback, sort_keys=False, allow_unicode=True), encoding="utf-8")
            playbook = template / "apply/playbook.md"
            playbook.write_text(playbook.read_text(encoding="utf-8") + "\n- 检查 @QUALITY-001。\n", encoding="utf-8")
            valid = validate_paths([root / "templates"], ROOT)
            self.assertNotIn("RULE_REFERENCE_DANGLING", {item.code for item in valid.findings})
            verification["records"][0]["rule_id"] = "QUALITY-999"
            (template / "verification.json").write_text(json.dumps(verification), encoding="utf-8")
            feedback["targets"] = ["QUALITY-998"]
            (feedback_dir / "feedback.yaml").write_text(yaml.safe_dump(feedback, sort_keys=False), encoding="utf-8")
            (template / "spec.md").write_text((template / "spec.md").read_text(encoding="utf-8") + "\n[断链](missing.md)\n", encoding="utf-8")
            playbook.unlink()
            invalid = validate_paths([root / "templates"], ROOT)
            codes = {item.code for item in invalid.findings}
            self.assertTrue({"RULE_REFERENCE_DANGLING", "LINK_BROKEN", "APPLY_PLAYBOOK_MISSING"} <= codes)

    def test_actual_assets_require_one_active_provenance_record(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            template = root / "templates/good-template"
            asset = template / "assets/private.png"
            asset.parent.mkdir()
            asset.write_bytes(b"fixture")
            missing = validate_paths([root / "templates"], ROOT)
            self.assertIn("ASSET_EVIDENCE_COUNT", {item.code for item in missing.findings})

            evidence_path = template / "evidence.yaml"
            evidence = yaml.safe_load(evidence_path.read_text(encoding="utf-8"))
            entry = {
                "id": "evidence-private-asset", "kind": "asset", "path": "assets/private.png",
                "origin": "source", "method": "capture", "source_id": "source-001",
                "source_revision": "rev-1", "locator": "fixture.md#asset", "status": "active",
                "confidence": "medium", "captured_at": "2026-09-03T00:00:00Z", "license": "MIT",
                "redistribution": "allowed", "redaction": "none",
            }
            evidence["entries"].append(entry)
            evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
            valid = validate_paths([root / "templates"], ROOT)
            self.assertNotIn("ASSET_EVIDENCE_COUNT", {item.code for item in valid.findings})
            self.assertNotIn("ASSET_EVIDENCE_DANGLING", {item.code for item in valid.findings})

            evidence["entries"][-1]["redistribution"] = "prohibited"
            evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
            prohibited = validate_paths([root / "templates"], ROOT)
            self.assertIn("ASSET_REDISTRIBUTION_PROHIBITED", {item.code for item in prohibited.findings})
            evidence["entries"][-1]["redistribution"] = "allowed"
            evidence["entries"][-1]["redaction"] = "required"
            evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
            required = validate_paths([root / "templates"], ROOT)
            self.assertIn("ASSET_REDACTION_REQUIRED", {item.code for item in required.findings})
            evidence["entries"][-1]["redaction"] = "none"

            duplicate = dict(entry, id="evidence-private-asset-copy")
            evidence["entries"].append(duplicate)
            evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
            duplicated = validate_paths([root / "templates"], ROOT)
            self.assertIn("ASSET_EVIDENCE_COUNT", {item.code for item in duplicated.findings})
            asset.unlink()
            dangling = validate_paths([root / "templates"], ROOT)
            self.assertIn("ASSET_EVIDENCE_DANGLING", {item.code for item in dangling.findings})

    def test_focus_ring_is_checked_against_every_declared_surface(self) -> None:
        for surface in ("card", "popover", "sidebar"):
            with self.subTest(surface=surface), tempfile.TemporaryDirectory() as temp:
                root = self.copied_fixture(temp)
                template = root / "templates/good-template"
                tokens_path = template / "tokens.yaml"
                evidence_path = template / "evidence.yaml"
                tokens = yaml.safe_load(tokens_path.read_text(encoding="utf-8"))
                evidence = yaml.safe_load(evidence_path.read_text(encoding="utf-8"))
                foreground_role = f"{surface}-foreground"
                for theme, surface_color, foreground in (("light", "#000000", "#ffffff"), ("dark", "#202020", "#ffffff")):
                    tokens["themes"][theme][surface] = {"value": surface_color, "origin": "source"}
                    tokens["themes"][theme][foreground_role] = {"value": foreground, "origin": "source"}
                    for role in (surface, foreground_role):
                        evidence["entries"].append({
                            "id": f"evidence-{theme}-{role}", "kind": "token", "path": f"themes.{theme}.{role}",
                            "origin": "source", "method": "document", "source_id": "source-001",
                            "source_revision": "rev-1", "locator": f"fixture.md#{theme}-{role}",
                            "status": "active", "confidence": "medium", "captured_at": "2026-09-03T00:00:00Z",
                        })
                tokens_path.write_text(yaml.safe_dump(tokens, sort_keys=False), encoding="utf-8")
                evidence_path.write_text(yaml.safe_dump(evidence, sort_keys=False), encoding="utf-8")
                result = validate_paths([root / "templates"], ROOT)
                failures = [item for item in result.findings if item.code == "CONTRAST_TOO_LOW"]
                self.assertTrue(any(
                    item.details.get("pair") == f"ring/{surface}" and item.details.get("theme") == "light"
                    for item in failures
                ))

    def test_recursive_engineering_paths_and_token_derived_precision_fail(self) -> None:
        prohibited = ("nested/src/domain.ts", "api/client.txt", "data/model.json", "package.json", "nested/vite.config.ts")
        for relative in prohibited:
            with self.subTest(relative=relative), tempfile.TemporaryDirectory() as temp:
                root = self.copied_fixture(temp)
                path = root / "templates/good-template" / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture", encoding="utf-8")
                result = validate_paths([root / "templates"], ROOT)
                self.assertIn("PROHIBITED_ENGINEERING_PATH", {item.code for item in result.findings})

        with tempfile.TemporaryDirectory() as temp:
            root = self.copied_fixture(temp)
            template = root / "templates/good-template"
            playbook = template / "apply/playbook.md"
            playbook.write_text(playbook.read_text(encoding="utf-8") + "\n- 复制 50%、45deg、1.25、14px 和 2s。\n", encoding="utf-8")
            result = validate_paths([root / "templates"], ROOT)
            finding = next(item for item in result.findings if item.code == "APPLY_PRECISION_DUPLICATION")
            copied = {item["value"] for item in finding.details["copied"]}
            self.assertTrue({"50%", "45deg", "1.25", "14px", "2s"} <= copied)


if __name__ == "__main__":
    unittest.main()
