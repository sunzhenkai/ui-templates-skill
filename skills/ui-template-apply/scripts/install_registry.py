#!/usr/bin/env python3
"""Install the ui-template library (shadcn components + blocks) and a style package into a project.

Deterministic and offline: files are copied from library/ and catalog/<package>/, every written
file is hashed into ui-template.lock.json so later upgrades can tell local edits from upstream ones.

  install_registry.py --project DIR --package quiet-inset --init  # new project: copy starter/ (never overwrites), then install
  install_registry.py --project DIR --package workbench-shell [--items all|name,...] [--dry-run]
  install_registry.py --project DIR --status        # local edits vs lock, upstream changes
  install_registry.py --project DIR --upgrade       # rewrite untouched files, report conflicts
  install_registry.py --project DIR --resolve FILE  # after merging a conflict by hand: mark it merged

theme.css is merged on upgrade: the new package theme is written with the project's whitelisted token values
(contract/tokens.json → customizable) carried over. Other theme differences are dropped and listed.
Prints the npm dependencies to add; it never runs a package manager itself.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
LIB = SKILL / "library"
CATALOG = SKILL / "catalog"
STARTER = SKILL / "starter"
LOCK = "ui-template.lock.json"
THEME_BLOCKS = ("@theme inline", "@theme", ":root", ".dark")
FONT_IMPORT = re.compile(r'''@import\s+["']([^"']+)["']''')


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_registry() -> dict:
    return json.loads((LIB / "registry.json").read_text(encoding="utf-8"))


def resolve(registry: dict, wanted: list[str]) -> list[dict]:
    items = {item["name"]: item for item in registry["items"]}
    order: list[str] = []

    def visit(name: str) -> None:
        if name not in items:
            raise SystemExit(f"unknown registry item: {name}")
        if name in order:
            return
        for dep in items[name].get("registryDependencies", []):
            visit(dep)
        order.append(name)

    for name in (list(items) if wanted == ["all"] else wanted):
        visit(name)
    return [items[name] for name in order]


def planned_files(registry: dict, items: list[dict], package: str) -> dict[str, Path]:
    files: dict[str, Path] = {}
    for item in items:
        for entry in item["files"]:
            files[entry["target"]] = LIB / entry["path"]
    pkg = CATALOG / package
    if not (pkg / "meta.yaml").is_file():
        raise SystemExit(f"unknown package: {package} (catalog/{package}/meta.yaml missing)")
    files[registry["theme_target"]] = pkg / "theme.css"
    if (pkg / "fonts.css").is_file():
        files[registry["fonts_target"]] = pkg / "fonts.css"
    return files


def customizable() -> set[str]:
    contract = json.loads((SKILL / "contract/tokens.json").read_text(encoding="utf-8"))["customizable"]
    return {name.removeprefix("--") for name in contract["colors"] + contract["scale"]}


def theme_tokens(css: str) -> dict[tuple[str, str], str]:
    """(block, token name without --) → value, for the blocks a theme declares tokens in."""
    out = {}
    for selector in THEME_BLOCKS:
        for m in re.finditer(re.escape(selector) + r"\s*\{([^}]*)\}", css):
            for name, value in re.findall(r"(?<![\w-])--([\w-]+)\s*:\s*([^;]+?)\s*;", m.group(1)):
                out[(selector, name)] = value
    return out


def merge_theme(upstream: str, current: str, keep: set[str], base: dict[tuple[str, str], str]) -> tuple[str, list[str]]:
    """Three-way: tokens the project changed (current ≠ base) are carried onto upstream when customizable,
    dropped otherwise; everything else takes the upstream value. Returns the merged theme and the dropped tokens."""
    mine, theirs = theme_tokens(current), theme_tokens(upstream)
    changed = {key: value for key, value in mine.items() if base.get(key) != value}
    out = upstream
    for selector in THEME_BLOCKS:
        def carry(m: re.Match[str], selector: str = selector) -> str:
            body = m.group(1)
            for (block, name), value in changed.items():
                if block == selector and name in keep and (block, name) in theirs:
                    body = re.sub(rf"((?<![\w-])--{re.escape(name)}\s*:\s*)[^;]+;", lambda x: x.group(1) + value + ";", body)
            return m.group(0).replace(m.group(1), body)
        out = re.sub(re.escape(selector) + r"\s*\{([^}]*)\}", carry, out)
    dropped = sorted(f"{block} --{name}" for (block, name), value in changed.items()
                     if name not in keep and theirs.get((block, name)) != value)
    return out, dropped


def encode_tokens(tokens: dict[tuple[str, str], str]) -> dict[str, str]:
    return {f"{block} --{name}": value for (block, name), value in sorted(tokens.items())}


def decode_tokens(data: dict[str, str]) -> dict[tuple[str, str], str]:
    return {(key.rsplit(" --", 1)[0], key.rsplit(" --", 1)[1]): value for key, value in data.items()}


def init_project(project: Path) -> None:
    for source in sorted(p for p in STARTER.rglob("*") if p.is_file() and "node_modules" not in p.parts):
        target = source.relative_to(STARTER)
        dest = project / target
        if dest.exists():
            if dest.read_bytes() != source.read_bytes():
                print(f"kept        {target}  (exists; starter version not copied)")
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(source.read_bytes())
        print(f"starter     {target}")


def read_lock(project: Path) -> dict:
    path = project / LOCK
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}


def write_lock(project: Path, package: str, version: str, items: list[str], files: dict[str, str], theme_base: dict[str, str]) -> None:
    lock = {"package": package, "version": version, "items": sorted(items), "files": dict(sorted(files.items()))}
    if theme_base:
        lock["theme_base"] = theme_base  # package token values as installed; lets upgrades tell project edits from upstream ones
    (project / LOCK).write_text(json.dumps(lock, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def package_version(package: str) -> str:
    for line in (CATALOG / package / "meta.yaml").read_text(encoding="utf-8").splitlines():
        if line.startswith("version:"):
            return line.split(":", 1)[1].strip()
    return "0.0.0"


def classify(project: Path, files: dict[str, Path], lock: dict) -> dict[str, str]:
    """new | same | upstream (safe to overwrite) | local (user edited, upstream same) | conflict."""
    locked = lock.get("files", {})
    out = {}
    for target, source in files.items():
        dest = project / target
        upstream = sha(source.read_bytes())
        if not dest.exists():
            out[target] = "new"
            continue
        current = sha(dest.read_bytes())
        base = locked.get(target)
        if current == upstream:
            out[target] = "same"
        elif base is None:
            out[target] = "conflict"  # pre-existing file we never wrote
        elif current == base:
            out[target] = "upstream"
        elif upstream == base:
            out[target] = "local"
        else:
            out[target] = "conflict"
    return out


def deps(items: list[dict], key: str = "dependencies") -> list[str]:
    return sorted({dep for item in items for dep in item.get(key, [])})


def font_deps(files: dict[str, Path], registry: dict) -> list[str]:
    fonts = files.get(registry["fonts_target"])
    return sorted(f"{name}@^5" for name in FONT_IMPORT.findall(fonts.read_text(encoding="utf-8"))) if fonts else []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--package")
    parser.add_argument("--items", default="all")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--upgrade", action="store_true")
    parser.add_argument("--resolve", nargs="+", metavar="FILE", help="project-relative files merged by hand; their base becomes the current upstream")
    parser.add_argument("--init", action="store_true", help="copy starter/ into the project first (existing files are kept)")
    args = parser.parse_args(argv)
    project = args.project.resolve()
    if args.init:
        if args.package is None:
            parser.error("--init needs --package")
        project.mkdir(parents=True, exist_ok=True)
        if not args.dry_run:
            init_project(project)
    registry = load_registry()
    lock = read_lock(project)
    package = args.package or lock.get("package")
    if package is None:
        parser.error("--package is required on first install")
    wanted = lock.get("items", ["all"]) if (args.status or args.upgrade) and args.items == "all" and lock else args.items.split(",")
    items = resolve(registry, wanted)
    files = planned_files(registry, items, package)
    if args.resolve:
        if not lock:
            parser.error("--resolve needs an existing ui-template.lock.json")
        hashes, theme_base = dict(lock.get("files", {})), lock.get("theme_base", {})
        for target in args.resolve:
            if target not in files:
                parser.error(f"{target} is not an installed library file")
            hashes[target] = sha(files[target].read_bytes())
            if target == registry["theme_target"]:
                theme_base = encode_tokens(theme_tokens(files[target].read_text(encoding="utf-8")))
            print(f"resolved    {target}  (now tracked as a local edit on top of upstream)")
        write_lock(project, package, package_version(package), lock.get("items", ["all"]), hashes, theme_base)
        return 0
    states = classify(project, files, lock)
    theme_target = registry["theme_target"]
    theme_base = lock.get("theme_base", {})
    merge_theme_now = (args.upgrade or args.status) and states.get(theme_target) == "conflict" and theme_target in lock.get("files", {})
    if merge_theme_now:
        states[theme_target] = "merge"

    if args.status:
        for target, state in sorted(states.items()):
            if state != "same":
                print(f"{state:9} {target}")
        return 1 if "conflict" in states.values() else 0

    if lock and not args.upgrade and any(s in ("upstream", "conflict") for s in states.values()):
        print("project already installed; use --status / --upgrade", file=sys.stderr)
        return 2
    conflicts = [t for t, s in states.items() if s == "conflict"]
    hashes = dict(lock.get("files", {}))
    for target, source in files.items():
        state = states[target]
        if state in ("conflict", "local"):
            continue
        data = source.read_bytes()
        hashes[target] = sha(data)
        if target == theme_target:
            upstream_tokens = theme_tokens(data.decode("utf-8"))
            if state == "merge":
                current = (project / target).read_text(encoding="utf-8")
                # locks written before theme_base existed: treat every customizable difference as the project's
                base = decode_tokens(theme_base) if theme_base else {k: v for k, v in upstream_tokens.items() if k[1] not in customizable()}
                merged, dropped = merge_theme(data.decode("utf-8"), current, customizable(), base)
                data = merged.encode("utf-8")
                for token in dropped:
                    print(f"DROPPED     {target} {token}  (not customizable; re-apply and record in ui-decisions.yaml → theme_deviations if still wanted)")
            theme_base = encode_tokens(upstream_tokens)
        if state != "same" and not args.dry_run:
            dest = project / target
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        if state != "same":
            print(f"{'would write' if args.dry_run else 'wrote':11} {target}")
    for target in conflicts:
        print(f"CONFLICT    {target}  (edited locally and changed upstream; merge by hand, then rerun --upgrade)")
    if not args.dry_run:
        # adding items to an existing install extends the tracked set; it never forgets earlier items
        names = sorted(set(lock.get("items", [])) | {i["name"] for i in items}) if lock and not args.upgrade else [i["name"] for i in items]
        write_lock(project, package, package_version(package), names, hashes, theme_base)
    runtime = set(deps(items)) | set(registry.get("baseDependencies", [])) | set(font_deps(files, registry))
    print("\nnpm dependencies:\n  " + " ".join(sorted(runtime)))
    print("devDependencies:\n  " + " ".join(sorted(set(registry.get("devDependencies", [])) | set(deps(items, "devDependencies")))))
    return 1 if conflicts else 0


if __name__ == "__main__":
    sys.exit(main())
