#!/usr/bin/env python3
"""Copy the canonical design-system validator into public skill runtimes."""
from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ("ui-template-author", "ui-template-apply", "ui-template-design")
# The fidelity sidecar schema ships with author (capture/authoring) and apply
# (structural fidelity consumption); design does not distribute it.
FIDELITY_SKILLS = ("ui-template-author", "ui-template-apply")
CANONICAL_SCRIPT = ROOT / "scripts/validate_design_system.py"
CANONICAL_HELPER = ROOT / "scripts/design_system_validator_discovery.py"
CANONICAL_SCHEMAS = ROOT / "schemas/design-system/v1"
CANONICAL_FIDELITY_SCHEMAS = ROOT / "schemas/template/fidelity/v1"


def sync(root: Path = ROOT) -> list[Path]:
    script = root / "scripts/validate_design_system.py"
    helper = root / "scripts/design_system_validator_discovery.py"
    schemas = root / "schemas/design-system/v1"
    if not script.is_file() or not helper.is_file() or not schemas.is_dir():
        raise SystemExit("SCHEMA_DIR_MISSING: canonical design-system validator is incomplete")
    schema_files = sorted(schemas.glob("*.schema.json"))
    if not schema_files:
        raise SystemExit("SCHEMA_DIR_MISSING: design-system/v1 schemas are not installed")
    fidelity = root / "schemas/template/fidelity/v1"
    fidelity_files = sorted(fidelity.glob("*.schema.json")) if fidelity.is_dir() else []
    written: list[Path] = []
    for skill in SKILLS:
        runtime = root / "skills" / skill / "runtime"
        runtime.mkdir(parents=True, exist_ok=True)
        targets = (
            (script, runtime / "shared_validate_design_system.py"),
            (helper, runtime / "validator_discovery.py"),
        )
        for source, destination in targets:
            shutil.copyfile(source, destination)
            written.append(destination)
        dest_schema = runtime / "schemas/design-system/v1"
        dest_schema.mkdir(parents=True, exist_ok=True)
        names = {path.name for path in schema_files}
        for source in schema_files:
            destination = dest_schema / source.name
            shutil.copyfile(source, destination)
            written.append(destination)
        for extra in dest_schema.glob("*.schema.json"):
            if extra.name not in names:
                extra.unlink()
    for skill in FIDELITY_SKILLS:
        runtime = root / "skills" / skill / "runtime"
        dest_fidelity = runtime / "schemas/template/fidelity/v1"
        dest_fidelity.mkdir(parents=True, exist_ok=True)
        names = {path.name for path in fidelity_files}
        for source in fidelity_files:
            destination = dest_fidelity / source.name
            shutil.copyfile(source, destination)
            written.append(destination)
        for extra in dest_fidelity.glob("*.schema.json"):
            if extra.name not in names:
                extra.unlink()
    return written


def check(root: Path = ROOT) -> list[Path]:
    """Return runtime copies whose content drifted from the canonical schemas."""
    drifted: list[Path] = []
    canonical = sorted((root / "schemas/design-system/v1").glob("*.schema.json"))
    canonical += sorted((root / "schemas/template/fidelity/v1").glob("*.schema.json"))
    by_dir = {
        "design-system/v1": sorted((root / "schemas/design-system/v1").glob("*.schema.json")),
        "template/fidelity/v1": sorted((root / "schemas/template/fidelity/v1").glob("*.schema.json")),
    }
    for skill in SKILLS:
        for sub, sources in by_dir.items():
            if sub == "template/fidelity/v1" and skill not in FIDELITY_SKILLS:
                continue
            dest_dir = root / "skills" / skill / "runtime" / "schemas" / sub
            for source in sources:
                destination = dest_dir / source.name
                if not destination.is_file() or not filecmp.cmp(source, destination, shallow=False):
                    drifted.append(destination)
            if dest_dir.is_dir():
                names = {path.name for path in sources}
                for extra in dest_dir.glob("*.schema.json"):
                    if extra.name not in names:
                        drifted.append(extra)
    return drifted


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="sync shared design-system validator into public skills")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--check", action="store_true", help="fail if runtime schema copies drifted from canonical")
    args = parser.parse_args(argv)
    root = args.root.resolve()
    if args.check:
        drifted = check(root)
        for path in drifted:
            print(path.relative_to(root).as_posix())
        if drifted:
            print("RUNTIME_SCHEMA_DRIFT: run scripts/sync_design_system_validator.py", file=sys.stderr)
            return 1
        return 0
    written = sync(root)
    for path in written:
        print(path.relative_to(root).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
