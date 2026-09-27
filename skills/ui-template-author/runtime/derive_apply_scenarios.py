#!/usr/bin/env python3
"""Emit the deterministic Phase 8 scenario IDs required by a fidelity profile."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_apply_state.fidelity import derive_scenario_ids
from template_validation.fidelity import load_fidelity, load_data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("fidelity", type=Path)
    parser.add_argument("--layout", type=Path, help="Active Instance core/layout.yaml，提供 placement geometry 与 pattern 闭包场景")
    parser.add_argument("--expectations", type=Path, help="certification 产出的 measured expectation set，逐条产生 oracle 锚定比对场景")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    layout = load_data(args.layout) if args.layout else None
    expectations = load_data(args.expectations) if args.expectations else None
    scenarios = derive_scenario_ids(load_fidelity(args.fidelity), layout, expectations)
    if args.json:
        print(json.dumps({"count": len(scenarios), "scenario_ids": scenarios}, ensure_ascii=False, indent=2))
    else:
        print("\n".join(scenarios))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
