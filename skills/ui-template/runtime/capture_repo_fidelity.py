#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_authoring.capture import CaptureError, capture_from_files, load_document, replay


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Capture a deterministic literal-only repo source graph; never parses or executes source code")
    parser.add_argument("request", type=Path)
    parser.add_argument(
        "--source-root", required=True, type=Path,
        help="Session source checkout for this capture; never infer from published meta.sources[]",
    )
    parser.add_argument("--receipt-out", type=Path)
    parser.add_argument("--replay-receipt", type=Path)
    args = parser.parse_args(argv)
    try:
        receipt = capture_from_files(args.request, args.source_root)
        payload = replay(load_document(args.request), args.source_root, load_document(args.replay_receipt)) if args.replay_receipt else receipt
        if args.receipt_out:
            args.receipt_out.parent.mkdir(parents=True, exist_ok=True)
            args.receipt_out.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
        if args.replay_receipt:
            return 0 if payload["status"] == "passed" else 1
        return 0 if payload["status"] in {"captured", "style-only"} else 1
    except CaptureError as exc:
        payload = {"status": "unsupported" if exc.code.startswith("UNSUPPORTED") else "failed", "error": {"code": exc.code, "message": str(exc), "details": exc.details}}
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
