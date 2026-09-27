#!/usr/bin/env python3
"""Record a legacy design-freeze migration; unresolved input can never freeze."""
from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from pathlib import Path

import yaml


def digest_file(path: Path) -> dict[str, str]:
    return {"algorithm": "sha256-file-v1", "value": hashlib.sha256(path.read_bytes()).hexdigest()}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--freeze", required=True, type=Path)
    parser.add_argument("--target-kind", required=True, choices=("package", "active-instance"))
    parser.add_argument("--target-root", required=True, type=Path)
    parser.add_argument("--receipt-out", required=True, type=Path)
    parser.add_argument("--unresolved", action="append", default=[])
    args = parser.parse_args(argv)
    target = args.target_root.resolve()
    if args.target_kind == "package" and (target / "binding.yaml").exists():
        print("TARGET_INVALID: package target contains binding", file=sys.stderr)
        return 2
    if args.target_kind == "active-instance" and not (target / "binding.yaml").exists():
        print("TARGET_INVALID: active target requires binding", file=sys.stderr)
        return 2
    unresolved = list(args.unresolved)
    freeze = yaml.safe_load(args.freeze.read_text(encoding="utf-8"))
    if not isinstance(freeze, dict) or freeze.get("schema") != "design-freeze/v1":
        unresolved.append("source is not design-freeze/v1")
    manifest = target / "design-system.yaml"
    if not manifest.is_file():
        unresolved.append("target design-system.yaml is missing")
    status = "completed" if not unresolved else "failed"
    receipt = {
        "schema": "design-system-migration/v1",
        "source": {"kind": "design-freeze-v1", "identity": str(args.freeze), "digest": digest_file(args.freeze)},
        "target": {"kind": args.target_kind, "identity": str(target), "digest": {"algorithm": "sha256-file-v1", "value": hashlib.sha256(manifest.read_bytes()).hexdigest()} if manifest.is_file() else {"algorithm": "sha256-file-v1", "value": "0" * 64}},
        "status": status,
        "changes": [],
        "unresolved": unresolved,
        "errors": [],
        "completed_at": "2026-09-08T00:00:00Z",
    }
    out = args.receipt_out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{out.name}.", dir=out.parent)
    with Path(temporary).open("w", encoding="utf-8") as stream:
        yaml.safe_dump(receipt, stream, sort_keys=False, allow_unicode=True)
    Path(temporary).replace(out)
    print(f"receipt={out} status={status}")
    return 0 if status == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
