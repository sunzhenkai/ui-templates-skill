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
    parser.add_argument(
        "--source-root",
        action="append",
        default=[],
        dest="source_roots",
        help="仅用于本会话 Generate-from-source：source-id=/path/to/checkout",
    )
    parser.add_argument(
        "--require-source-replay",
        action="store_true",
        help="仅当本会话 structural Generate-from-source 时要求 replay 计数全通过",
    )
    parser.add_argument("--capture-receipt", type=Path, help="可选 usage closure receipt，供 session replay 对照")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    paths = args.paths or [ROOT / "templates"]
    from .fidelity import FidelityError, load_fidelity, parse_source_roots

    try:
        source_roots = parse_source_roots(args.source_roots)
    except FidelityError as exc:
        payload = {
            "result_schema_version": 1,
            "exit_code": 1,
            "findings": [{"code": exc.code, "path": "-", "severity": "error", "message": str(exc), "details": exc.details}],
            "counts": {"templates": 0, "findings": 1, "errors": 1, "warnings": 0},
        }
        print(__import__("json").dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
        return 1
    receipt = None
    if args.capture_receipt is not None:
        receipt = load_fidelity(args.capture_receipt) if args.capture_receipt.suffix.lower() != ".json" else __import__("json").loads(args.capture_receipt.read_text(encoding="utf-8"))
    result = validate_paths(
        paths,
        ROOT,
        index=args.index,
        source_roots=source_roots,
        require_source_replay=args.require_source_replay,
        capture_receipt=receipt,
    )
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
