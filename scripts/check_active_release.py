#!/usr/bin/env python3
"""校验 active/release 文档链接、语义、effective OpenSpec 与生产镜像。"""
from __future__ import annotations

import argparse
import fnmatch
import json
import posixpath
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable

import yaml

ROOT = Path(__file__).resolve().parent.parent
SCOPE = ROOT / "governance/scope.yaml"
LINK = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
REQUIREMENT = re.compile(r"^### Requirement: (.+?)\s*$")
MODE = re.compile(r"^## (ADDED|MODIFIED|REMOVED) Requirements\s*$")
NEGATIVE_IMPLEMENTATION = (
    "禁止", "不得", "不包含", "不含", "移除", "已移除", "replaces", "replace",
    "removed", "forbidden", "prohibit", "不再", "不支持", "不得恢复", "shall 不",
)
POSITIVE_IMPLEMENTATION = re.compile(
    r"(?:\]\([^)]*implementation/[^)]*\)|"
    r"(?:包含|允许|提供|保存|读取|使用|位于|进入|支持|可含|可包含).{0,48}`?implementation/|"
    r"`implementation/`\s*(?:playbook|目录|adapter|适配))",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Finding:
    code: str
    path: str
    message: str
    severity: str = "error"


def load_yaml(path: Path) -> dict:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: root must be a mapping")
    return value


def git_paths(root: Path) -> set[str]:
    proc = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=root, check=True, text=True, capture_output=True,
    )
    return {line for line in proc.stdout.splitlines() if line}


def expand(patterns: Iterable[str], paths: set[str]) -> set[str]:
    result: set[str] = set()
    for pattern in patterns:
        if pattern.endswith("/**"):
            prefix = pattern[:-3]
            result.update(path for path in paths if path == prefix or path.startswith(prefix + "/"))
        else:
            result.update(path for path in paths if fnmatch.fnmatchcase(path, pattern))
    return result


def classified_paths(config: dict, paths: set[str]) -> dict[str, set[str]]:
    return {
        name: expand(config.get(name, []), paths)
        for name in ("active_release", "immutable_history", "exclusions")
    }


def _safe_text(root: Path, relative: str) -> str:
    path = root / relative
    current = root
    for part in PurePosixPath(relative).parts:
        current = current / part
        if current.is_symlink():
            raise OSError(f"symlink is not allowed: {relative}")
    return path.read_text(encoding="utf-8")


def check_required_paths(paths: set[str], skill_roots: Iterable[str]) -> list[Finding]:
    findings: list[Finding] = []
    for root in skill_roots:
        skill = PurePosixPath(root).name
        required = f"{root}/SKILL.md"
        if required not in paths:
            findings.append(Finding("PUBLIC_SKILL_MISSING", required, f"public skill {skill} is missing"))
    return findings


def _relative_target(source: str, raw: str) -> str | None:
    target = raw.strip()
    if target.startswith("<") and ">" in target:
        target = target[1:target.index(">")]
    else:
        target = target.split(maxsplit=1)[0]
    target = target.split("#", 1)[0].split("?", 1)[0]
    if not target or target.startswith(("#", "/", "mailto:", "data:")) or "://" in target:
        return None
    normalized = posixpath.normpath(posixpath.join(posixpath.dirname(source), target))
    if normalized == ".." or normalized.startswith("../"):
        return "../"
    return normalized


def check_markdown_links(
    root: Path,
    source: str,
    text: str,
    known_paths: set[str],
    excluded: set[str],
) -> list[Finding]:
    findings: list[Finding] = []
    for raw in LINK.findall(text):
        target = _relative_target(source, raw)
        if target is None:
            continue
        if target == "../":
            findings.append(Finding("ACTIVE_LINK_OUTSIDE_ROOT", source, f"link escapes repository: {raw}"))
            continue
        if target in excluded or any(path.startswith(target.rstrip("/") + "/") for path in excluded):
            continue
        exists = target in known_paths or any(path.startswith(target.rstrip("/") + "/") for path in known_paths)
        if not exists:
            findings.append(Finding("ACTIVE_LINK_MISSING", source, f"missing local target: {raw}"))
    return findings


def check_active_semantics(path: str, text: str) -> list[Finding]:
    findings: list[Finding] = []
    for number, line in enumerate(text.splitlines(), 1):
        folded = line.casefold()
        if (
            "implementation/" not in folded
            or line.lstrip().startswith("- **WHEN**")
            or any(word in folded for word in NEGATIVE_IMPLEMENTATION)
        ):
            continue
        if POSITIVE_IMPLEMENTATION.search(line):
            findings.append(Finding(
                "ACTIVE_IMPLEMENTATION_SEMANTIC", path,
                f"line {number} actively claims removed implementation/ behavior",
            ))
    return findings


def parse_requirements(text: str, *, delta: bool) -> list[tuple[str, str, str]]:
    mode = "BASE"
    current_title: str | None = None
    current_mode = mode
    current: list[str] = []
    result: list[tuple[str, str, str]] = []

    def flush() -> None:
        nonlocal current_title, current
        if current_title is not None:
            result.append((current_mode, current_title, "\n".join(current).strip()))
        current_title = None
        current = []

    for line in text.splitlines():
        mode_match = MODE.match(line)
        requirement_match = REQUIREMENT.match(line)
        if mode_match:
            flush()
            mode = mode_match.group(1)
            continue
        if requirement_match:
            flush()
            current_title = requirement_match.group(1)
            current_mode = mode if delta else "BASE"
            continue
        if current_title is not None:
            current.append(line)
    flush()
    return result


def effective_openspec(
    root: Path,
    base_root: str,
    overlay_root: str,
    known_paths: set[str],
) -> tuple[dict[str, str], list[dict], list[Finding], set[str]]:
    effective: dict[str, str] = {}
    pending: list[dict] = []
    findings: list[Finding] = []
    read_paths: set[str] = set()
    capabilities = {
        PurePosixPath(path).parent.name
        for path in known_paths
        if path.startswith(base_root.rstrip("/") + "/") and path.endswith("/spec.md")
    } | {
        PurePosixPath(path).parent.name
        for path in known_paths
        if path.startswith(overlay_root.rstrip("/") + "/") and path.endswith("/spec.md")
    }
    for capability in sorted(capabilities):
        base = f"{base_root}/{capability}/spec.md"
        overlay = f"{overlay_root}/{capability}/spec.md"
        requirements: dict[str, str] = {}
        if base in known_paths:
            try:
                base_text = _safe_text(root, base)
                read_paths.add(base)
                requirements.update({title: body for _mode, title, body in parse_requirements(base_text, delta=False)})
            except (OSError, UnicodeError) as exc:
                findings.append(Finding("ACTIVE_DOCUMENT_UNREADABLE", base, str(exc)))
        if overlay in known_paths:
            try:
                overlay_text = _safe_text(root, overlay)
                read_paths.add(overlay)
                changes = parse_requirements(overlay_text, delta=True)
                counts = {mode: sum(item[0] == mode for item in changes) for mode in ("ADDED", "MODIFIED", "REMOVED")}
                pending.append({"capability": capability, "base": base if base in known_paths else None, "overlay": overlay, "changes": counts})
                for mode, title, body in changes:
                    if mode == "REMOVED":
                        if title not in requirements:
                            findings.append(Finding("OPEN_SPEC_REMOVE_TARGET_MISSING", overlay, title))
                        requirements.pop(title, None)
                    elif mode == "MODIFIED":
                        if title not in requirements:
                            findings.append(Finding("OPEN_SPEC_MODIFY_TARGET_MISSING", overlay, title))
                        requirements[title] = body
                    elif mode == "ADDED":
                        requirements[title] = body
                    else:
                        findings.append(Finding("OPEN_SPEC_DELTA_MODE_MISSING", overlay, title))
            except (OSError, UnicodeError) as exc:
                findings.append(Finding("ACTIVE_DOCUMENT_UNREADABLE", overlay, str(exc)))
        effective[capability] = "\n\n".join(
            f"### Requirement: {title}\n{requirements[title]}" for title in sorted(requirements)
        )
        for finding in check_active_semantics(f"effective:{capability}", effective[capability]):
            findings.append(Finding("OPEN_SPEC_EFFECTIVE_CONFLICT", finding.path, finding.message))
    if not pending:
        findings.append(Finding("OPEN_SPEC_OVERLAY_MISSING", overlay_root, "active change delta is required until archive"))
    return effective, pending, findings, read_paths


def check_document_contract(path: str, text: str) -> list[Finding]:
    requirements: dict[str, tuple[str, ...]] = {
        "README.md": (
            "ui-template-author", "ui-template-apply", "2.0.0", "schema v2", "apply/",
            "make validate", "make eval", "migrate_template.py", "ROLLBACK.md",
        ),
        "AGENTS.md": (
            "ui-template-author", "ui-template-apply", "schema v2", "apply/", "schemas/template/v2/",
            "harden-template-lifecycle", "make validate", "openspec validate --all --strict",
            "879d0de9166261c26ec35b69f5cec9382191eda1",
            "0aedb680ecdf61aa8eafdb5d80e6b58edba63df5",
        ),
    }
    findings: list[Finding] = []
    for required in requirements.get(path, ()):
        if required not in text:
            findings.append(Finding("ACTIVE_SEMANTIC_REQUIRED", path, f"missing required contract text: {required}"))
    if path == "AGENTS.md":
        for stale in ("14/14", "24/24", "攻击面为零", "目前还没有代码", "无任何配置文件"):
            if stale in text:
                findings.append(Finding("STALE_REPOSITORY_FACT", path, f"stale claim: {stale}"))
    return findings


def check_versions(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    try:
        version = (root / "governance/release/VERSION").read_text(encoding="utf-8").strip()
        distribution = load_yaml(root / "governance/release/distribution-v1.yaml")
        compatibility = load_yaml(root / "governance/release/compatibility.yaml")
        declared = {
            "distribution.bundle": str(distribution.get("bundle", {}).get("version", "")),
            "distribution.ui-template-author": str(distribution.get("public_skills", {}).get("ui-template-author", {}).get("version", "")),
            "distribution.ui-template-apply": str(distribution.get("public_skills", {}).get("ui-template-apply", {}).get("version", "")),
            "compatibility.bundle": str(compatibility.get("bundle_version", "")),
            "compatibility.ui-template-author": str(compatibility.get("public_skills", {}).get("ui-template-author", "")),
            "compatibility.ui-template-apply": str(compatibility.get("public_skills", {}).get("ui-template-apply", "")),
        }
        for label, actual in declared.items():
            if actual != version:
                findings.append(Finding("RELEASE_VERSION_MISMATCH", label, f"expected {version}, got {actual}"))
        public = set(distribution.get("public_skills", {}))
        if public != {"ui-template-author", "ui-template-apply"}:
            findings.append(Finding("PUBLIC_SKILL_SET_INVALID", "governance/release/distribution-v1.yaml", str(sorted(public))))
        schema_range = distribution.get("bundle", {}).get("template_schema", {})
        if schema_range != {"minimum": 2, "maximum": 2}:
            findings.append(Finding("TEMPLATE_SCHEMA_RANGE_INVALID", "governance/release/distribution-v1.yaml", str(schema_range)))
    except (OSError, UnicodeError, ValueError, yaml.YAMLError) as exc:
        findings.append(Finding("RELEASE_METADATA_UNREADABLE", "governance/release", str(exc)))
    return findings


def check_mirror_state(root: Path, target: str) -> list[Finding]:
    try:
        sys.path.insert(0, str(root / "scripts"))
        from skill_distribution.config import DistributionError
        from skill_distribution.mirror import check_mirror
        values = check_mirror(root, root / target)
        return [Finding("MIRROR_DRIFT", target, value) for value in values]
    except (ImportError, OSError, RuntimeError) as exc:
        return [Finding("MIRROR_CHECK_FAILED", target, str(exc))]
    except DistributionError as exc:
        return [Finding("MIRROR_DRIFT", target, str(exc))]


def check_repository(root: Path, scope_path: Path) -> dict:
    config = load_yaml(scope_path)
    paths = git_paths(root)
    domains = classified_paths(config, paths)
    findings: list[Finding] = []
    read_paths: set[str] = set()
    for left, right in (("active_release", "immutable_history"), ("active_release", "exclusions"), ("immutable_history", "exclusions")):
        overlap = sorted(domains[left] & domains[right])
        if overlap:
            findings.append(Finding("SCOPE_OVERLAP", f"{left}/{right}", ", ".join(overlap)))

    checks = config.get("checks", {})
    document_paths = expand(checks.get("documents", []), paths) - domains["exclusions"] - domains["immutable_history"]
    openspec = checks.get("openspec", {})
    effective, pending, openspec_findings, openspec_reads = effective_openspec(
        root, str(openspec.get("base", "openspec/specs")),
        str(openspec.get("overlay", "")), paths - domains["exclusions"],
    )
    del effective
    findings.extend(openspec_findings)
    read_paths.update(openspec_reads)
    document_paths.update(openspec_reads)

    for relative in sorted(document_paths):
        if not relative.endswith(".md"):
            continue
        try:
            text = _safe_text(root, relative)
            read_paths.add(relative)
        except (OSError, UnicodeError) as exc:
            findings.append(Finding("ACTIVE_DOCUMENT_UNREADABLE", relative, str(exc)))
            continue
        findings.extend(check_markdown_links(root, relative, text, paths, domains["exclusions"]))
        if relative not in openspec_reads:
            findings.extend(check_active_semantics(relative, text))
            findings.extend(check_document_contract(relative, text))

    for relative in sorted(domains["active_release"]):
        if "/implementation/" in f"/{relative}/" or relative.endswith("/implementation"):
            findings.append(Finding("ACTIVE_IMPLEMENTATION_PATH", relative, "removed implementation/ path is active"))

    findings.extend(check_required_paths(paths, checks.get("production_skills", [])))
    findings.extend(check_versions(root))
    findings.extend(check_mirror_state(root, str(checks.get("mirror_target", ".agents/skills"))))

    immutable_unreadable: list[str] = []
    immutable_readable = 0
    for relative in sorted(domains["immutable_history"]):
        path = root / relative
        if not path.is_file():
            continue
        try:
            _safe_text(root, relative)
            immutable_readable += 1
        except (OSError, UnicodeError):
            immutable_unreadable.append(relative)
    for relative in immutable_unreadable:
        findings.append(Finding("IMMUTABLE_HISTORY_UNREADABLE", relative, "history is classified only; terminology is not checked"))

    ordered = sorted(set(findings), key=lambda item: (item.severity, item.code, item.path, item.message))
    return {
        "schema_version": 1,
        "status": "failed" if any(item.severity == "error" for item in ordered) else "passed",
        "scope": str(scope_path.relative_to(root)),
        "findings": [asdict(item) for item in ordered],
        "pending_overlays": pending,
        "domains": {name: len(values) for name, values in domains.items()},
        "immutable_history": {
            "policy": "readability-only-no-semantic-rewrite",
            "readable_files": immutable_readable,
            "unreadable_files": immutable_unreadable,
        },
        "exclusions": [
            {"pattern": pattern, "traversed": False, "content_read": False}
            for pattern in config.get("exclusions", [])
        ],
        "active_files_read": len(read_paths),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="active/release link and semantic consistency checker")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--scope", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args(argv)
    root = args.root.resolve()
    scope = (args.scope or root / "governance/scope.yaml").resolve()
    try:
        report = check_repository(root, scope)
    except (OSError, ValueError, subprocess.CalledProcessError, yaml.YAMLError) as exc:
        report = {"schema_version": 1, "status": "failed", "findings": [{"code": "CHECKER_FAILED", "path": str(scope), "message": str(exc), "severity": "error"}]}
    payload = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(payload, encoding="utf-8")
    if args.json or not args.json_out:
        print(payload, end="")
    else:
        print(f"active/release: {report['status']}; findings={len(report['findings'])}; pending_overlays={len(report.get('pending_overlays', []))}")
        for item in report.get("exclusions", []):
            print(f"excluded (not traversed/read): {item['pattern']}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
