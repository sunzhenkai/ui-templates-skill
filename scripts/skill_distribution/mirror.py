from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any, Callable

import yaml

from .config import PUBLIC_SKILLS, DistributionError, expand_files, load_config, scan_forbidden_public_data
from .manifest import sha256_bytes, validate_references, validate_trigger_resources

MIRROR_MANIFEST = ".ui-template-public-manifest.yaml"
ReplaceFunction = Callable[[str | bytes | os.PathLike[str] | os.PathLike[bytes], str | bytes | os.PathLike[str] | os.PathLike[bytes]], None]
MANAGED_DIRECTORIES = {
    "ui-template-author": frozenset({"references", "evals", "runtime", "catalog"}),
    "ui-template-apply": frozenset({"references", "evals"}),
}


def _filesystem_device(path: Path) -> int:
    return path.stat().st_dev


def _require_same_filesystem(stage: Path, target: Path) -> None:
    anchor = target if target.exists() else target.parent
    if _filesystem_device(stage) != _filesystem_device(anchor):
        raise DistributionError(
            f"CROSS_FILESYSTEM_ATOMIC_REPLACE_UNSUPPORTED: stage={stage} target={target}"
        )


def _expected(repo_root: Path, config_path: Path | None = None) -> tuple[Any, dict[str, bytes]]:
    config = load_config(repo_root, config_path)
    scan_forbidden_public_data(repo_root, config)
    mappings = expand_files(repo_root, config, shared=False)
    payload = {mapping.destination: mapping.source.read_bytes() for mapping in mappings}
    validate_references(payload)
    validate_trigger_resources(payload)
    return config, payload


def _manifest(config: Any, payload: dict[str, bytes]) -> bytes:
    document = {
        "schema_version": 1,
        "config": config.path.name,
        "bundle_version": config.bundle_version,
        "skills": {
            skill: {
                "version": config.skill_versions[skill],
                "files": [
                    {
                        "path": path.removeprefix(f"skills/{skill}/"),
                        "sha256": sha256_bytes(value),
                    }
                    for path, value in sorted(payload.items())
                    if path.startswith(f"skills/{skill}/")
                ],
            }
            for skill in PUBLIC_SKILLS
        },
    }
    return yaml.safe_dump(document, allow_unicode=True, sort_keys=False).encode("utf-8")


def _safe_relative(value: str) -> bool:
    path = PurePosixPath(value)
    return (
        bool(value)
        and value != "."
        and bool(path.parts)
        and not path.is_absolute()
        and ".." not in path.parts
        and "\\" not in value
        and value == path.as_posix()
    )


def _managed_relative(skill: str, value: str) -> bool:
    parts = PurePosixPath(value).parts
    return value == "SKILL.md" or (
        len(parts) >= 2 and parts[0] in MANAGED_DIRECTORIES[skill]
    )


def _managed_from_manifest(path: Path) -> dict[str, set[str]]:
    managed = {skill: set() for skill in PUBLIC_SKILLS}
    if not path.exists():
        return managed
    if path.is_symlink() or not path.is_file():
        raise DistributionError(f"MIRROR_MANIFEST_UNSAFE: {path}")
    try:
        document = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        raise DistributionError(f"MIRROR_MANIFEST_INVALID: {path}: {exc}") from exc
    if not isinstance(document, dict) or document.get("schema_version") != 1:
        raise DistributionError(f"MIRROR_MANIFEST_INVALID: {path}")
    skills = document.get("skills")
    if not isinstance(skills, dict) or set(skills) != set(PUBLIC_SKILLS):
        raise DistributionError(f"MIRROR_MANIFEST_INVALID: {path}")
    for skill in PUBLIC_SKILLS:
        entry = skills.get(skill)
        files = entry.get("files") if isinstance(entry, dict) else None
        if not isinstance(files, list):
            raise DistributionError(f"MIRROR_MANIFEST_INVALID: {path}")
        for item in files:
            relative = item.get("path") if isinstance(item, dict) else None
            if (
                not isinstance(relative, str)
                or not _safe_relative(relative)
                or not _managed_relative(skill, relative)
                or relative in managed[skill]
            ):
                raise DistributionError(f"MIRROR_MANIFEST_PATH_INVALID: {skill}/{relative}")
            managed[skill].add(relative)
    return managed


def _read_managed_file(root: Path, relative: str) -> bytes | None:
    path = root / relative
    current = root
    for part in PurePosixPath(relative).parts:
        current = current / part
        if current.is_symlink():
            raise DistributionError(f"MIRROR_MANAGED_SYMLINK: {root.name}/{relative}")
    if not path.is_file():
        return None
    return path.read_bytes()


def check_mirror(repo_root: Path, mirror_skills: Path, *, config_path: Path | None = None) -> list[str]:
    config, payload = _expected(repo_root.resolve(), config_path)
    findings: list[str] = []
    manifest_path = mirror_skills / MIRROR_MANIFEST
    previous = _managed_from_manifest(manifest_path)
    for skill in PUBLIC_SKILLS:
        prefix = f"skills/{skill}/"
        expected = {path.removeprefix(prefix): value for path, value in payload.items() if path.startswith(prefix)}
        root = mirror_skills / skill
        for path, value in sorted(expected.items()):
            try:
                actual = _read_managed_file(root, path)
            except DistributionError:
                findings.append(f"MIRROR_FILE_CHANGED {skill}/{path}")
                continue
            if actual is None:
                findings.append(f"MIRROR_FILE_MISSING {skill}/{path}")
            elif actual != value:
                findings.append(f"MIRROR_FILE_CHANGED {skill}/{path}")
        for path in sorted(previous[skill] - set(expected)):
            stale = root / path
            if stale.exists() or stale.is_symlink():
                findings.append(f"MIRROR_FILE_UNMANAGED {skill}/{path}")
    expected_manifest = _manifest(config, payload)
    if not manifest_path.is_file() or manifest_path.is_symlink():
        findings.append(f"MIRROR_MANIFEST_MISSING {MIRROR_MANIFEST}")
    elif manifest_path.read_bytes() != expected_manifest:
        findings.append(f"MIRROR_MANIFEST_CHANGED {MIRROR_MANIFEST}")
    return findings


def _remove(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    elif path.exists() or path.is_symlink():
        path.unlink()


def _safe_staged_path(root: Path, relative: str) -> Path:
    current = root
    for part in PurePosixPath(relative).parts:
        current = current / part
        if current.is_symlink():
            raise DistributionError(f"MIRROR_STAGED_SYMLINK: {root.name}/{relative}")
    return current


def write_mirror(
    repo_root: Path,
    mirror_skills: Path,
    *,
    config_path: Path | None = None,
    replace: ReplaceFunction = os.replace,
    fail_after_skill: str | None = None,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    mirror_skills = mirror_skills.resolve()
    config, payload = _expected(repo_root, config_path)
    mirror_skills.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".ui-template-mirror-", dir=mirror_skills.parent))
    prepared = stage / "prepared"
    backups = stage / "backups"
    prepared.mkdir()
    backups.mkdir()
    states: list[tuple[Path, Path | None]] = []
    manifest_path = mirror_skills / MIRROR_MANIFEST
    old_manifest = manifest_path.read_bytes() if manifest_path.is_file() and not manifest_path.is_symlink() else None
    manifest_replaced = False
    try:
        _require_same_filesystem(stage, mirror_skills)
        previous = _managed_from_manifest(manifest_path)
        for skill in PUBLIC_SKILLS:
            current = mirror_skills / skill
            staged_skill = prepared / skill
            if current.is_symlink() or (current.exists() and not current.is_dir()):
                raise DistributionError(f"MIRROR_TARGET_UNSAFE: {current}")
            if current.is_dir():
                shutil.copytree(current, staged_skill, symlinks=True)
            else:
                staged_skill.mkdir(parents=True)
            for relative in sorted(previous[skill]):
                stale = _safe_staged_path(staged_skill, relative)
                if stale.exists() or stale.is_symlink():
                    _remove(stale)
            prefix = f"skills/{skill}/"
            for destination, value in sorted(payload.items()):
                if not destination.startswith(prefix):
                    continue
                relative = destination.removeprefix(prefix)
                path = _safe_staged_path(staged_skill, relative)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(value)
        mirror_skills.mkdir(parents=True, exist_ok=True)
        for skill in PUBLIC_SKILLS:
            current = mirror_skills / skill
            staged_skill = prepared / skill
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
                raise DistributionError(f"INJECTED_MIRROR_FAILURE: {skill}")
        staged_manifest = stage / MIRROR_MANIFEST
        staged_manifest.write_bytes(_manifest(config, payload))
        replace(staged_manifest, manifest_path)
        manifest_replaced = True
        findings = check_mirror(repo_root, mirror_skills, config_path=config_path)
        if findings:
            raise DistributionError(f"MIRROR_POST_WRITE_FAILED: {findings}")
        return {"target": str(mirror_skills), "files": len(payload), "bundle_version": config.bundle_version}
    except Exception as exc:
        rollback_failures: list[str] = []
        for current, backup in reversed(states):
            try:
                if current.exists() or current.is_symlink():
                    _remove(current)
                if backup is not None and backup.exists():
                    replace(backup, current)
            except Exception as rollback_exc:  # pragma: no cover - catastrophic filesystem failure
                rollback_failures.append(f"{current.name}: {rollback_exc}")
        if manifest_replaced:
            try:
                if manifest_path.exists() or manifest_path.is_symlink():
                    _remove(manifest_path)
                if old_manifest is not None:
                    restored_manifest = stage / ".restored-manifest"
                    restored_manifest.write_bytes(old_manifest)
                    replace(restored_manifest, manifest_path)
            except Exception as rollback_exc:  # pragma: no cover - catastrophic filesystem failure
                rollback_failures.append(f"manifest: {rollback_exc}")
        if rollback_failures:
            raise DistributionError(f"MIRROR_ROLLBACK_FAILED: {rollback_failures}; cause={exc}") from exc
        if isinstance(exc, DistributionError):
            raise
        raise DistributionError(f"MIRROR_WRITE_FAILED: {exc}") from exc
    finally:
        shutil.rmtree(stage, ignore_errors=True)
