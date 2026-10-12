#!/usr/bin/env python3
"""阻止具体项目名泄漏进 skills/**（示例、测试、经验记录）。

读取仓库根的 .project-denylist（一行一词，# 注释），在目标目录下的文本文件里
大小写不敏感、按词边界（前后不是字母/数字/下划线）匹配；命中打印 file:line 并以 1 退出。
行内含 `project-name-allow` 的命中被放行。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOW_MARKER = "project-name-allow"
SKIP_DIRS = {".git", "node_modules", "__pycache__"}


def load_denylist(path: Path) -> list[str]:
    terms = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            terms.append(line)
    return terms


def build_pattern(terms: list[str]) -> re.Pattern[str]:
    alts = "|".join(re.escape(t) for t in sorted(terms, key=len, reverse=True))
    return re.compile(rf"(?<![A-Za-z0-9_])(?:{alts})(?![A-Za-z0-9_])", re.IGNORECASE)


def iter_files(base: Path, exclude: set[Path]):
    for path in sorted(base.rglob("*")):
        if not path.is_file() or path.resolve() in exclude:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(base).parts):
            continue
        yield path


def scan(roots: list[Path], pattern: re.Pattern[str], exclude: set[Path]) -> list[str]:
    hits = []
    for base in roots:
        for path in iter_files(base, exclude):
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue  # 二进制或不可读文件跳过
            for lineno, line in enumerate(text.splitlines(), 1):
                if ALLOW_MARKER in line:
                    continue
                for m in pattern.finditer(line):
                    rel = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
                    hits.append(f"{rel}:{lineno}: {m.group(0)!r}: {line.strip()[:160]}")
    return hits


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=["skills", "tests", "scripts", "templates"], help="扫描目录（默认 skills tests scripts templates）")
    parser.add_argument("--denylist", default=str(ROOT / ".project-denylist"))
    args = parser.parse_args(argv)
    denylist = Path(args.denylist).resolve()
    terms = load_denylist(denylist)
    if not terms:
        print("denylist 为空", file=sys.stderr)
        return 2
    roots = [(ROOT / p).resolve() if not Path(p).is_absolute() else Path(p) for p in args.paths]
    hits = scan(roots, build_pattern(terms), {denylist})
    for h in hits:
        print(h)
    if hits:
        print(f"\n发现 {len(hits)} 处具体项目名；请改为中性写法，或在该行加 `{ALLOW_MARKER}`。", file=sys.stderr)
        return 1
    print(f"OK: 未发现 denylist 项目名（{len(terms)} 个词，扫描 {", ".join(map(str, args.paths))}）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
