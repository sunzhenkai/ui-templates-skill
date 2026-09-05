#!/usr/bin/env python3
"""bundle 内置双 public skill contract eval runner。"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from contract_eval.runner import main
except ModuleNotFoundError as exc:
    if exc.name in {"yaml", "jsonschema", "referencing"}:
        print("error: portable eval requires pinned PyYAML/jsonschema dependencies", file=sys.stderr)
        raise SystemExit(2) from exc
    raise


if __name__ == "__main__":
    bundle_root = Path(__file__).resolve().parents[3]
    raise SystemExit(main(["--root", str(bundle_root), *sys.argv[1:]]))
