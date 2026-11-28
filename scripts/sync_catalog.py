#!/usr/bin/env python3
"""Maintainer tool: compose and mirror templates/<pkg>/ into skills/ui-template-apply/catalog/<pkg>/.

templates/ is the source of truth (base theme + extensions/); the catalog copy ships inside the apply skill
so it works offline.
  sync_catalog.py [--check] [--inspect [PKG]]
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "templates"
DST = ROOT / "skills/ui-template-apply/catalog"
STATIC_FILES = ("fonts.css", "CHANGELOG.md")

sys.path.insert(0, str(ROOT / "skills/ui-template-apply/scripts"))
import compose_package  # noqa: E402


def packages() -> list[Path]:
    return sorted(p for p in SRC.iterdir() if (p / "meta.yaml").is_file())


def rendered_files(pkg: Path) -> dict[str, bytes]:
    composed = compose_package.compose_package(pkg)
    out: dict[str, bytes] = {
        "meta.yaml": composed.meta_text.encode("utf-8"),
        "theme.css": composed.theme_css.encode("utf-8"),
    }
    for name in STATIC_FILES:
        if (pkg / name).is_file():
            out[name] = (pkg / name).read_bytes()
    return out


def diff() -> list[str]:
    out = []
    names = {p.name for p in packages()}
    for pkg in packages():
        expected = rendered_files(pkg)
        for name, data in expected.items():
            b = DST / pkg.name / name
            if not b.is_file() or b.read_bytes() != data:
                out.append(f"{pkg.name}/{name}")
        dst_pkg = DST / pkg.name
        if dst_pkg.is_dir():
            for existing in sorted(dst_pkg.iterdir()):
                if existing.is_file() and existing.name not in expected:
                    out.append(f"{pkg.name}/{existing.name} (extra in catalog)")
    for extra in (p for p in DST.iterdir() if p.is_dir() and p.name not in names) if DST.is_dir() else []:
        out.append(f"{extra.name}/ (not in templates)")
    return out


def inspect_packages(target: str | None) -> int:
    selected = [p for p in packages() if target in (None, "", p.name)]
    if not selected:
        print(f"unknown package: {target}", file=sys.stderr)
        return 1
    for pkg in selected:
        composed = compose_package.compose_package(pkg)
        print(f"Package: {pkg.name}")
        if not composed.has_extensions:
            print("  extensions: (none)")
            continue
        print(f"  extensions: {', '.join(composed.ext_ids)}")
        for t in composed.traces:
            if t["action"] == "override":
                print(f"  [override] {t['ext']} {t['block']} {t['token']}: {t['old']} -> {t['new']}")
            elif t["action"] == "unset":
                print(f"  [unset]    {t['ext']} {t['block']} {t['token']} (was: {t['old']})")
            else:
                print(f"  [add]      {t['ext']} {t['block']} {t['token']}: {t['new']}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--inspect", nargs="?", const="", metavar="PKG", help="show composed extension diff against base")
    args = parser.parse_args(argv)
    if args.inspect is not None:
        return inspect_packages(args.inspect)
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
        for name, data in rendered_files(pkg).items():
            (DST / pkg.name / name).write_bytes(data)
    print(f"synced {len(packages())} package(s) into {DST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
