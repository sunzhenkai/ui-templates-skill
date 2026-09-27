from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_migrator import MigrationError, migrate
from template_validation.schema import SchemaStore

SOURCE = ROOT / "tests/fixtures/migrator/v1/legacy"


def tree_digest(path: Path) -> str:
    digest = hashlib.sha256()
    for item in sorted(p for p in path.rglob("*") if p.is_file()):
        digest.update(item.relative_to(path).as_posix().encode())
        digest.update(item.read_bytes())
    return digest.hexdigest()


class MigratorTests(unittest.TestCase):
    def test_non_destructive_candidate_and_report(self) -> None:
        before = tree_digest(SOURCE)
        with tempfile.TemporaryDirectory() as temp:
            candidate = Path(temp) / "candidate"
            report = migrate(SOURCE, candidate)
            self.assertEqual(tree_digest(SOURCE), before)
            self.assertTrue((candidate / "migration-report.json").is_file())
            self.assertTrue(report["converted"])
            self.assertTrue(report["inferred"])
            self.assertTrue(report["unresolved"])
            self.assertEqual(report["breaking"], [])
            self.assertEqual(yaml.safe_load((candidate / "meta.yaml").read_text())["schema_version"], 2)
            self.assertEqual(yaml.safe_load((candidate / "tokens.yaml").read_text())["schema_version"], 2)
            self.assertTrue((candidate / "evidence.yaml").is_file())
            self.assertIn("[NN-001]", (candidate / "spec.md").read_text())
            self.assertIn("@NN-002", (candidate / "apply/playbook.md").read_text())

    def test_repeat_run_is_byte_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            candidate = Path(temp) / "candidate"
            first = migrate(SOURCE, candidate)
            first_digest = tree_digest(candidate)
            second = migrate(SOURCE, candidate)
            self.assertEqual(first, second)
            self.assertEqual(tree_digest(candidate), first_digest)
            report = json.loads((candidate / "migration-report.json").read_text(encoding="utf-8"))
            ids = [entry["id"] for entry in yaml.safe_load((candidate / "evidence.yaml").read_text())["entries"]]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertEqual(report["migration"], "template-v1-to-v2")


    def test_candidate_passes_v2_schemas_and_unit_inference_is_auditable(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            candidate = Path(temp) / "candidate"
            report = migrate(SOURCE, candidate)
            store = SchemaStore(ROOT / "schemas/template/v2")
            for kind in ("meta", "tokens", "evidence"):
                data = yaml.safe_load((candidate / f"{kind}.yaml").read_text(encoding="utf-8"))
                self.assertEqual(store.errors(kind, data), [], kind)
            tokens = yaml.safe_load((candidate / "tokens.yaml").read_text(encoding="utf-8"))
            self.assertEqual(tokens["spacing"]["allowed"]["unit"], "px")
            self.assertEqual(tokens["typography"]["scale"]["body"]["value"]["size"], {"value": 14, "unit": "px"})
            self.assertEqual(tokens["motion"]["combo"]["value"]["offset"], {"value": 4, "unit": "px"})
            self.assertEqual(tokens["motion"]["combo"]["value"]["duration"], {"value": 200, "unit": "ms"})
            inferred_paths = {item["path"] for item in report["inferred"] if item["path"].endswith(".unit")}
            unresolved_paths = {item["path"] for item in report["unresolved"] if item["path"].endswith(".unit")}
            self.assertTrue({"spacing.allowed.unit", "typography.scale.body.size.unit"} <= inferred_paths)
            self.assertTrue(inferred_paths <= unresolved_paths)

    def test_candidate_ancestor_is_rejected_before_source_can_be_deleted(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            candidate = Path(temp) / "candidate-parent"
            source = candidate / "source"
            shutil.copytree(SOURCE, source)
            (candidate / ".migration-candidate.json").write_text("{}\n", encoding="utf-8")
            before = tree_digest(source)
            with self.assertRaises(MigrationError):
                migrate(source, candidate)
            self.assertTrue(source.is_dir())
            self.assertEqual(tree_digest(source), before)


if __name__ == "__main__":
    unittest.main()
