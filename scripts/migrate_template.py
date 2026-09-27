#!/usr/bin/env python3
"""生成 v1→v2 候选目录和迁移报告，不替换源模板。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_migrator import MigrationError, migrate


def main() -> int:
    parser = argparse.ArgumentParser(description="非破坏迁移 UI template v1 到 schema v2 candidate")
    parser.add_argument("source", type=Path)
    parser.add_argument("candidate", type=Path)
    args = parser.parse_args()
    try:
        report = migrate(args.source, args.candidate)
    except MigrationError as exc:
        parser.error(str(exc))
    print(json.dumps({key: len(report[key]) for key in ("converted", "inferred", "unresolved", "breaking")}, sort_keys=True))
    print(f"candidate: {args.candidate}")
    print(f"report: {args.candidate / 'migration-report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
