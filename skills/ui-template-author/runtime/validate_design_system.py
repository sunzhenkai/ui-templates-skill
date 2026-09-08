#!/usr/bin/env python3
"""Fail-closed discovery wrapper for the shared design-system validator."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def validator_path() -> Path:
    explicit = os.environ.get("UI_DESIGN_SYSTEM_VALIDATOR")
    if explicit:
        candidate = Path(explicit).expanduser().resolve()
        if not candidate.is_file():
            raise SystemExit(f"UI_DESIGN_SYSTEM_VALIDATOR_MISSING: {candidate}")
        return candidate
    here = Path(__file__).resolve()
    for candidate in (here.parents[3] / "scripts/validate_design_system.py", here.parent / "shared_validate_design_system.py"):
        if candidate.is_file():
            return candidate
    raise SystemExit("DESIGN_SYSTEM_VALIDATOR_MISSING: shared validator is not installed")


def main(argv: list[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if not arguments or arguments[0] not in {"validate", "compute-digest"}:
        raise SystemExit("USAGE_INVALID: expected validate|compute-digest")
    return subprocess.run([sys.executable, str(validator_path()), *arguments], check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
