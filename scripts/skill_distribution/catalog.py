"""把仓库根 published 模板同步为 Author skill 内只读 catalog。"""
from __future__ import annotations

import hashlib
import json
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
        design_system_core = {"design-system.yaml", "meta.yaml", "core/tokens.yaml", "core/primitives.yaml", "core/patterns.yaml", "core/page-types.yaml", "core/layout.yaml", "core/rules.yaml", "core/evidence.yaml"}
        legacy_core = {"spec.md", "tokens.yaml", "meta.yaml", "evidence.yaml"}
        if not (design_system_core <= set(files) or legacy_core <= set(files)):
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


def _shell_bearing_templates(repo_root: Path) -> set[str]:
    """Production templates whose layout declares shell chrome composition."""
    import yaml as _yaml

    bearing: set[str] = set()
    templates_root = repo_root / "templates"
    if not templates_root.is_dir():
        return bearing
    for meta in sorted(templates_root.glob("*/meta.yaml")):
        name = meta.parent.name
        layout = meta.parent / "core" / "layout.yaml"
        if not layout.is_file():
            continue
        try:
            document = _yaml.safe_load(layout.read_text(encoding="utf-8"))
        except Exception:
            continue
        for item in document.get("items") or []:
            placement = item.get("placement") if isinstance(item, dict) else None
            if isinstance(placement, dict) and placement.get("shell_variant"):
                bearing.add(name)
                break
    return bearing


CERTIFICATION_STATUS_VALUES = ("passed", "failed")


def _canonical_manifest_digest(template_root: Path) -> str | None:
    import yaml as _yaml

    manifest_path = template_root / "design-system.yaml"
    if not manifest_path.is_file():
        return None
    try:
        manifest = _yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(manifest, dict):
        return None
    manifest = dict(manifest)
    manifest.pop("contract_digest", None)
    payload = json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _certification_blocker(repo_root: Path, name: str) -> str | None:
    """Return a blocking reason when a shell-bearing template lacks a current certification.

    The accepted verdict comes from the certification schema plus its verify result, and the
    report must bind the package identity actually being promoted. Returning `None` means the
    promotion may proceed.
    """
    import yaml as _yaml

    candidate = repo_root / "governance" / "candidates" / name
    report_path = candidate / "certification" / "report.yaml"
    if not report_path.is_file():
        return f"CATALOG_PROMOTION_CERTIFICATION_REQUIRED: no certification report for {name}"
    try:
        report = _yaml.safe_load(report_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return f"CATALOG_PROMOTION_CERTIFICATION_REQUIRED: unreadable certification report for {name}: {exc}"
    if not isinstance(report, dict):
        return f"CATALOG_PROMOTION_CERTIFICATION_REQUIRED: invalid certification report for {name}"
    status = report.get("status")
    if status not in CERTIFICATION_STATUS_VALUES:
        return (
            f"CERTIFICATION_STATUS_INVALID: report status {status!r} is outside {list(CERTIFICATION_STATUS_VALUES)}; "
            "the accepted verdict is a separate verify-result flag, not a report status value"
        )
    if status != "passed":
        return f"CATALOG_PROMOTION_CERTIFICATION_REQUIRED: certification report status is {status!r} for {name}"
    verify_path = candidate / "certification" / "verify-result.json"
    accepted = False
    outcome = None
    if verify_path.is_file():
        try:
            verify = json.loads(verify_path.read_text(encoding="utf-8"))
            accepted = verify.get("accepted") is True
            outcome = verify.get("outcome")
        except Exception:
            accepted = False
    if not accepted:
        if outcome == "self-consistency":
            return (
                f"CERT_SELF_CONSISTENCY_ONLY: {name} carries a self-consistency verdict only; "
                "oracle-anchored certification is required before catalog promotion"
            )
        return f"CATALOG_PROMOTION_CERTIFICATION_REQUIRED: certification result is not accepted for {name}"

    template_root = repo_root / "templates" / name
    manifest_path = template_root / "design-system.yaml"
    if not manifest_path.is_file():
        return f"CERTIFICATION_PACKAGE_MISMATCH: promoted template manifest is missing for {name}"
    try:
        manifest = _yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return f"CERTIFICATION_PACKAGE_MISMATCH: unreadable promoted template manifest for {name}: {exc}"
    gate_package = (report.get("gate") or {}).get("package") if isinstance(report.get("gate"), dict) else None
    gate_package = gate_package if isinstance(gate_package, dict) else {}
    if gate_package.get("id") != manifest.get("id") or gate_package.get("version") != manifest.get("version"):
        return (
            f"CERTIFICATION_PACKAGE_MISMATCH: report binds {gate_package.get('id')}@{gate_package.get('version')} "
            f"but catalog promotion targets {manifest.get('id')}@{manifest.get('version')}"
        )
    digest = _canonical_manifest_digest(template_root)
    if (gate_package.get("digest") or {}).get("value") != digest:
        return (
            f"CERTIFICATION_PACKAGE_MISMATCH: report package digest does not match the promoted "
            f"{manifest.get('id')}@{manifest.get('version')} contract"
        )

    expectations_path = template_root / "measured-expectations.yaml"
    if not expectations_path.is_file():
        return (
            f"EXPECTATION_SET_MISSING: {name} ships no measured expectation set; "
            "oracle-anchored expectations must accompany the promoted package"
        )
    try:
        expectations = _yaml.safe_load(expectations_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return f"EXPECTATION_SET_MISSING: unreadable measured expectation set for {name}: {exc}"
    if not isinstance(expectations, dict):
        return f"EXPECTATION_SET_MISSING: invalid measured expectation set for {name}"
    binding = expectations.get("package") if isinstance(expectations.get("package"), dict) else {}
    if (
        binding.get("id") != manifest.get("id")
        or binding.get("version") != manifest.get("version")
        or (binding.get("digest") or {}).get("value") != digest
    ):
        return (
            f"EXPECTATION_DIGEST_MISMATCH: measured expectation set for {name} does not bind the "
            "promoted package contract"
        )
    return None


def check_catalog_freshness(repo_root: Path) -> list[str]:
    """Catalog copies must match the published production library when that library exists."""
    if not (repo_root / "templates/INDEX.md").is_file():
        return []
    return check_catalog(repo_root)


def write_catalog(repo_root: Path) -> dict[str, object]:
    repo_root = repo_root.resolve()
    # close-layout-fidelity-blind-spots: shell-bearing templates demand a current
    # accepted certification report before the catalog switches; promotion itself
    # stays a separate user decision.
    for name in sorted(_shell_bearing_templates(repo_root)):
        blocker = _certification_blocker(repo_root, name)
        if blocker:
            raise DistributionError(blocker)
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
