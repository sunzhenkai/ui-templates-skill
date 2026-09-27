#!/usr/bin/env python3
"""Copy the canonical design-system validator into public skill runtimes."""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ("ui-template-author", "ui-template-apply", "ui-template-design")
CANONICAL_SCRIPT = ROOT / "scripts/validate_design_system.py"
CANONICAL_HELPER = ROOT / "scripts/design_system_validator_discovery.py"
CANONICAL_SCHEMAS = ROOT / "schemas/design-system/v1"


def sync(root: Path = ROOT) -> list[Path]:
    script = root / "scripts/validate_design_system.py"
    helper = root / "scripts/design_system_validator_discovery.py"
    schemas = root / "schemas/design-system/v1"
    if not script.is_file() or not helper.is_file() or not schemas.is_dir():
        raise SystemExit("SCHEMA_DIR_MISSING: canonical design-system validator is incomplete")
    schema_files = sorted(schemas.glob("*.schema.json"))
    if not schema_files:
        raise SystemExit("SCHEMA_DIR_MISSING: design-system/v1 schemas are not installed")
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
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="sync shared design-system validator into public skills")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args(argv)
    written = sync(args.root.resolve())
    for path in written:
        print(path.relative_to(args.root.resolve()).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
