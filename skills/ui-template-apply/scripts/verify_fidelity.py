#!/usr/bin/env python3
"""Pixel fidelity check: does the project render the kit exactly like the pristine template with its own theme?

  verify_fidelity.py --project DIR [--reuse-baseline]

1. Baseline app in DIR/.ui-kit/baseline-app: starter/ + the project's package.json and lockfile
   (package-lock.json or pnpm-lock.yaml) + pristine kit files for the locked package and items
   + the project's theme.css and fonts.css.
2. Baseline app: build Storybook, render every ui-kit story tagged "fidelity" (light and dark) into DIR/.ui-kit/baseline.
3. Project: build Storybook, render the same stories, compare with zero pixel tolerance.

Exit 0 when every story matches. Diffs land in DIR/test-results. Needs node/npm and a Playwright Chromium.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
STARTER = SKILL / "starter"
INSTALL = SKILL / "scripts/install_registry.py"
CARRIED = ("package.json", "src/styles/theme.css", "src/styles/fonts.css")


def package_manager(project: Path) -> str:
    """pnpm projects are first-class: pick the layout from the lockfile that exists."""
    if (project / "pnpm-lock.yaml").is_file():
        return "pnpm"
    if (project / "package-lock.json").is_file():
        return "npm"
    raise SystemExit("no lockfile (package-lock.json or pnpm-lock.yaml); install dependencies in the project first")


def package_run(manager: str, script: str) -> list[str]:
    return ["pnpm", "run", script] if manager == "pnpm" else ["npm", "run", script]


def package_exec(manager: str, binary: str) -> list[str]:
    return ["pnpm", "exec", binary] if manager == "pnpm" else ["npx", binary]


def run(cmd: list[str], cwd: Path, env: dict[str, str]) -> None:
    print(f"$ ({cwd.name}) {' '.join(cmd)}", flush=True)
    result = subprocess.run(cmd, cwd=cwd, env=env)
    if result.returncode != 0:
        raise SystemExit(f"failed ({result.returncode}): {' '.join(cmd)}")


def prepare_baseline_app(project: Path, lock: dict, env: dict[str, str]) -> Path:
    app = project / ".ui-kit/baseline-app"
    app.mkdir(parents=True, exist_ok=True)
    for child in app.iterdir():
        if child.name != "node_modules":
            shutil.rmtree(child) if child.is_dir() else child.unlink()
    shutil.copytree(STARTER, app, dirs_exist_ok=True)
    run([sys.executable, str(INSTALL), "--project", str(app), "--package", lock["package"], "--items", ",".join(lock["items"])], app, env)
    manager = package_manager(project)
    carried = CARRIED + (("pnpm-lock.yaml",) if manager == "pnpm" else ("package-lock.json",))
    for name in carried:
        if (project / name).is_file():
            (app / name).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(project / name, app / name)
    stamp = app / "node_modules/.ui-kit-lock"
    lockfile = app / ("pnpm-lock.yaml" if manager == "pnpm" else "package-lock.json")
    digest = hashlib.sha256(lockfile.read_bytes()).hexdigest()
    if not stamp.is_file() or stamp.read_text() != digest:
        if manager == "pnpm":
            run(["pnpm", "install", "--frozen-lockfile", "--config.minimumReleaseAge=0"], app, env)
        else:
            run(["npm", "ci", "--no-audit", "--no-fund"], app, env)
        stamp.write_text(digest)
    return app


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--reuse-baseline", action="store_true", help="skip step 1-2 and compare against the existing baseline")
    args = parser.parse_args(argv)
    project = args.project.resolve()
    lock_path = project / "ui-template.lock.json"
    if not lock_path.is_file():
        parser.error("ui-template.lock.json missing; install the kit first")
    manager = package_manager(project)
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    meta = (SKILL / "catalog" / lock["package"] / "meta.yaml").read_text(encoding="utf-8")
    if f"version: {lock['version']}" not in meta.splitlines():
        parser.error(f"lock pins {lock['package']} {lock['version']} but the template has another version; run install_registry.py --upgrade")
    baseline = project / ".ui-kit/baseline"
    env = {**os.environ, "UI_KIT_BASELINE": str(baseline)}
    if not args.reuse_baseline:
        app = prepare_baseline_app(project, lock, env)
        shutil.rmtree(baseline, ignore_errors=True)
        run(package_run(manager, "build-storybook"), app, env)
        run([*package_exec(manager, "playwright"), "test", "-c", "playwright.fidelity.config.ts", "--update-snapshots"], app, env)
    run(package_run(manager, "build-storybook"), project, env)
    result = subprocess.run([*package_exec(manager, "playwright"), "test", "-c", "playwright.fidelity.config.ts"], cwd=project, env=env)
    print("fidelity: " + ("pass" if result.returncode == 0 else "FAIL (diff images under test-results/)"))
    return 0 if result.returncode == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
