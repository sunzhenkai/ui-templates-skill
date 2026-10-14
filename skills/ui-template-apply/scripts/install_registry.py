#!/usr/bin/env python3
"""Install the ui-template library (shadcn components + blocks) and a style package into a project.

Deterministic and offline: files are copied from library/ and catalog/<package>/, every written
file is hashed into ui-template.lock.json so later upgrades can tell local edits from upstream ones.

  install_registry.py --project DIR --package workbench-shell [--items all|name,...] [--dry-run]
  install_registry.py --project DIR --status        # local edits vs lock, upstream changes
  install_registry.py --project DIR --upgrade       # rewrite untouched files, report conflicts
  install_registry.py --project DIR --resolve FILE  # after merging a conflict by hand: mark it merged

Prints the npm dependencies to add; it never runs a package manager itself.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
LIB = SKILL / "library"
CATALOG = SKILL / "catalog"
LOCK = "ui-template.lock.json"


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
    return files


def read_lock(project: Path) -> dict:
    path = project / LOCK
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}


def write_lock(project: Path, package: str, version: str, items: list[str], files: dict[str, str]) -> None:
    lock = {"package": package, "version": version, "items": sorted(items), "files": dict(sorted(files.items()))}
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


def deps(items: list[dict]) -> list[str]:
    return sorted({dep for item in items for dep in item.get("dependencies", [])})


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--package")
    parser.add_argument("--items", default="all")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--upgrade", action="store_true")
    parser.add_argument("--resolve", nargs="+", metavar="FILE", help="project-relative files merged by hand; their base becomes the current upstream")
    args = parser.parse_args(argv)
    project = args.project.resolve()
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
        hashes = dict(lock.get("files", {}))
        for target in args.resolve:
            if target not in files:
                parser.error(f"{target} is not an installed library file")
            hashes[target] = sha(files[target].read_bytes())
            print(f"resolved    {target}  (now tracked as a local edit on top of upstream)")
        write_lock(project, package, package_version(package), lock.get("items", ["all"]), hashes)
        return 0
    states = classify(project, files, lock)

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
        write_lock(project, package, package_version(package), names, hashes)
    print("\nnpm dependencies:\n  " + " ".join(sorted(set(deps(items)) | set(registry.get("baseDependencies", [])))))
    print(f"devDependencies:\n  {' '.join(registry.get('devDependencies', []))}")
    return 1 if conflicts else 0


if __name__ == "__main__":
    sys.exit(main())
