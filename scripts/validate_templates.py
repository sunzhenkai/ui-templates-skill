#!/usr/bin/env python3
"""兼容入口：验证 schema v2 UI templates。

用法：
  python3 scripts/validate_templates.py [PATH ...] [--json] [--index PATH]
"""
from __future__ import annotations

import sys

try:
    from template_validation.cli import main
except ModuleNotFoundError as exc:  # pragma: no cover - 由 clean-env 安装测试覆盖依赖
    if exc.name in {"yaml", "jsonschema", "referencing"}:
        print("error: governance dependencies are missing; install governance/requirements-governance.txt", file=sys.stderr)
        raise SystemExit(2) from exc
    raise

if __name__ == "__main__":
    raise SystemExit(main())
