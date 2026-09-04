from __future__ import annotations

import os
import re
import shutil
import tarfile
import tempfile
from pathlib import Path, PurePosixPath
from typing import Callable

from .config import DistributionError, PUBLIC_SKILLS
from .manifest import load_manifest, sha256_bytes, validate_manifest_payload

ReplaceFunction = Callable[[str | bytes | os.PathLike[str] | os.PathLike[bytes], str | bytes | os.PathLike[str] | os.PathLike[bytes]], None]
SHA256 = re.compile(r"[0-9a-f]{64}\Z")


def _filesystem_device(path: Path) -> int:
    return path.stat().st_dev


def _require_same_filesystem(stage: Path, target: Path) -> None:
    anchor = target if target.exists() else target.parent
    if _filesystem_device(stage) != _filesystem_device(anchor):
        raise DistributionError(
            f"CROSS_FILESYSTEM_ATOMIC_REPLACE_UNSUPPORTED: stage={stage} target={target}"
        )


def _checksum_from_sidecar(path: Path, artifact: Path) -> str:
    try:
        parts = path.read_text(encoding="utf-8").strip().split()
    except (OSError, UnicodeError) as exc:
        raise DistributionError(f"ARTIFACT_CHECKSUM_READ_FAILED: {path}") from exc
    if (
        len(parts) != 2
        or parts[1].lstrip("*") != artifact.name
        or SHA256.fullmatch(parts[0]) is None
    ):
        raise DistributionError(f"ARTIFACT_CHECKSUM_INVALID: {path}")
    return parts[0]


def _extract_verified(artifact: Path, destination: Path) -> tuple[dict, dict[str, bytes]]:
    members: dict[str, bytes] = {}
    try:
        with tarfile.open(artifact, "r:gz") as archive:
            for member in archive.getmembers():
                path = PurePosixPath(member.name)
                if (
                    not member.isfile()
                    or path.is_absolute()
                    or ".." in path.parts
                    or "\\" in member.name
                    or member.name != path.as_posix()
                ):
                    raise DistributionError(f"ARCHIVE_MEMBER_UNSAFE: {member.name}")
                if member.name in members:
                    raise DistributionError(f"ARCHIVE_MEMBER_DUPLICATE: {member.name}")
                stream = archive.extractfile(member)
                if stream is None:
                    raise DistributionError(f"ARCHIVE_MEMBER_UNREADABLE: {member.name}")
                members[member.name] = stream.read()
    except (OSError, tarfile.TarError) as exc:
        raise DistributionError(f"ARCHIVE_READ_FAILED: {artifact}: {exc}") from exc
    manifest_bytes = members.pop("skills-manifest.yaml", None)
    if manifest_bytes is None:
        raise DistributionError("MANIFEST_MISSING")
    manifest = load_manifest(manifest_bytes)
    validate_manifest_payload(manifest, members)
    for relative, value in members.items():
        path = destination / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(value)
    return manifest, members


def _preserve_archives(current: Path, staged: Path, archive_directories: tuple[str, ...]) -> None:
    for name in archive_directories:
        source = current / name
        destination = staged / name
        if source.is_symlink():
            raise DistributionError(f"INSTALL_ARCHIVE_SYMLINK_UNSAFE: {current.name}/{name}")
        if source.is_dir() and not destination.exists():
            shutil.copytree(source, destination, symlinks=True)


def _remove_path(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    elif path.exists() or path.is_symlink():
        path.unlink()


def _verify_installed_skill(
    current: Path,
    expected: dict[str, bytes],
    archive_directories: tuple[str, ...],
) -> None:
    actual: dict[str, bytes] = {}
    for path in sorted(current.rglob("*")):
        relative = path.relative_to(current)
        if relative.parts and relative.parts[0] in archive_directories:
            continue
        if path.is_symlink():
            raise DistributionError(f"INSTALLED_SYMLINK_UNSAFE: {current.name}/{relative.as_posix()}")
        if path.is_file():
            actual[relative.as_posix()] = path.read_bytes()
    if set(actual) != set(expected):
        raise DistributionError(
            f"INSTALL_FILE_SET_MISMATCH: {current.name}: "
            f"missing={sorted(set(expected) - set(actual))} "
            f"unexpected={sorted(set(actual) - set(expected))}"
        )
    changed = [path for path in sorted(expected) if actual[path] != expected[path]]
    if changed:
        raise DistributionError(f"INSTALL_POST_VERIFY_FAILED: {current.name}: {changed}")


def install_bundle(
    artifact: Path,
    target_skills: Path,
    *,
    checksum_file: Path | None = None,
    archive_directories: tuple[str, ...] = ("patches", "experience"),
    replace: ReplaceFunction = os.replace,
    fail_after_skill: str | None = None,
) -> dict:
    artifact = artifact.resolve()
    checksum_path = (checksum_file or artifact.with_name(artifact.name + ".sha256")).resolve()
    expected = _checksum_from_sidecar(checksum_path, artifact)
    actual = sha256_bytes(artifact.read_bytes())
    if actual != expected:
        raise DistributionError(f"ARTIFACT_CHECKSUM_MISMATCH: expected={expected} actual={actual}")
    raw_target = target_skills.expanduser().absolute()
    if raw_target.is_symlink():
        raise DistributionError(f"INSTALL_TARGET_SYMLINK_UNSAFE: {raw_target}")
    if raw_target == Path(raw_target.anchor) or raw_target.name != "skills":
        raise DistributionError(
            f"INSTALL_TARGET_PARENT_INVALID: expected a skills parent directory, got {raw_target}"
        )
    target_skills = raw_target.resolve()
    target_skills.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".ui-template-install-", dir=target_skills.parent))
    extracted = stage / "payload"
    extracted.mkdir()
    backups = stage / "backups"
    backups.mkdir()
    states: list[tuple[Path, Path | None]] = []
    try:
        _require_same_filesystem(stage, target_skills)
        manifest, members = _extract_verified(artifact, extracted)
        expected_by_skill = {
            skill: {
                path.removeprefix(f"skills/{skill}/"): value
                for path, value in members.items()
                if path.startswith(f"skills/{skill}/")
            }
            for skill in PUBLIC_SKILLS
        }
        for skill in PUBLIC_SKILLS:
            current = target_skills / skill
            staged_skill = extracted / "skills" / skill
            if not staged_skill.is_dir():
                raise DistributionError(f"PUBLIC_SKILL_MISSING: {skill}")
            if current.is_symlink() or (current.exists() and not current.is_dir()):
                raise DistributionError(f"INSTALL_TARGET_UNSAFE: {current}")
            if current.exists():
                _preserve_archives(current, staged_skill, archive_directories)
        target_skills.mkdir(parents=True, exist_ok=True)
        for skill in PUBLIC_SKILLS:
            current = target_skills / skill
            staged_skill = extracted / "skills" / skill
            backup = backups / skill if current.exists() else None
            if backup is not None:
                replace(current, backup)
            states.append((current, backup))
            try:
                replace(staged_skill, current)
            except Exception:
                if backup is not None and backup.exists() and not current.exists():
                    replace(backup, current)
                states.pop()
                raise
            if fail_after_skill == skill:
                raise DistributionError(f"INJECTED_INSTALL_FAILURE: {skill}")
        for skill in PUBLIC_SKILLS:
            _verify_installed_skill(
                target_skills / skill,
                expected_by_skill[skill],
                archive_directories,
            )
        return {
            "bundle_version": manifest["bundle_version"],
            "skills": dict(manifest["skills"]),
            "checksum": actual,
            "target": str(target_skills),
        }
    except Exception as exc:
        rollback_failures: list[str] = []
        for current, backup in reversed(states):
            try:
                if current.exists() or current.is_symlink():
                    _remove_path(current)
                if backup is not None and backup.exists():
                    replace(backup, current)
            except Exception as rollback_exc:  # pragma: no cover - catastrophic filesystem failure
                rollback_failures.append(f"{current.name}: {rollback_exc}")
        if rollback_failures:
            raise DistributionError(f"INSTALL_ROLLBACK_FAILED: {rollback_failures}; cause={exc}") from exc
        if isinstance(exc, DistributionError):
            raise
        raise DistributionError(f"INSTALL_FAILED: {exc}") from exc
    finally:
        shutil.rmtree(stage, ignore_errors=True)
