#!/usr/bin/env python3
"""检查治理路径域，并拒绝任何 example/ 前缀的 changed-path。"""
from __future__ import annotations

import argparse
import fnmatch
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SCOPE = ROOT / "governance/scope.yaml"


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
    exact = "example/**"
    if exact not in config["exclusions"]:
        errors.append(f"SCOPE_EXCLUSION_MISSING: {exact}")
    return errors


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, text=True, capture_output=True).stdout.strip()


def path_has_example_prefix(value: str) -> bool:
    posix = value.replace("\\", "/").lstrip("./")
    return posix == "example" or posix.startswith("example/")


def git_changed_path_names() -> list[str]:
    """只读取仓库级 changed-path 名称，不打开文件内容。"""
    proc = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=ROOT, check=True, capture_output=True,
    )
    names: list[str] = []
    entries = proc.stdout.split(b"\0")
    index = 0
    while index < len(entries):
        raw = entries[index]
        index += 1
        if not raw:
            continue
        text = raw.decode("utf-8", errors="surrogateescape")
        if len(text) < 4:
            continue
        status, path = text[:2], text[3:]
        if "R" in status or "C" in status:
            names.append(path)
            if index < len(entries) and entries[index]:
                names.append(entries[index].decode("utf-8", errors="surrogateescape"))
                index += 1
        else:
            names.append(path)
    return names


def guard_example_paths(paths: list[str] | None = None) -> list[str]:
    names = paths if paths is not None else git_changed_path_names()
    # example/ 整体是治理排除项，唯一常驻内容只有样例输入 example/workbench-shell/prompts/；
    # 其余 example/ 前缀的 changed-path 一律拒绝。
    allowed_prefixes = ("example/workbench-shell/prompts/",)
    hits = sorted(
        {
            name
            for name in names
            if path_has_example_prefix(name) and not name.startswith(allowed_prefixes)
        }
    )
    return [f"EXAMPLE_PATH_IN_SCOPE: {name}" for name in hits]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--guard-example-changed-paths", action="store_true", help="拒绝任何以 example/ 开头的 changed-path 名称")
    args = parser.parse_args()
    errors = check_domains()
    if args.guard_example_changed_paths:
        errors.extend(guard_example_paths())
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("治理 scope 无意外交叠；example/** 排除项已声明。")
    if args.guard_example_changed_paths:
        print("example changed-path guard 通过：没有 example/ 前缀变更。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
