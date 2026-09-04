from __future__ import annotations

import argparse
import json
from pathlib import Path

from .validator import validate_paths

ROOT = Path(__file__).resolve().parents[2]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="fail-closed 校验 UI template schema v2")
    parser.add_argument("paths", nargs="*", type=Path, default=[ROOT / "templates"], help="模板目录或包含模板的目录")
    parser.add_argument("--index", type=Path, help="显式 INDEX.md；省略时从模板集合目录推断")
    parser.add_argument("--json", action="store_true", dest="json_output", help="输出稳定 JSON")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    paths = args.paths or [ROOT / "templates"]
    result = validate_paths(paths, ROOT, index=args.index)
    payload = result.to_dict()
    if args.json_output:
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
    else:
        for template in payload["templates"]:
            print(f"[{template['name']}] schema={template.get('schema_version')} version={template.get('version')}")
        for finding in payload["findings"]:
            print(f"  {finding['severity'].upper():7} {finding['code']} {finding['path']}: {finding['message']}")
        for theme, counts in payload["contrast"].items():
            print(f"  contrast {theme}: checked={counts['checked']} failed={counts['failed']} skipped={counts['skipped']} waived={counts['waived']}")
        status = "FAILED" if payload["exit_code"] else "PASSED"
        print(f"{status}: {payload['counts']['templates']} template(s), {payload['counts']['errors']} error(s), {payload['counts']['warnings']} warning(s)")
    return payload["exit_code"]
