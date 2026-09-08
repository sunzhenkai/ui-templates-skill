"""Fail-closed discovery for the shared design-system validator.

This module is not the validator. Public skill wrappers import it and refuse to
exec any target whose DESIGN_SYSTEM_VALIDATOR_ROLE is not "implementation".
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ENV_VAR = "UI_DESIGN_SYSTEM_VALIDATOR"
ROLE_IMPLEMENTATION = "implementation"
ROLE_PATTERN = re.compile(r'^DESIGN_SYSTEM_VALIDATOR_ROLE\s*=\s*["\'](\w+)["\']', re.MULTILINE)
SELF_INVOCATION = "VALIDATOR_SELF_INVOCATION"
MISSING = "DESIGN_SYSTEM_VALIDATOR_MISSING"
ENV_MISSING = "UI_DESIGN_SYSTEM_VALIDATOR_MISSING"


def read_role(path: Path) -> str | None:
    try:
        text = path.read_text(encoding="utf-8")[:8192]
    except OSError:
        return None
    match = ROLE_PATTERN.search(text)
    return match.group(1) if match else None


def same_file(left: Path, right: Path) -> bool:
    if left.resolve() == right.resolve():
        return True
    try:
        return os.path.samefile(left, right)
    except OSError:
        return False


def assert_implementation(wrapper: Path, target: Path) -> Path:
    resolved = target.expanduser().resolve()
    if not resolved.is_file():
        raise SystemExit(f"{ENV_MISSING}: {resolved}")
    if same_file(wrapper, resolved):
        raise SystemExit(f"{SELF_INVOCATION}: refusing to exec discovery wrapper {resolved}")
    if read_role(resolved) != ROLE_IMPLEMENTATION:
        raise SystemExit(f"{SELF_INVOCATION}: {resolved} is not a shared design-system implementation")
    return resolved


def resolve_validator(wrapper: Path) -> Path:
    wrapper_path = wrapper.resolve()
    explicit = os.environ.get(ENV_VAR)
    if explicit:
        candidate = Path(explicit).expanduser().resolve()
        if not candidate.is_file():
            raise SystemExit(f"{ENV_MISSING}: {candidate}")
        return assert_implementation(wrapper_path, candidate)
    shared = wrapper_path.parent / "shared_validate_design_system.py"
    if shared.is_file():
        return assert_implementation(wrapper_path, shared)
    if len(wrapper_path.parents) >= 4:
        repo = wrapper_path.parents[3]
        script = repo / "scripts/validate_design_system.py"
        schemas = repo / "schemas/design-system/v1"
        if script.is_file() and schemas.is_dir():
            return assert_implementation(wrapper_path, script)
    raise SystemExit(f"{MISSING}: shared validator is not installed")


def run_validator(wrapper: Path, arguments: list[str]) -> int:
    target = resolve_validator(wrapper)
    env = os.environ.copy()
    env[ENV_VAR] = str(target)
    return subprocess.run([sys.executable, str(target), *arguments], check=False, env=env).returncode
