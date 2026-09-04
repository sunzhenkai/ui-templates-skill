from __future__ import annotations

import fnmatch
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

import yaml

PUBLIC_SKILLS = ("ui-template", "ui-template-apply")
CONFIG_PATH = "governance/release/distribution-v1.yaml"


class DistributionError(RuntimeError):
    pass


@dataclass(frozen=True)
class FileMapping:
    source: Path
    destination: str
    skill: str | None = None


@dataclass(frozen=True)
class DistributionConfig:
    path: Path
    schema_version: int
    bundle_version: str
    skill_versions: dict[str, str]
    template_schema_minimum: int
    template_schema_maximum: int
    generator_name: str
    generator_version: str
    license: str
    public_includes: dict[str, tuple[str, ...]]
    shared_files: tuple[tuple[str, str], ...]
    exclusions: tuple[str, ...]
    archive_directories: tuple[str, ...]
    forbidden_path_terms: tuple[str, ...]


def _mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise DistributionError(f"CONFIG_INVALID: {label} must be a mapping")
    return value


def load_config(repo_root: Path, config_path: Path | None = None) -> DistributionConfig:
    path = (config_path or repo_root / CONFIG_PATH).resolve()
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        raise DistributionError(f"CONFIG_LOAD_FAILED: {path}: {exc}") from exc
    root = _mapping(raw, "root")
    if root.get("schema_version") != 1:
        raise DistributionError("CONFIG_VERSION_UNSUPPORTED: expected schema_version 1")
    bundle = _mapping(root.get("bundle"), "bundle")
    public = _mapping(root.get("public_skills"), "public_skills")
    if set(public) != set(PUBLIC_SKILLS):
        raise DistributionError(f"PUBLIC_SKILLS_INVALID: expected {list(PUBLIC_SKILLS)}")
    versions: dict[str, str] = {}
    includes: dict[str, tuple[str, ...]] = {}
    for skill in PUBLIC_SKILLS:
        entry = _mapping(public[skill], f"public_skills.{skill}")
        values = entry.get("include")
        if not isinstance(values, list) or not values or not all(isinstance(item, str) and item for item in values):
            raise DistributionError(f"ALLOWLIST_INVALID: {skill}.include")
        for pattern in values:
            pure = PurePosixPath(pattern)
            if pure.is_absolute() or ".." in pure.parts or "\\" in pattern or pattern != pure.as_posix():
                raise DistributionError(f"ALLOWLIST_PATTERN_UNSAFE: {skill}/{pattern}")
        versions[skill] = str(entry.get("version", ""))
        includes[skill] = tuple(values)
    compatibility = _mapping(bundle.get("template_schema"), "bundle.template_schema")
    generator = _mapping(root.get("generator"), "generator")
    shared_raw = root.get("shared_files")
    if not isinstance(shared_raw, list):
        raise DistributionError("CONFIG_INVALID: shared_files must be a list")
    shared: list[tuple[str, str]] = []
    for index, item in enumerate(shared_raw):
        mapping = _mapping(item, f"shared_files.{index}")
        source, destination = mapping.get("source"), mapping.get("destination")
        if not isinstance(source, str) or not isinstance(destination, str):
            raise DistributionError(f"CONFIG_INVALID: shared_files.{index}")
        shared.append((source, destination))
    exclusions = tuple(root.get("exclusions") or ())
    required_exclusions = (
        ".agents/skills/ui-template-manager/**",
        ".agents/skills/openspec-*/**",
        ".kiro/skills/**",
        "skills/*/patches/**",
        "skills/*/experience/**",
        "skills/*/examples/**",
        "openspec/**",
        "governance/scope.yaml",
        "governance/baselines/**",
        "docs/**",
        "example/**",
        "semantic-review/**",
        "**/ui-ux-pro-max/**",
    )
    missing = [item for item in required_exclusions if item not in exclusions]
    if missing:
        raise DistributionError(f"EXCLUSIONS_INCOMPLETE: {missing}")
    return DistributionConfig(
        path=path,
        schema_version=1,
        bundle_version=str(bundle.get("version", "")),
        skill_versions=versions,
        template_schema_minimum=int(compatibility.get("minimum", 0)),
        template_schema_maximum=int(compatibility.get("maximum", 0)),
        generator_name=str(generator.get("name", "")),
        generator_version=str(generator.get("version", "")),
        license=str(root.get("license", "")),
        public_includes=includes,
        shared_files=tuple(shared),
        exclusions=exclusions,
        archive_directories=tuple(root.get("archive_directories") or ("patches", "experience")),
        forbidden_path_terms=tuple(str(item).casefold() for item in root.get("forbidden_path_terms") or ()),
    )


def _safe_destination(value: str) -> str:
    path = PurePosixPath(value)
    if not value or path.is_absolute() or ".." in path.parts or "\\" in value or value != path.as_posix():
        raise DistributionError(f"UNSAFE_DESTINATION: {value}")
    return value


def _regular_source(root: Path, candidate: Path, label: str) -> Path:
    """只接受位于 root 内、路径链不含 symlink 的普通文件。"""
    try:
        relative = candidate.relative_to(root)
    except ValueError as exc:
        raise DistributionError(f"ALLOWLIST_SOURCE_OUTSIDE_ROOT: {label}") from exc
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise DistributionError(f"ALLOWLIST_SOURCE_SYMLINK: {label}")
    try:
        resolved_root = root.resolve(strict=True)
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(resolved_root)
    except (OSError, ValueError) as exc:
        raise DistributionError(f"ALLOWLIST_SOURCE_OUTSIDE_ROOT: {label}") from exc
    if not resolved.is_file():
        raise DistributionError(f"ALLOWLIST_SOURCE_NOT_REGULAR: {label}")
    return resolved


def expand_files(repo_root: Path, config: DistributionConfig, *, shared: bool = True) -> list[FileMapping]:
    mappings: list[FileMapping] = []
    for skill in PUBLIC_SKILLS:
        source_root = repo_root / "skills" / skill
        for pattern in config.public_includes[skill]:
            matches = sorted(path for path in source_root.glob(pattern) if path.is_file())
            if not matches:
                raise DistributionError(f"ALLOWLIST_PATTERN_EMPTY: {skill}/{pattern}")
            for source in matches:
                relative = source.relative_to(source_root).as_posix()
                destination = _safe_destination(f"skills/{skill}/{relative}")
                resolved = _regular_source(source_root, source, f"{skill}/{relative}")
                mappings.append(FileMapping(resolved, destination, skill))
    if shared:
        for source_value, destination_value in config.shared_files:
            source = repo_root / source_value
            if not source.is_file():
                raise DistributionError(f"ALLOWLIST_SOURCE_MISSING: {source_value}")
            resolved = _regular_source(repo_root, source, source_value)
            mappings.append(FileMapping(resolved, _safe_destination(destination_value)))
    by_destination: dict[str, Path] = {}
    for mapping in mappings:
        previous = by_destination.get(mapping.destination)
        if previous is not None and previous != mapping.source:
            raise DistributionError(f"ALLOWLIST_DESTINATION_DUPLICATE: {mapping.destination}")
        by_destination[mapping.destination] = mapping.source
    return sorted({mapping.destination: mapping for mapping in mappings}.values(), key=lambda item: item.destination)


def scan_forbidden_public_data(repo_root: Path, config: DistributionConfig) -> None:
    """allowlist 外的普通文件可忽略，但外部 UI 数据副本与 symlink 必须显式失败。"""
    findings: list[str] = []
    symlinks: list[str] = []
    for skill in PUBLIC_SKILLS:
        root = repo_root / "skills" / skill
        for path in sorted(root.rglob("*")):
            relative = path.relative_to(repo_root).as_posix()
            if any(fnmatch.fnmatch(relative, exclusion) for exclusion in ("skills/*/patches/**", "skills/*/experience/**")):
                continue
            if path.is_symlink():
                symlinks.append(relative)
                continue
            if not path.is_file():
                continue
            folded_parts = [part.casefold() for part in PurePosixPath(relative).parts]
            folded_name = path.name.casefold()
            if any(term in folded_name or term in folded_parts for term in config.forbidden_path_terms):
                findings.append(relative)
    if symlinks:
        raise DistributionError(f"PUBLIC_SOURCE_SYMLINK: {symlinks}")
    if findings:
        raise DistributionError(f"FORBIDDEN_PUBLIC_DATA: {findings}")
