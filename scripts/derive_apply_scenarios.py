#!/usr/bin/env python3
"""Emit the deterministic Phase 8 scenario IDs required by a fidelity profile."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_apply_state.fidelity import derive_scenario_ids
from template_validation.fidelity import load_fidelity


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("fidelity", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    scenarios = derive_scenario_ids(load_fidelity(args.fidelity))
    if args.json:
        print(json.dumps({"count": len(scenarios), "scenario_ids": scenarios}, ensure_ascii=False, indent=2))
    else:
        print("\n".join(scenarios))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
