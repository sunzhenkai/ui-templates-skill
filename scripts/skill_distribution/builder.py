from __future__ import annotations

import gzip
import io
import os
import subprocess
import tarfile
from dataclasses import dataclass
from pathlib import Path

from .config import DistributionError, expand_files, load_config, scan_forbidden_public_data
from .manifest import (
    dump_manifest,
    manifest_document,
    sha256_bytes,
    validate_manifest_payload,
)


@dataclass(frozen=True)
class BuildResult:
    artifact: Path
    checksum_file: Path
    checksum: str
    manifest: dict
    manifest_bytes: bytes


def _git_output(repo_root: Path, *args: str) -> str:
    try:
        return subprocess.run(
            ["git", *args], cwd=repo_root, check=True, capture_output=True, text=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError) as exc:
        raise DistributionError(f"GIT_IDENTITY_FAILED: {' '.join(args)}") from exc


def source_revision_time(repo_root: Path) -> int:
    configured = os.environ.get("SOURCE_DATE_EPOCH")
    if configured is not None:
        try:
            value = int(configured)
        except ValueError as exc:
            raise DistributionError("SOURCE_DATE_EPOCH_INVALID") from exc
        if value < 0:
            raise DistributionError("SOURCE_DATE_EPOCH_INVALID")
        return value
    return int(_git_output(repo_root, "show", "-s", "--format=%ct", "HEAD"))


def source_revision(repo_root: Path, payload: dict[str, bytes]) -> str:
    head = _git_output(repo_root, "rev-parse", "HEAD")
    digest_input = bytearray()
    for path in sorted(payload):
        digest_input.extend(path.encode("utf-8"))
        digest_input.extend(b"\0")
        digest_input.extend(payload[path])
        digest_input.extend(b"\0")
    return f"{head}+worktree.{sha256_bytes(bytes(digest_input))[:16]}"


def _archive_bytes(files: dict[str, bytes], mtime: int) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", compresslevel=9, fileobj=output, mtime=mtime) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for path in sorted(files):
                value = files[path]
                info = tarfile.TarInfo(path)
                info.size = len(value)
                info.mtime = mtime
                info.uid = 0
                info.gid = 0
                info.uname = ""
                info.gname = ""
                info.mode = 0o644
                info.pax_headers = {}
                archive.addfile(info, io.BytesIO(value))
    return output.getvalue()


def build_bundle(
    repo_root: Path, output_dir: Path | None = None, *, config_path: Path | None = None,
) -> BuildResult:
    repo_root = repo_root.resolve()
    config = load_config(repo_root, config_path)
    scan_forbidden_public_data(repo_root, config)
    mappings = expand_files(repo_root, config)
    payload = {mapping.destination: mapping.source.read_bytes() for mapping in mappings}
    revision_time = source_revision_time(repo_root)
    revision = source_revision(repo_root, payload)
    manifest = manifest_document(
        payload,
        bundle_version=config.bundle_version,
        skill_versions=config.skill_versions,
        schema_minimum=config.template_schema_minimum,
        schema_maximum=config.template_schema_maximum,
        generator_name=config.generator_name,
        generator_version=config.generator_version,
        revision=revision,
        revision_time=revision_time,
        license_name=config.license,
    )
    validate_manifest_payload(manifest, payload)
    manifest_bytes = dump_manifest(manifest)
    archive_payload = dict(payload)
    archive_payload["skills-manifest.yaml"] = manifest_bytes
    artifact_bytes = _archive_bytes(archive_payload, revision_time)
    checksum = sha256_bytes(artifact_bytes)
    destination = (output_dir or repo_root / "dist").resolve()
    destination.mkdir(parents=True, exist_ok=True)
    artifact = destination / f"ui-templates-skill-{config.bundle_version}.tar.gz"
    checksum_file = artifact.with_name(artifact.name + ".sha256")
    artifact.write_bytes(artifact_bytes)
    checksum_file.write_text(f"{checksum}  {artifact.name}\n", encoding="utf-8")
    return BuildResult(artifact, checksum_file, checksum, manifest, manifest_bytes)
