#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_authoring.capture import (
    CaptureError,
    capture_from_files,
    load_document,
    replay,
    write_source_graph_skeleton,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Capture a deterministic literal-only repo source graph; never parses or executes source code",
    )
    parser.add_argument("request", nargs="?", type=Path)
    parser.add_argument(
        "--source-root",
        type=Path,
        help="Session source checkout for this capture; never infer from published meta.sources[]",
    )
    parser.add_argument("--receipt-out", type=Path)
    parser.add_argument("--replay-receipt", type=Path)
    parser.add_argument(
        "--init-source-graph",
        type=Path,
        help="Write a closed shell-slot skeleton YAML. Does not parse TSX/JS or source trees.",
    )
    args = parser.parse_args(argv)
    if args.init_source_graph is not None:
        try:
            written = write_source_graph_skeleton(args.init_source_graph)
        except CaptureError as exc:
            payload = {
                "status": "failed",
                "error": {"code": exc.code, "message": str(exc), "details": exc.details},
            }
            print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
            return 2
        payload = {
            "status": "skeleton",
            "path": str(written),
            "closure_complete": False,
            "parses_source": False,
        }
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
        return 0
    if args.request is None or args.source_root is None:
        parser.error("request and --source-root are required unless --init-source-graph is set")
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
