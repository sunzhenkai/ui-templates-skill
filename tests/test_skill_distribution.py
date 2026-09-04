from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from skill_distribution.builder import build_bundle  # noqa: E402
from skill_distribution.config import DistributionError, load_config  # noqa: E402
from skill_distribution.installer import install_bundle  # noqa: E402
from skill_distribution.manifest import validate_trigger_resources  # noqa: E402
from skill_distribution.mirror import check_mirror, write_mirror  # noqa: E402
from template_validation.schema import SchemaStore  # noqa: E402


class SkillDistributionTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repo = self.base / "repo"
        self.repo.mkdir()
        shutil.copytree(ROOT / "skills/ui-template", self.repo / "skills/ui-template")
        shutil.copytree(ROOT / "skills/ui-template-apply", self.repo / "skills/ui-template-apply")
        shutil.copytree(ROOT / "governance/release", self.repo / "governance/release")
        shutil.copy2(ROOT / "LICENSE", self.repo / "LICENSE")
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.name", "Distribution Test"], cwd=self.repo, check=True)
        subprocess.run(["git", "add", "LICENSE", "governance", "skills"], cwd=self.repo, check=True)
        env = {**os.environ, "GIT_AUTHOR_DATE": "2026-09-04T00:00:00Z", "GIT_COMMITTER_DATE": "2026-09-04T00:00:00Z"}
        subprocess.run(["git", "commit", "-q", "-m", "fixture"], cwd=self.repo, check=True, env=env)

    def build(self, name: str = "dist"):
        return build_bundle(self.repo, self.base / name)

    @staticmethod
    def tree_digest(path: Path) -> str:
        digest = hashlib.sha256()
        if not path.exists():
            return "missing"
        for file in sorted(item for item in path.rglob("*") if item.is_file()):
            digest.update(file.relative_to(path).as_posix().encode())
            digest.update(b"\0")
            digest.update(file.read_bytes())
            digest.update(b"\0")
        return digest.hexdigest()

    def write_archive(
        self,
        name: str,
        entries: list[tuple[str, bytes, bytes | None, str]],
    ) -> tuple[Path, Path]:
        artifact = self.base / name
        with tarfile.open(artifact, "w:gz") as archive:
            for member_name, value, member_type, link_name in entries:
                info = tarfile.TarInfo(member_name)
                info.type = member_type or tarfile.REGTYPE
                info.linkname = link_name
                if info.isfile():
                    info.size = len(value)
                    archive.addfile(info, io.BytesIO(value))
                else:
                    archive.addfile(info)
        digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
        checksum = artifact.with_name(artifact.name + ".sha256")
        checksum.write_text(f"{digest}  {artifact.name}\n", encoding="utf-8")
        return artifact, checksum

    def rewrite_bundle(
        self,
        built,
        name: str,
        mutate,
    ) -> tuple[Path, Path]:
        entries: list[tuple[str, bytes, bytes | None, str]] = []
        with tarfile.open(built.artifact, "r:gz") as archive:
            for member in archive.getmembers():
                stream = archive.extractfile(member)
                entries.append((member.name, stream.read() if stream else b"", None, ""))
        mutate(entries)
        return self.write_archive(name, entries)

    def test_versioned_allowlist_and_explicit_exclusions(self) -> None:
        config = load_config(self.repo)
        self.assertEqual("2.0.0", config.bundle_version)
        self.assertEqual({"ui-template": "2.0.0", "ui-template-apply": "2.0.0"}, config.skill_versions)
        self.assertEqual((2, 2), (config.template_schema_minimum, config.template_schema_maximum))
        exclusions = set(config.exclusions)
        for required in (
            ".agents/skills/ui-template-manager/**", ".agents/skills/openspec-*/**",
            ".kiro/skills/**", "skills/*/patches/**", "skills/*/experience/**",
            "skills/*/examples/**", "openspec/**", "governance/scope.yaml",
            "governance/baselines/**", "docs/**", "example/**", "semantic-review/**",
            "**/ui-ux-pro-max/**",
        ):
            self.assertIn(required, exclusions)
        self.assertNotIn("ui-template-manager", config.public_includes)
        release = self.repo / "governance/release"
        self.assertEqual(config.bundle_version, (release / "VERSION").read_text().strip())
        compatibility = yaml.safe_load((release / "compatibility.yaml").read_text())
        self.assertEqual("unsupported-explicit-migration-required", compatibility["compatibility"][1]["status"])
        self.assertEqual(1, compatibility["fidelity_schema"]["minimum"])
        self.assertEqual(1, compatibility["fidelity_schema"]["maximum"])
        self.assertEqual(["repo-structural-v1"], compatibility["fidelity_profile"]["supported"])
        self.assertEqual("legacy-baseline", compatibility["fidelity_profile"]["baseline"])
        self.assertEqual("fail-closed", compatibility["fidelity_profile"]["unknown"])
        self.assertIn("fidelity-profile-unknown-fail-closed", compatibility["breaking_boundaries"])
        self.assertIn("破坏性版本", (release / "CHANGELOG.md").read_text())
        self.assertIn("不会静默读取 v1", (release / "MIGRATION-v1-to-v2.md").read_text())
        self.assertIn("任一目录替换失败", (release / "ROLLBACK.md").read_text())

    def test_reproducible_bundle_manifest_tar_metadata_and_forbidden_data(self) -> None:
        first = self.build("first")
        second = self.build("second")
        self.assertEqual(first.checksum, second.checksum)
        self.assertEqual(first.artifact.read_bytes(), second.artifact.read_bytes())
        self.assertEqual(first.manifest_bytes, second.manifest_bytes)
        schema = SchemaStore(ROOT / "schemas/template/v2")
        self.assertEqual([], schema.errors("skills-manifest", first.manifest))
        dependency_versions = {
            item["subject"].removesuffix(" runtime dependency"): item.get("version")
            for item in first.manifest["licenses"]
            if item["subject"].endswith(" runtime dependency")
        }
        self.assertEqual({
            "PyYAML": "6.0.3",
            "jsonschema": "4.25.1",
            "attrs": "26.1.0",
            "jsonschema-specifications": "2025.9.1",
            "referencing": "0.37.0",
            "rpds-py": "2026.6.3",
        }, dependency_versions)
        paths = [item["path"] for item in first.manifest["files"]]
        self.assertEqual(sorted(paths), paths)
        self.assertIn("LICENSE", paths)
        self.assertIn("VERSION", paths)
        self.assertIn("CHANGELOG.md", paths)
        self.assertIn("skills/ui-template/runtime/validate_templates.py", paths)
        self.assertIn("skills/ui-template/runtime/run_contract_evals.py", paths)
        self.assertIn("skills/ui-template/runtime/schemas/template/fidelity/v1/fidelity.schema.json", paths)
        self.assertIn("skills/ui-template/runtime/template_authoring/profile.py", paths)
        self.assertIn("skills/ui-template/runtime/template_validation/fidelity.py", paths)
        self.assertIn("skills/ui-template/runtime/template_apply_state/fidelity.py", paths)
        self.assertIn("skills/ui-template-apply/SKILL.md", paths)
        with tarfile.open(first.artifact, "r:gz") as archive:
            members = archive.getmembers()
            self.assertEqual(sorted(item.name for item in members), [item.name for item in members])
            expected_mtime = first.manifest["generator"]["revision_time"]
            self.assertTrue(all((item.mtime, item.uid, item.gid) == (expected_mtime, 0, 0) for item in members))
        injected = self.repo / "skills/ui-template/data/ui-ux-pro-max/catalog.json"
        injected.parent.mkdir(parents=True)
        injected.write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(DistributionError, "FORBIDDEN_PUBLIC_DATA"):
            self.build("forbidden")
        injected.unlink()
        external = self.base / "external.py"
        external.write_text("print('outside')\n", encoding="utf-8")
        linked = self.repo / "skills/ui-template/runtime/linked.py"
        linked.symlink_to(external)
        with self.assertRaisesRegex(DistributionError, "PUBLIC_SOURCE_SYMLINK"):
            self.build("symlink-source")

    def test_empty_install_stale_cleanup_unrelated_and_history_preserved(self) -> None:
        built = self.build()
        target = self.base / "project/.agents/skills"
        unrelated = target / "other-skill/keep.txt"
        unrelated.parent.mkdir(parents=True)
        unrelated.write_text("keep", encoding="utf-8")
        result = install_bundle(built.artifact, target)
        self.assertEqual("2.0.0", result["bundle_version"])
        self.assertTrue((target / "ui-template/SKILL.md").is_file())
        self.assertTrue((target / "ui-template-apply/SKILL.md").is_file())
        self.assertEqual("keep", unrelated.read_text(encoding="utf-8"))
        stale = target / "ui-template/references/stale-managed.md"
        stale.write_text("stale", encoding="utf-8")
        history = target / "ui-template/patches/history/result.md"
        history.parent.mkdir(parents=True)
        history.write_text("audit", encoding="utf-8")
        install_bundle(built.artifact, target)
        self.assertFalse(stale.exists())
        self.assertEqual("audit", history.read_text(encoding="utf-8"))
        self.assertEqual("keep", unrelated.read_text(encoding="utf-8"))

    def test_checksum_failure_and_injected_second_skill_failure_leave_previous_install(self) -> None:
        built = self.build()
        target = self.base / "project/.agents/skills"
        install_bundle(built.artifact, target)
        before_authoring = self.tree_digest(target / "ui-template")
        before_apply = self.tree_digest(target / "ui-template-apply")
        corrupt = self.base / built.artifact.name
        corrupt.write_bytes(built.artifact.read_bytes() + b"corrupt")
        shutil.copy2(built.checksum_file, corrupt.with_name(corrupt.name + ".sha256"))
        with self.assertRaisesRegex(DistributionError, "ARTIFACT_CHECKSUM_MISMATCH"):
            install_bundle(corrupt, target)
        self.assertEqual(before_authoring, self.tree_digest(target / "ui-template"))
        self.assertEqual(before_apply, self.tree_digest(target / "ui-template-apply"))
        with self.assertRaisesRegex(DistributionError, "INJECTED_INSTALL_FAILURE"):
            install_bundle(built.artifact, target, fail_after_skill="ui-template-apply")
        self.assertEqual(before_authoring, self.tree_digest(target / "ui-template"))
        self.assertEqual(before_apply, self.tree_digest(target / "ui-template-apply"))

        corrupted_once = False

        def corrupting_replace(source, destination):
            nonlocal corrupted_once
            os.replace(source, destination)
            destination_path = Path(destination)
            source_path = Path(source)
            if (
                not corrupted_once
                and destination_path.name == "ui-template-apply"
                and "payload" in source_path.parts
            ):
                corrupted_once = True
                (destination_path / "SKILL.md").write_text("corrupted after replace", encoding="utf-8")

        with self.assertRaisesRegex(DistributionError, "INSTALL_POST_VERIFY_FAILED"):
            install_bundle(built.artifact, target, replace=corrupting_replace)
        self.assertEqual(before_authoring, self.tree_digest(target / "ui-template"))
        self.assertEqual(before_apply, self.tree_digest(target / "ui-template-apply"))

    def test_archive_traversal_symlink_duplicate_and_manifest_boundaries_fail_closed(self) -> None:
        target = self.base / "project/.agents/skills"
        unsafe_cases = {
            "traversal.tar.gz": [("../escape", b"escape", None, "")],
            "symlink.tar.gz": [("skills/ui-template/SKILL.md", b"", tarfile.SYMTYPE, "../../escape")],
            "hardlink.tar.gz": [("skills/ui-template/SKILL.md", b"", tarfile.LNKTYPE, "../../escape")],
            "duplicate.tar.gz": [
                ("skills-manifest.yaml", b"first", None, ""),
                ("skills-manifest.yaml", b"second", None, ""),
            ],
        }
        for name, entries in unsafe_cases.items():
            with self.subTest(name=name):
                artifact, checksum = self.write_archive(name, entries)
                expected = "ARCHIVE_MEMBER_DUPLICATE" if name.startswith("duplicate") else "ARCHIVE_MEMBER_UNSAFE"
                with self.assertRaisesRegex(DistributionError, expected):
                    install_bundle(artifact, target, checksum_file=checksum)
        self.assertFalse(target.exists())

        built = self.build()

        def duplicate_manifest(entries):
            for index, (name, value, member_type, link_name) in enumerate(entries):
                if name == "skills-manifest.yaml":
                    document = yaml.safe_load(value)
                    document["files"].append(dict(document["files"][0]))
                    entries[index] = (name, yaml.safe_dump(document, sort_keys=False).encode(), member_type, link_name)
                    return
            self.fail("manifest missing from fixture")

        duplicate_artifact, duplicate_checksum = self.rewrite_bundle(
            built, "manifest-duplicate.tar.gz", duplicate_manifest,
        )
        with self.assertRaisesRegex(DistributionError, "MANIFEST_PATH_DUPLICATE"):
            install_bundle(duplicate_artifact, target, checksum_file=duplicate_checksum)

        def outside_boundary(entries):
            extra = b"repository-only"
            for index, (name, value, member_type, link_name) in enumerate(entries):
                if name == "skills-manifest.yaml":
                    document = yaml.safe_load(value)
                    document["files"].append({
                        "path": "repository-only.txt",
                        "sha256": hashlib.sha256(extra).hexdigest(),
                        "license": "MIT",
                    })
                    document["files"].sort(key=lambda item: item["path"])
                    entries[index] = (name, yaml.safe_dump(document, sort_keys=False).encode(), member_type, link_name)
                    break
            entries.append(("repository-only.txt", extra, None, ""))

        boundary_artifact, boundary_checksum = self.rewrite_bundle(
            built, "manifest-boundary.tar.gz", outside_boundary,
        )
        with self.assertRaisesRegex(DistributionError, "MANIFEST_PATH_INVALID"):
            install_bundle(boundary_artifact, target, checksum_file=boundary_checksum)
        self.assertFalse(target.exists())

    def test_cross_filesystem_preflight_fails_before_install_or_mirror_mutation(self) -> None:
        built = self.build()
        target = self.base / "project/.agents/skills"
        install_bundle(built.artifact, target)
        before_authoring = self.tree_digest(target / "ui-template")
        before_apply = self.tree_digest(target / "ui-template-apply")
        with mock.patch(
            "skill_distribution.installer._filesystem_device",
            side_effect=[1, 2],
        ):
            with self.assertRaisesRegex(DistributionError, "CROSS_FILESYSTEM"):
                install_bundle(built.artifact, target)
        self.assertEqual(before_authoring, self.tree_digest(target / "ui-template"))
        self.assertEqual(before_apply, self.tree_digest(target / "ui-template-apply"))

        mirror = self.base / "mirror/.agents/skills"
        write_mirror(self.repo, mirror)
        mirror_authoring = self.tree_digest(mirror / "ui-template")
        mirror_apply = self.tree_digest(mirror / "ui-template-apply")
        with mock.patch(
            "skill_distribution.mirror._filesystem_device",
            side_effect=[1, 2],
        ):
            with self.assertRaisesRegex(DistributionError, "CROSS_FILESYSTEM"):
                write_mirror(self.repo, mirror)
        self.assertEqual(mirror_authoring, self.tree_digest(mirror / "ui-template"))
        self.assertEqual(mirror_apply, self.tree_digest(mirror / "ui-template-apply"))

    def test_dual_trigger_resources_and_portable_validator_eval_run_after_install(self) -> None:
        built = self.build()
        target = self.base / "project/.agents/skills"
        install_bundle(built.artifact, target)
        payload = {
            item["path"]: (target.parent / item["path"]).read_bytes()
            for item in built.manifest["files"]
            if item["path"].startswith("skills/")
        }
        validate_trigger_resources(payload)
        eval_proc = subprocess.run(
            [sys.executable, str(target / "ui-template/runtime/run_contract_evals.py"), "--no-baseline"],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, eval_proc.returncode, eval_proc.stderr + eval_proc.stdout)
        report = json.loads(eval_proc.stdout)
        self.assertEqual({"declared": 31, "parsed": 31, "executed": 31, "script": 29, "llm": 2}, report["counts"])
        self.assertTrue(report["discovery"]["example_excluded"])
        self.assertIn("example/**", report["discovery"]["exclusions"])
        portable_templates = self.base / "project/templates"
        shutil.copytree(
            ROOT / "tests/fixtures/validator/good/templates",
            portable_templates,
        )
        validator_proc = subprocess.run(
            [
                sys.executable, str(target / "ui-template/runtime/validate_templates.py"),
                str(portable_templates / "good-template"),
                "--index", str(portable_templates / "INDEX.md"), "--json",
            ],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, validator_proc.returncode, validator_proc.stderr + validator_proc.stdout)
        self.assertEqual(0, json.loads(validator_proc.stdout)["exit_code"])


    def test_install_rejects_non_skills_parent_and_symlink_target(self) -> None:
        built = self.build()
        with self.assertRaisesRegex(DistributionError, "INSTALL_TARGET_PARENT_INVALID"):
            install_bundle(built.artifact, self.base / "project/.agents")
        real = self.base / "real-skills"
        real.mkdir()
        linked = self.base / "project/.agents/skills"
        linked.parent.mkdir(parents=True)
        linked.symlink_to(real, target_is_directory=True)
        with self.assertRaisesRegex(DistributionError, "INSTALL_TARGET_SYMLINK_UNSAFE"):
            install_bundle(built.artifact, linked)
    def test_mirror_changed_reference_deleted_source_fail_history_only_passes(self) -> None:
        mirror = self.base / "mirror/.agents/skills"
        manager = mirror / "ui-template-manager/SKILL.md"
        manager.parent.mkdir(parents=True)
        manager.write_text("manager", encoding="utf-8")
        unrelated = mirror / "ui-template/local-only/keep.txt"
        unrelated.parent.mkdir(parents=True)
        unrelated.write_text("unmanaged", encoding="utf-8")
        write_mirror(self.repo, mirror)
        self.assertEqual([], check_mirror(self.repo, mirror))
        self.assertEqual("manager", manager.read_text(encoding="utf-8"))
        self.assertEqual("unmanaged", unrelated.read_text(encoding="utf-8"))
        manifest_path = mirror / ".ui-template-public-manifest.yaml"
        original_manifest = manifest_path.read_bytes()
        forged = yaml.safe_load(original_manifest)
        forged["skills"]["ui-template"]["files"].append({
            "path": "local-only/keep.txt",
            "sha256": hashlib.sha256(b"unmanaged").hexdigest(),
        })
        manifest_path.write_text(yaml.safe_dump(forged, sort_keys=False), encoding="utf-8")
        with self.assertRaisesRegex(DistributionError, "MIRROR_MANIFEST_PATH_INVALID"):
            write_mirror(self.repo, mirror)
        self.assertEqual("unmanaged", unrelated.read_text(encoding="utf-8"))
        manifest_path.write_bytes(original_manifest)
        history = mirror / "ui-template/experience/successes/history.md"
        history.parent.mkdir(parents=True)
        history.write_text("history only", encoding="utf-8")
        self.assertEqual([], check_mirror(self.repo, mirror))
        changed = mirror / "ui-template/references/source-web.md"
        changed.write_text(changed.read_text(encoding="utf-8") + "\ndrift\n", encoding="utf-8")
        self.assertTrue(any("MIRROR_FILE_CHANGED" in item for item in check_mirror(self.repo, mirror)))
        write_mirror(self.repo, mirror)
        self.assertEqual("history only", history.read_text(encoding="utf-8"))
        self.assertEqual("unmanaged", unrelated.read_text(encoding="utf-8"))
        before_authoring = self.tree_digest(mirror / "ui-template")
        before_apply = self.tree_digest(mirror / "ui-template-apply")
        with self.assertRaisesRegex(DistributionError, "INJECTED_MIRROR_FAILURE"):
            write_mirror(self.repo, mirror, fail_after_skill="ui-template-apply")
        self.assertEqual(before_authoring, self.tree_digest(mirror / "ui-template"))
        self.assertEqual(before_apply, self.tree_digest(mirror / "ui-template-apply"))
        source = self.repo / "skills/ui-template/runtime/schemas/eval/result.schema.json"
        source.unlink()
        findings = check_mirror(self.repo, mirror)
        self.assertIn(
            "MIRROR_FILE_UNMANAGED ui-template/runtime/schemas/eval/result.schema.json",
            findings,
        )


if __name__ == "__main__":
    unittest.main()
