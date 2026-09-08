#!/usr/bin/env python3
"""Fail-closed discovery wrapper for the shared design-system validator."""
from __future__ import annotations

import sys
from pathlib import Path

DESIGN_SYSTEM_VALIDATOR_ROLE = "discovery"

_RUNTIME = Path(__file__).resolve().parent
if str(_RUNTIME) not in sys.path:
    sys.path.insert(0, str(_RUNTIME))

from validator_discovery import run_validator  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if not arguments or arguments[0] not in {"validate", "compute-digest"}:
        raise SystemExit("USAGE_INVALID: expected validate|compute-digest")
    return run_validator(Path(__file__), arguments)


if __name__ == "__main__":
    raise SystemExit(main())
