#!/usr/bin/env python3
"""Resolve vendor references strictly from an Active Instance binding."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


def load(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def resolve(binding_path: Path, manifest_path: Path) -> dict[str, Any]:
    binding = load(binding_path)
    manifest = load(manifest_path)
    stack = binding.get("stack", {})
    triggers = {"visual-direction"}
    if stack.get("component_system") == "shadcn":
        triggers.add("component-system:shadcn")
    if stack.get("styling") == "tailwind":
        triggers.add("style-engine:tailwind")
    if stack.get("styling") == "tailwind" and stack.get("tailwind_version", "4") == "4":
        triggers.add("token-projection:tailwind-v4")
    allowed = []
    for vendor in manifest.get("vendors", []):
        matched = sorted(set(vendor.get("allowed_triggers", [])) & triggers)
        if matched:
            allowed.append({"name": vendor["name"], "path": vendor["path"], "triggers": matched, "revision": vendor["revision"], "license": vendor["license"]})
    return {"schema_version": 1, "triggers": sorted(triggers), "allowed": sorted(allowed, key=lambda item: item["name"])}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binding", type=Path, default=Path(".ui-template-design/binding.yaml"))
    parser.add_argument("--vendor-manifest", type=Path, default=Path("skills/ui-template-apply/references/vendor/vendor.yaml"))
    args = parser.parse_args(argv)
    print(json.dumps(resolve(args.binding.resolve(), args.vendor_manifest.resolve()), ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
