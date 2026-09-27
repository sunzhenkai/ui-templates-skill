#!/usr/bin/env python3
"""Oracle capture harness for the Template Certification Gate.

The gate needs oracle-side evidence that is a real artifact, not a placeholder.
This harness pins a deployment descriptor (fixed git revision, fixed install and
serve commands, fixed capture matrix), verifies the checkout matches the revision,
serves the oracle, drives a real browser and writes screenshots plus computed-style
measurements into the certification evidence layout.

It never fabricates evidence: if the oracle cannot be served or captured, the run
fails and the gate stays at `self-consistency`.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import yaml

REVISION_RE = re.compile(r"^[0-9a-f]{40}$")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class OracleError(SystemExit):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code


def load_descriptor(path: Path) -> dict[str, Any]:
    try:
        document = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise OracleError("ORACLE_DESCRIPTOR_UNREADABLE", str(exc)) from exc
    if not isinstance(document, dict):
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "descriptor must be a mapping")
    if document.get("schema") != "oracle-deployment/v1":
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "descriptor schema must be oracle-deployment/v1")
    oracle = document.get("oracle")
    if not isinstance(oracle, dict):
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "oracle block is required")
    revision = oracle.get("revision")
    if not isinstance(revision, str) or not REVISION_RE.match(revision):
        raise OracleError("ORACLE_REVISION_REQUIRED", "oracle.revision must be a full lowercase git commit")
    if oracle.get("kind") != "git-revision":
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "oracle.kind must be git-revision")
    deployment = document.get("deployment")
    if not isinstance(deployment, dict) or not deployment.get("serve"):
        raise OracleError("ORACLE_DEPLOYMENT_REQUIRED", "deployment.serve is required")
    if not deployment.get("ready_url"):
        raise OracleError("ORACLE_DEPLOYMENT_REQUIRED", "deployment.ready_url is required")
    capture = document.get("capture")
    if not isinstance(capture, dict):
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "capture block is required")
    if not capture.get("routes") or not capture.get("viewports") or not capture.get("themes"):
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "capture.routes, capture.viewports and capture.themes are required")
    return document


def git_head(checkout: Path) -> str:
    process = subprocess.run(
        ["git", "-C", str(checkout), "rev-parse", "HEAD"],
        text=True, capture_output=True, check=False,
    )
    if process.returncode != 0:
        raise OracleError("ORACLE_CHECKOUT_INVALID", f"{checkout} is not a readable git checkout")
    return process.stdout.strip()


def require_checkout(descriptor: dict[str, Any], checkout: Path | None) -> Path:
    declared = descriptor["oracle"].get("checkout")
    candidate = checkout or (Path(declared) if isinstance(declared, str) and declared else None)
    if candidate is None:
        raise OracleError(
            "ORACLE_CHECKOUT_REQUIRED",
            "pass --checkout or declare oracle.checkout; the harness never guesses a source path",
        )
    root = candidate.expanduser().resolve()
    if not root.is_dir():
        raise OracleError("ORACLE_CHECKOUT_INVALID", f"{root} is not a directory")
    actual = git_head(root)
    expected = descriptor["oracle"]["revision"]
    if actual != expected:
        raise OracleError(
            "ORACLE_REVISION_MISMATCH",
            f"checkout HEAD {actual} does not match declared revision {expected}",
        )
    return root


def _run_install(commands: Any, cwd: Path) -> None:
    if commands is None:
        return
    if isinstance(commands, str):
        commands = [commands]
    if not isinstance(commands, list):
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", "deployment.install must be a string or list")
    for command in commands:
        if not isinstance(command, str) or not command.strip():
            raise OracleError("ORACLE_DESCRIPTOR_INVALID", "install commands must be non-empty strings")
        process = subprocess.run(command, cwd=str(cwd), shell=True, text=True, capture_output=True, check=False)
        if process.returncode != 0:
            raise OracleError(
                "ORACLE_INSTALL_FAILED",
                f"install command failed ({process.returncode}): {command}\n{process.stderr[-2000:]}",
            )


def _wait_ready(url: str, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    last_error = ""
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status < 500:
                    return
                last_error = f"HTTP {response.status}"
        except (urllib.error.URLError, OSError, ValueError) as exc:
            last_error = str(exc)
        time.sleep(1.0)
    raise OracleError("ORACLE_NOT_READY", f"{url} did not become ready within {timeout:.0f}s ({last_error})")


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def capture(descriptor_path: Path, output_root: Path, build_identity: str, checkout: Path | None) -> dict[str, Any]:
    descriptor = load_descriptor(descriptor_path)
    root = require_checkout(descriptor, checkout)
    deployment = descriptor["deployment"]
    cwd = (root / str(deployment.get("cwd", "."))).resolve()
    if not cwd.is_dir():
        raise OracleError("ORACLE_DEPLOYMENT_REQUIRED", f"deployment.cwd does not exist: {cwd}")

    output_root.mkdir(parents=True, exist_ok=True)
    evidence_dir = output_root / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    _run_install(deployment.get("install"), cwd)
    env = {**os.environ, **{str(k): str(v) for k, v in (deployment.get("env") or {}).items()}}
    serve = subprocess.Popen(  # noqa: S602 - descriptor is a reviewed governance input
        deployment["serve"], cwd=str(cwd), shell=True, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True, env=env,
    )
    try:
        _wait_ready(str(deployment["ready_url"]), float(deployment.get("ready_timeout_seconds", 300)))
        return _capture_matrix(descriptor, output_root, evidence_dir, build_identity)
    finally:
        try:
            os.killpg(os.getpgid(serve.pid), signal.SIGTERM)
            serve.wait(timeout=15)
        except (ProcessLookupError, PermissionError, subprocess.TimeoutExpired):
            try:
                os.killpg(os.getpgid(serve.pid), signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass


def _capture_matrix(
    descriptor: dict[str, Any], output_root: Path, evidence_dir: Path, build_identity: str,
) -> dict[str, Any]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise OracleError("ORACLE_BROWSER_MISSING", f"playwright is required: {exc}") from exc

    capture = descriptor["capture"]
    base = str(descriptor["deployment"]["ready_url"]).rstrip("/")
    routes = {str(item["id"]): item for item in capture["routes"]}
    viewports = {str(item["id"]): item for item in capture["viewports"]}
    themes = [str(item) for item in capture["themes"]]
    measurements = capture.get("measurements") or []
    for item in list(routes.values()) + list(viewports.values()):
        if not SLUG_RE.match(str(item.get("id", ""))):
            raise OracleError("ORACLE_DESCRIPTOR_INVALID", f"capture ids must be kebab-case: {item.get('id')!r}")

    screenshots: list[dict[str, Any]] = []
    observed: list[dict[str, Any]] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            for route in routes.values():
                for viewport in viewports.values():
                    for theme in themes:
                        page = browser.new_page(
                            viewport={"width": int(viewport["width"]), "height": int(viewport["height"])},
                            color_scheme=theme,
                        )
                        url = f"{base}{route.get('path', '/')}"
                        page.goto(url, wait_until="load", timeout=60_000)
                        page.wait_for_timeout(int(capture.get("settle_ms", 750)))
                        name = f"oracle-{route['id']}-{viewport['id']}-{theme}.png"
                        target = evidence_dir / name
                        page.screenshot(path=str(target), full_page=bool(capture.get("full_page", False)))
                        if not target.read_bytes().startswith(PNG_MAGIC):
                            raise OracleError("ORACLE_CAPTURE_FAILED", f"{target} is not a PNG artifact")
                        screenshots.append({
                            "route": route["id"], "viewport": viewport["id"], "theme": theme,
                            "path": f"evidence/{name}",
                            "sha256": __import__("hashlib").sha256(target.read_bytes()).hexdigest(),
                        })
                        for measurement in measurements:
                            if measurement.get("route") != route["id"] or measurement.get("viewport") != viewport["id"]:
                                continue
                            if str(measurement.get("theme")) != theme:
                                continue
                            observed.append(_measure(page, measurement))
                        page.close()
        finally:
            browser.close()

    missing = [item["id"] for item in measurements if item["id"] not in {entry["id"] for entry in observed}]
    if missing:
        raise OracleError("ORACLE_MEASUREMENT_MISSING", f"measurements were not captured: {missing}")

    payload = {
        "schema": "oracle-evidence/v1",
        "oracle": {"kind": "git-revision", "revision": descriptor["oracle"]["revision"]},
        "build_identity": build_identity,
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": base,
        "screenshots": screenshots,
        "measurements": observed,
    }
    (output_root / "oracle-evidence.json").write_text(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8",
    )
    return payload


def _measure(page: Any, measurement: dict[str, Any]) -> dict[str, Any]:
    selector = str(measurement.get("selector", ""))
    prop = str(measurement.get("property", ""))
    if not selector or not prop:
        raise OracleError("ORACLE_DESCRIPTOR_INVALID", f"measurement {measurement.get('id')!r} needs selector and property")
    value = page.evaluate(
        """([selector, property]) => {
            const node = document.querySelector(selector);
            if (!node) { return null; }
            const style = window.getComputedStyle(node);
            const box = node.getBoundingClientRect();
            return {computed: style[property] ?? null, box: {width: box.width, height: box.height, x: box.x, y: box.y}};
        }""",
        [selector, prop],
    )
    if value is None:
        raise OracleError("ORACLE_MEASUREMENT_MISSING", f"selector matched nothing: {selector}")
    return {
        "id": measurement["id"],
        "route": measurement["route"],
        "viewport": measurement["viewport"],
        "theme": measurement["theme"],
        "selector": selector,
        "property": prop,
        "dimension": measurement.get("dimension"),
        "unit": measurement.get("unit", "px"),
        "tolerance": measurement.get("tolerance"),
        "value": value["computed"],
        "box": value["box"],
        "oracle_revision": measurement.get("oracle_revision"),
    }


def cmd_capture(args: argparse.Namespace) -> int:
    payload = capture(args.descriptor.resolve(), args.output_root.resolve(), args.build_identity, args.checkout)
    print(json.dumps({
        "captured": True,
        "oracle_revision": payload["oracle"]["revision"],
        "screenshots": len(payload["screenshots"]),
        "measurements": len(payload["measurements"]),
        "evidence": str((args.output_root / "oracle-evidence.json").resolve()),
    }, ensure_ascii=False, indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Template Certification oracle capture harness")
    sub = parser.add_subparsers(dest="command", required=True)
    command = sub.add_parser("capture", help="serve the pinned oracle and capture screenshots/measurements")
    command.add_argument("--descriptor", type=Path, required=True)
    command.add_argument("--output-root", type=Path, required=True)
    command.add_argument("--build-identity", required=True)
    command.add_argument("--checkout", type=Path)
    command.set_defaults(func=cmd_capture)
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
