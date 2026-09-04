#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_authoring.gate import run_authoring_gate


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fail-closed repo Authoring staging gate and report")
    parser.add_argument("--request", required=True, type=Path)
    parser.add_argument(
        "--source-root", required=True, type=Path,
        help="Session source checkout for this Generate-from-source; never infer from meta.sources[]",
    )
    parser.add_argument("--candidate-template", required=True, type=Path)
    parser.add_argument("--candidate-index", required=True, type=Path)
    parser.add_argument("--production-index", required=True, type=Path)
    parser.add_argument("--validator", required=True, type=Path)
    parser.add_argument("--eval-runner", required=True, type=Path)
    parser.add_argument("--receipt-out", required=True, type=Path)
    parser.add_argument("--report-out", type=Path)
    parser.add_argument("--promote-index", action="store_true")
    args = parser.parse_args(argv)
    report = run_authoring_gate(
        request_path=args.request, source_root=args.source_root,
        candidate_template=args.candidate_template, candidate_index=args.candidate_index,
        production_index=args.production_index, validator=args.validator,
        eval_runner=args.eval_runner, receipt_out=args.receipt_out,
        promote_index=args.promote_index,
    )
    text = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.report_out:
        args.report_out.parent.mkdir(parents=True, exist_ok=True)
        args.report_out.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
