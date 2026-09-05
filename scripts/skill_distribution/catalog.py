"""把仓库根 published 模板同步为 Author skill 内只读 catalog。"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from .config import DistributionError

AUTHOR_CATALOG = Path("skills/ui-template-author/catalog")


def _load_index(path: Path) -> dict[str, list[str]]:
    from manage_template_index import parse_index, render_index

    if not path.is_file():
        raise DistributionError(f"CATALOG_SOURCE_INDEX_MISSING: {path}")
    _, rows = parse_index(path)
    return {name: cells for name, cells in rows.items() if cells[4] == "published"}


def _tree_bytes(root: Path) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    if not root.is_dir():
        return files
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise DistributionError(f"CATALOG_SOURCE_SYMLINK: {path}")
        if path.is_file():
            files[path.relative_to(root).as_posix()] = path.read_bytes()
    return files


def expected_catalog(repo_root: Path) -> tuple[str, dict[str, dict[str, bytes]]]:
    from manage_template_index import render_index

    repo_root = repo_root.resolve()
    published = _load_index(repo_root / "templates/INDEX.md")
    if not published:
        raise DistributionError("CATALOG_PUBLISHED_EMPTY")
    templates: dict[str, dict[str, bytes]] = {}
    for name in published:
        directory = repo_root / "templates" / name
        if not directory.is_dir():
            raise DistributionError(f"CATALOG_SOURCE_TEMPLATE_MISSING: {name}")
        files = _tree_bytes(directory)
        if "spec.md" not in files or "tokens.yaml" not in files or "meta.yaml" not in files or "evidence.yaml" not in files:
            raise DistributionError(f"CATALOG_SOURCE_CORE_MISSING: {name}")
        templates[name] = files
    return render_index(published), templates


def catalog_payload(repo_root: Path) -> dict[str, bytes]:
    index_text, templates = expected_catalog(repo_root)
    payload = {"INDEX.md": index_text.encode("utf-8")}
    for name, files in templates.items():
        for relative, value in files.items():
            payload[f"{name}/{relative}"] = value
    return payload


def check_catalog(repo_root: Path) -> list[str]:
    expected = catalog_payload(repo_root)
    root = repo_root.resolve() / AUTHOR_CATALOG
    actual: dict[str, bytes] = {}
    if root.is_dir():
        for path in sorted(root.rglob("*")):
            relative = path.relative_to(root).as_posix()
            if path.is_symlink():
                return [f"CATALOG_SYMLINK {relative}"]
            if path.is_file():
                actual[relative] = path.read_bytes()
    findings: list[str] = []
    for path in sorted(set(expected) | set(actual)):
        if path not in actual:
            findings.append(f"CATALOG_FILE_MISSING {path}")
        elif path not in expected:
            findings.append(f"CATALOG_FILE_EXTRA {path}")
        elif actual[path] != expected[path]:
            findings.append(f"CATALOG_FILE_CHANGED {path}")
    return findings


def write_catalog(repo_root: Path) -> dict[str, object]:
    repo_root = repo_root.resolve()
    payload = catalog_payload(repo_root)
    destination = repo_root / AUTHOR_CATALOG
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".ui-template-catalog-", dir=destination.parent))
    staged = stage / "catalog"
    try:
        staged.mkdir()
        for relative, value in payload.items():
            path = staged / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(value)
        if destination.exists() or destination.is_symlink():
            shutil.rmtree(destination) if destination.is_dir() and not destination.is_symlink() else destination.unlink()
        staged.replace(destination)
        findings = check_catalog(repo_root)
        if findings:
            raise DistributionError(f"CATALOG_POST_WRITE_FAILED: {findings}")
        return {"target": str(destination), "files": len(payload), "templates": sorted({path.split("/", 1)[0] for path in payload if path != "INDEX.md"})}
    finally:
        shutil.rmtree(stage, ignore_errors=True)
