#!/usr/bin/env python3
"""Copy a published portable package into an Active Instance and create project binding."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml


def load(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with Path(temporary_name).open("w", encoding="utf-8") as stream:
            yaml.safe_dump(value, stream, sort_keys=False, allow_unicode=True)
        Path(temporary_name).replace(path)
    finally:
        Path(temporary_name).unlink(missing_ok=True)


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value: Any) -> dict[str, str]:
    return {"algorithm": "sha256-canonical-json-v1", "value": hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", required=True, type=Path)
    parser.add_argument("--design-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--language", required=True)
    parser.add_argument("--ui-framework", required=True)
    parser.add_argument("--styling", required=True)
    parser.add_argument("--component-system")
    parser.add_argument("--bundler")
    parser.add_argument("--routing")
    parser.add_argument("--package-manager")
    args = parser.parse_args(argv)
    package = args.package.resolve()
    manifest_path = package / "design-system.yaml"
    if not manifest_path.is_file() or (package / "binding.yaml").is_file():
        print("PACKAGE_INVALID: expected design-system/v1 package without binding", file=sys.stderr)
        return 2
    manifest = load(manifest_path)
    if manifest.get("schema") != "design-system/v1" or manifest.get("status") != "frozen":
        print("PACKAGE_NOT_FROZEN: only frozen design-system/v1 packages can be adopted", file=sys.stderr)
        return 2
    root = args.design_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    for forbidden in ("freeze.yaml",):
        if (root / forbidden).is_file():
            print(f"LEGACY_FREEZE_PRESENT: migrate or explicitly discard {forbidden}", file=sys.stderr)
            return 2
    for relative in ("design-system.yaml", "meta.yaml"):
        source = package / relative
        if source.is_file():
            temporary = root / f".{relative}.adopting"
            shutil.copy2(source, temporary)
            temporary.replace(root / relative)
    if (package / "core").is_dir():
        temporary = root / ".core.adopting"
        shutil.copytree(package / "core", temporary)
        if (root / "core").exists():
            shutil.rmtree((root / "core"))
        temporary.replace(root / "core")
    binding = {
        "schema": "design-system-binding/v1",
        "contract_id": manifest["id"],
        "contract_version": manifest["version"],
        "output_root": args.output_root,
        "stack": {
            "language": args.language,
            "ui_framework": args.ui_framework,
            "styling": args.styling,
            "component_system": args.component_system,
            "bundler": args.bundler,
            "routing": args.routing,
            "package_manager": args.package_manager,
        },
        "primitive_paths": {},
        "projections": [],
        "updated_at": "2026-09-08T00:00:00Z",
    }
    binding["binding_digest"] = digest(binding)
    temporary = root / ".binding.yaml.adopting"
    dump(temporary, binding)
    temporary.replace(root / "binding.yaml")
    print(json.dumps({"ok": True, "source": manifest["id"], "version": manifest["version"], "binding": str(root / "binding.yaml")}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
