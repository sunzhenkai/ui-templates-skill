#!/usr/bin/env python3
"""生成 evidence-only 样例 promotion report；绝不执行样例命令。"""
from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Any

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "schemas/governance/sample-promotion-report.schema.json"
SCOPE = ROOT / "governance/scope.yaml"
GATE_NAMES = (
    "frozen_install", "build", "static", "test", "multi_viewport", "feedback", "localization",
)


class PromotionError(RuntimeError):
    pass


def load(path: Path) -> dict[str, Any]:
    try:
        value = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        raise PromotionError(f"PROMOTION_INPUT_INVALID: {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise PromotionError(f"PROMOTION_INPUT_INVALID: {path}: root must be a mapping")
    return value


def safe_relative(value: str) -> str:
    path = PurePosixPath(value)
    if (
        not value or path.is_absolute() or ".." in path.parts or "\\" in value
        or value != path.as_posix() or value in {".", ".."}
    ):
        raise PromotionError(f"PROMOTION_PATH_UNSAFE: {value}")
    return value


def excluded(value: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        if fnmatch.fnmatchcase(value, pattern):
            return pattern
        if pattern.endswith("/**") and (value == pattern[:-3] or value.startswith(pattern[:-3] + "/")):
            return pattern
    return None


def git(root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=root, check=check, text=True, capture_output=True,
    )


def tracked_revision(root: Path, revision: str) -> str:
    proc = git(root, "rev-parse", "--verify", f"{revision}^{{commit}}", check=False)
    if proc.returncode != 0:
        raise PromotionError(f"PROMOTION_REVISION_UNKNOWN: {revision}")
    commit = proc.stdout.strip()
    if len(commit) != 40:
        raise PromotionError(f"PROMOTION_REVISION_INVALID: {revision}")
    return commit


def tracked_at(root: Path, revision: str, relative: str, *, directory: bool = False) -> bool:
    if directory:
        proc = git(root, "ls-tree", "-r", "--name-only", revision, "--", relative)
        prefix = relative.rstrip("/") + "/"
        return any(line == relative or line.startswith(prefix) for line in proc.stdout.splitlines())
    return git(root, "cat-file", "-e", f"{revision}:{relative}", check=False).returncode == 0


def schema_errors(report: dict[str, Any], schema_path: Path) -> list[str]:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    return [
        f"{'.'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
        for error in sorted(validator.iter_errors(report), key=lambda item: (list(item.absolute_path), item.message))
    ]


def build_report(
    root: Path,
    sample: str,
    change: str,
    revision: str,
    gates_path: Path,
    output: Path,
    *,
    scope_path: Path,
    schema_path: Path,
) -> dict[str, Any]:
    sample = safe_relative(sample)
    scope = load(scope_path)
    patterns = [str(item) for item in scope.get("exclusions", [])]
    matched = excluded(sample, patterns)
    if matched:
        raise PromotionError(f"PROMOTION_SAMPLE_EXCLUDED: {sample} matches {matched}")
    commit = tracked_revision(root, revision)
    if not tracked_at(root, commit, sample, directory=True):
        raise PromotionError(f"PROMOTION_SAMPLE_UNTRACKED: {sample}@{commit}")
    change_path = f"openspec/changes/{safe_relative(change)}"
    if not tracked_at(root, commit, change_path, directory=True):
        raise PromotionError(f"PROMOTION_CHANGE_UNTRACKED: {change_path}@{commit}")

    declaration = load(gates_path)
    gates = declaration.get("gates", declaration)
    if not isinstance(gates, dict) or set(gates) != set(GATE_NAMES):
        raise PromotionError(f"PROMOTION_GATES_INCOMPLETE: expected {list(GATE_NAMES)}")
    for gate_name in GATE_NAMES:
        gate = gates[gate_name]
        if not isinstance(gate, dict):
            raise PromotionError(f"PROMOTION_GATE_INVALID: {gate_name}")
        evidence = gate.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            raise PromotionError(f"PROMOTION_EVIDENCE_MISSING: {gate_name}")
        for raw in evidence:
            relative = safe_relative(str(raw))
            matched = excluded(relative, patterns)
            if matched:
                raise PromotionError(f"PROMOTION_EVIDENCE_EXCLUDED: {relative} matches {matched}")
            if not tracked_at(root, commit, relative):
                raise PromotionError(f"PROMOTION_EVIDENCE_UNTRACKED: {gate_name}:{relative}@{commit}")

    decision = "eligible" if all(gates[name].get("status") == "passed" for name in GATE_NAMES) else "blocked"
    report = {
        "schema_version": 1,
        "sample": {"path": sample, "change": change, "revision": commit, "tracked": True},
        "execution": {"mode": "evidence-only", "commands_executed": False},
        "gates": gates,
        "decision": decision,
    }
    errors = schema_errors(report, schema_path)
    if errors:
        raise PromotionError("PROMOTION_REPORT_SCHEMA_INVALID: " + "; ".join(errors))

    resolved_output = output.resolve()
    try:
        output_relative = resolved_output.relative_to(root).as_posix()
    except ValueError:
        output_relative = None
    if output_relative is not None:
        if output_relative == sample or output_relative.startswith(sample.rstrip("/") + "/"):
            raise PromotionError(f"PROMOTION_OUTPUT_IN_SAMPLE: {output_relative}")
        matched = excluded(output_relative, patterns)
        if matched:
            raise PromotionError(f"PROMOTION_OUTPUT_EXCLUDED: {output_relative} matches {matched}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="validate declared sample promotion gates without running sample commands")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--sample", required=True)
    parser.add_argument("--change", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--gates", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--scope", type=Path)
    parser.add_argument("--schema", type=Path)
    args = parser.parse_args(argv)
    root = args.root.resolve()
    try:
        report = build_report(
            root, args.sample, args.change, args.revision, args.gates, args.output,
            scope_path=(args.scope or root / "governance/scope.yaml").resolve(),
            schema_path=(args.schema or root / "schemas/governance/sample-promotion-report.schema.json").resolve(),
        )
    except (PromotionError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps({
        "status": "passed" if report["decision"] == "eligible" else "blocked",
        "decision": report["decision"],
        "report": str(args.output),
        "commands_executed": False,
    }, ensure_ascii=False, sort_keys=True))
    return 0 if report["decision"] == "eligible" else 1


if __name__ == "__main__":
    raise SystemExit(main())
