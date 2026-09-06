#!/usr/bin/env python3
"""bundle 内置 UI template schema v2 validator。"""
from __future__ import annotations

import sys

try:
    from template_validation.cli import main
except ModuleNotFoundError as exc:
    if exc.name in {"yaml", "jsonschema", "referencing"}:
        print("error: portable validator requires pinned PyYAML/jsonschema dependencies", file=sys.stderr)
        raise SystemExit(2) from exc
    raise


if __name__ == "__main__":
    raise SystemExit(main())
