from __future__ import annotations

import hashlib
import posixpath
import re
from pathlib import Path, PurePosixPath
from typing import Any, Mapping

import yaml

from .config import DistributionError, PUBLIC_SKILLS

MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
FRONTMATTER = re.compile(r"\A---\n(?P<body>.*?)\n---\n", re.DOTALL)
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
MANAGED_SHARED_FILES = frozenset({
    "LICENSE", "VERSION", "CHANGELOG.md", "compatibility.yaml",
    "MIGRATION-v1-to-v2.md", "ROLLBACK.md",
})
RUNTIME_LICENSES = (
    ("PyYAML", "6.0.3", "MIT"),
    ("jsonschema", "4.25.1", "MIT"),
    ("attrs", "26.1.0", "MIT"),
    ("jsonschema-specifications", "2025.9.1", "MIT"),
    ("referencing", "0.37.0", "MIT"),
    ("rpds-py", "2026.6.3", "MIT"),
)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def manifest_document(
    payload: Mapping[str, bytes], *, bundle_version: str, skill_versions: Mapping[str, str],
    schema_minimum: int, schema_maximum: int, generator_name: str,
    generator_version: str, revision: str, revision_time: int, license_name: str,
) -> dict[str, Any]:
    return {
        "schema_version": 2,
        "bundle_version": bundle_version,
        "skills": {skill: skill_versions[skill] for skill in PUBLIC_SKILLS},
        "template_schema": {"minimum": schema_minimum, "maximum": schema_maximum},
        "files": [
            {"path": path, "sha256": sha256_bytes(payload[path]), "license": license_name}
            for path in sorted(payload)
        ],
        "generator": {
            "name": generator_name,
            "version": generator_version,
            "revision": revision,
            "revision_time": revision_time,
        },
        "archive": {
            "format": "tar.gz",
            "ordering": "path-lexicographic",
            "mtime": revision_time,
            "uid": 0,
            "gid": 0,
            "checksum": "sha256-sidecar",
        },
        "licenses": [
            {"subject": "ui-templates-skill bundle", "license": license_name, "path": "LICENSE"},
            *[
                {
                    "subject": f"{name} runtime dependency",
                    "version": version,
                    "license": dependency_license,
                }
                for name, version, dependency_license in RUNTIME_LICENSES
            ],
        ],
    }


def dump_manifest(document: Mapping[str, Any]) -> bytes:
    return yaml.safe_dump(
        dict(document), allow_unicode=True, sort_keys=False, default_flow_style=False,
    ).encode("utf-8")


def load_manifest(value: bytes) -> dict[str, Any]:
    try:
        document = yaml.safe_load(value.decode("utf-8"))
    except (UnicodeError, yaml.YAMLError) as exc:
        raise DistributionError(f"MANIFEST_PARSE_FAILED: {exc}") from exc
    if not isinstance(document, dict):
        raise DistributionError("MANIFEST_INVALID: root must be a mapping")
    return document


def _safe_member(path: str) -> bool:
    pure = PurePosixPath(path)
    return (
        bool(path)
        and not pure.is_absolute()
        and ".." not in pure.parts
        and "\\" not in path
        and path == pure.as_posix()
    )


def _managed_member(path: str) -> bool:
    if path in MANAGED_SHARED_FILES:
        return True
    parts = PurePosixPath(path).parts
    return len(parts) >= 3 and parts[0] == "skills" and parts[1] in PUBLIC_SKILLS


def validate_manifest_payload(document: Mapping[str, Any], payload: Mapping[str, bytes]) -> None:
    if document.get("schema_version") != 2:
        raise DistributionError("MANIFEST_SCHEMA_UNSUPPORTED: expected 2")
    skills = document.get("skills")
    if not isinstance(skills, dict) or set(skills) != set(PUBLIC_SKILLS):
        raise DistributionError("MANIFEST_SKILLS_INVALID: dual public skills required")
    files = document.get("files")
    if not isinstance(files, list):
        raise DistributionError("MANIFEST_FILES_INVALID")
    expected: dict[str, str] = {}
    declared_paths: list[str] = []
    for item in files:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("path"), str)
            or not isinstance(item.get("sha256"), str)
            or not isinstance(item.get("license"), str)
            or not item["license"]
        ):
            raise DistributionError("MANIFEST_FILE_INVALID")
        path = item["path"]
        if not _safe_member(path) or not _managed_member(path):
            raise DistributionError(f"MANIFEST_PATH_INVALID: {path}")
        if path in expected:
            raise DistributionError(f"MANIFEST_PATH_DUPLICATE: {path}")
        if SHA256.fullmatch(item["sha256"]) is None:
            raise DistributionError(f"MANIFEST_DIGEST_INVALID: {path}")
        expected[path] = item["sha256"]
        declared_paths.append(path)
    if declared_paths != sorted(declared_paths):
        raise DistributionError("MANIFEST_FILES_UNSORTED")
    if set(expected) != set(payload):
        raise DistributionError(
            f"MANIFEST_FILE_SET_MISMATCH: missing={sorted(set(expected) - set(payload))} "
            f"unexpected={sorted(set(payload) - set(expected))}"
        )
    failures = [path for path, digest in expected.items() if sha256_bytes(payload[path]) != digest]
    if failures:
        raise DistributionError(f"MANIFEST_CHECKSUM_MISMATCH: {sorted(failures)}")
    for skill in PUBLIC_SKILLS:
        if f"skills/{skill}/SKILL.md" not in payload:
            raise DistributionError(f"PUBLIC_SKILL_MISSING: {skill}")
    forbidden = [
        path for path in payload
        if "ui-template-manager" in path
        or "/patches/" in f"/{path}/"
        or "/experience/" in f"/{path}/"
        or "/openspec-" in f"/{path}/"
        or "ui-ux-pro-max" in path.casefold()
        or "master" in PurePosixPath(path).name.casefold()
        or PurePosixPath(path).name.casefold() in {"catalog.json", "catalog"}
    ]
    if forbidden:
        raise DistributionError(f"NON_PUBLIC_CONTENT: {sorted(forbidden)}")
    validate_references(payload)
    validate_trigger_resources(payload)


def validate_references(payload: Mapping[str, bytes]) -> None:
    missing: list[str] = []
    for path, value in sorted(payload.items()):
        if not path.endswith(".md"):
            continue
        try:
            text = value.decode("utf-8")
        except UnicodeError as exc:
            raise DistributionError(f"MARKDOWN_ENCODING_INVALID: {path}") from exc
        for raw_target in MARKDOWN_LINK.findall(text):
            target = raw_target.strip().split("#", 1)[0]
            if not target or "://" in target or target.startswith(("mailto:", "/", "#")):
                continue
            destination = posixpath.normpath((PurePosixPath(path).parent / target).as_posix())
            if not _safe_member(destination) or destination not in payload:
                missing.append(f"{path} -> {raw_target}")
    if missing:
        raise DistributionError(f"REFERENCE_MISSING: {missing}")


def validate_trigger_resources(payload: Mapping[str, bytes]) -> None:
    for skill in PUBLIC_SKILLS:
        path = f"skills/{skill}/SKILL.md"
        try:
            text = payload[path].decode("utf-8")
        except (KeyError, UnicodeError) as exc:
            raise DistributionError(f"SKILL_RESOURCE_INVALID: {skill}") from exc
        match = FRONTMATTER.match(text)
        if not match:
            raise DistributionError(f"SKILL_FRONTMATTER_MISSING: {skill}")
        frontmatter = yaml.safe_load(match.group("body"))
        if not isinstance(frontmatter, dict) or frontmatter.get("name") != skill or not frontmatter.get("description"):
            raise DistributionError(f"SKILL_TRIGGER_INVALID: {skill}")
        references = [path for path in payload if path.startswith(f"skills/{skill}/references/")]
        evals = [path for path in payload if path.startswith(f"skills/{skill}/evals/")]
        if not references or not evals:
            raise DistributionError(f"SKILL_RESOURCES_MISSING: {skill}")
