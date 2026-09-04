#!/usr/bin/env python3
"""检查治理路径域，并保护 harden-template-lifecycle 的 web-v2 排除项。"""
from __future__ import annotations

import argparse
import fnmatch
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SCOPE = ROOT / "governance/scope.yaml"
BASELINE = ROOT / "governance/baselines/harden-template-lifecycle.yaml"


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path}: root must be a mapping")
    return data


def tracked_and_present_paths() -> set[str]:
    proc = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=ROOT, check=True, text=True, capture_output=True,
    )
    return {line for line in proc.stdout.splitlines() if line}


def expand(patterns: list[str], paths: set[str]) -> set[str]:
    result: set[str] = set()
    for pattern in patterns:
        if pattern.endswith("/**"):
            prefix = pattern[:-3]
            result.update(p for p in paths if p == prefix or p.startswith(prefix + "/"))
        else:
            result.update(p for p in paths if fnmatch.fnmatchcase(p, pattern))
    return result


def check_domains() -> list[str]:
    config = load(SCOPE)
    paths = tracked_and_present_paths()
    domains = {name: expand(config[name], paths) for name in ("active_release", "immutable_history", "exclusions")}
    errors: list[str] = []
    for left, right in (("active_release", "immutable_history"), ("active_release", "exclusions"), ("immutable_history", "exclusions")):
        overlap = sorted(domains[left] & domains[right])
        if overlap:
            errors.append(f"SCOPE_OVERLAP {left}/{right}: {', '.join(overlap)}")
    exact = "example/workbench-shell/web-v2/**"
    if exact not in config["exclusions"]:
        errors.append(f"SCOPE_EXCLUSION_MISSING: {exact}")
    return errors


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, text=True, capture_output=True).stdout.strip()


def guard_web_v2() -> list[str]:
    baseline = load(BASELINE)
    path = str(baseline["path"])
    errors: list[str] = []
    actual_tree = git("rev-parse", f"HEAD:{path}")
    if actual_tree != baseline["head_tree"]:
        errors.append(f"WEB_V2_BASELINE_MISMATCH: expected {baseline['head_tree']}, got {actual_tree}")
    changed = git("status", "--porcelain", "--untracked-files=all", "--", path)
    if changed:
        errors.append("WEB_V2_WORKTREE_CHANGED:\n" + changed)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--guard-web-v2", action="store_true", help="同时校验 web-v2 tree 与工作区状态")
    args = parser.parse_args()
    errors = check_domains()
    if args.guard_web_v2:
        errors.extend(guard_web_v2())
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("治理 scope 无意外交叠；web-v2 排除项已声明。")
    if args.guard_web_v2:
        print("web-v2 guard 通过：HEAD tree 与记录基线一致，工作区无改动。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
