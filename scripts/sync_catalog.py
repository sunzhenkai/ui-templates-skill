#!/usr/bin/env python3
"""Maintainer tool: mirror templates/<pkg>/ into skills/ui-template-apply/catalog/<pkg>/.

templates/ is the source of truth; the catalog copy ships inside the apply skill so it works offline.
  sync_catalog.py [--check]
"""
from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "templates"
DST = ROOT / "skills/ui-template-apply/catalog"
FILES = ("meta.yaml", "theme.css", "CHANGELOG.md")


def packages() -> list[Path]:
    return sorted(p for p in SRC.iterdir() if (p / "meta.yaml").is_file())


def diff() -> list[str]:
    out = []
    names = {p.name for p in packages()}
    for pkg in packages():
        for name in FILES:
            if (pkg / name).is_file():
                a, b = pkg / name, DST / pkg.name / name
                if not b.is_file() or not filecmp.cmp(a, b, shallow=False):
                    out.append(f"{pkg.name}/{name}")
    for extra in (p for p in DST.iterdir() if p.is_dir() and p.name not in names) if DST.is_dir() else []:
        out.append(f"{extra.name}/ (not in templates)")
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    stale = diff()
    if args.check:
        for line in stale:
            print("stale " + line)
        print("catalog in sync" if not stale else f"{len(stale)} stale; run scripts/sync_catalog.py", file=sys.stderr if stale else sys.stdout)
        return 1 if stale else 0
    if DST.is_dir():
        shutil.rmtree(DST)
    for pkg in packages():
        (DST / pkg.name).mkdir(parents=True)
        for name in FILES:
            if (pkg / name).is_file():
                shutil.copy2(pkg / name, DST / pkg.name / name)
    print(f"synced {len(packages())} package(s) into {DST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
