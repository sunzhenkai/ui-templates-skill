from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from .capture import CaptureError, canonical_json, capture_from_files, load_document
from .chrome import CHROME_INCOMPLETE, COVERAGE_TAXONOMY_REPLACES_SHELL, chrome_complete_sidecar, page_modes_replace_shell
from .profile import facts_to_fidelity

REPORT_SCHEMA_VERSION = 1


def _file_digest(path: Path) -> str:
    if not path.is_file():
        return "missing"
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _command(path: Path, arguments: list[str]) -> list[str]:
    return ([sys.executable, str(path)] if path.suffix.lower() == ".py" else [str(path)]) + arguments


def _run_json(command: list[str], cwd: Path) -> tuple[int, dict[str, Any] | None, str]:
    try:
        completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 2, None, str(exc)
    try:
        payload = json.loads(completed.stdout)
    except (json.JSONDecodeError, TypeError):
        payload = None
    return completed.returncode, payload, completed.stderr.strip()


def _profile_summary(payload: dict[str, Any]) -> dict[str, Any] | None:
    candidates: list[Any] = [payload.get("authoring_profile"), payload.get("fidelity")]
    templates = payload.get("templates")
    if isinstance(templates, list):
        for template in templates:
            if isinstance(template, dict):
                candidates.extend([template.get("fidelity"), template.get("authoring_profile")])
                if {"profile", "conformance"}.issubset(template):
                    candidates.append(template)
    for candidate in candidates:
        if isinstance(candidate, dict) and {"profile", "conformance", "canonical_digest", "replay", "unresolved"}.issubset(candidate):
            return candidate
    return None


def _replay_passed(replay: Any) -> bool:
    if not isinstance(replay, dict) or replay.get("status") != "passed":
        return False
    counts = [replay.get(key) for key in ("declared", "resolved", "executed", "passed")]
    return all(isinstance(value, int) and not isinstance(value, bool) for value in counts) and counts[0] > 0 and len(set(counts)) == 1


def _eval_passed(payload: Any) -> bool:
    if not isinstance(payload, dict) or payload.get("status") != "passed":
        return False
    counts = payload.get("counts")
    if not isinstance(counts, dict):
        return False
    values = [counts.get(key) for key in ("declared", "parsed", "executed")]
    return all(isinstance(value, int) and not isinstance(value, bool) for value in values) and values[0] > 0 and len(set(values)) == 1


def _atomic_copy(source: Path, destination: Path) -> None:
    data = source.read_bytes()
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{destination.name}.", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def run_authoring_gate(
    *, request_path: Path, source_root: Path, candidate_template: Path, candidate_index: Path,
    production_index: Path, validator: Path, eval_runner: Path, receipt_out: Path,
    promote_index: bool = False, cwd: Path | None = None,
) -> dict[str, Any]:
    """Session-source staging gate only.

    ``source_root`` must be the checkout the user gave for *this* Generate-from-source.
    Do not call this function for published-template portable validation, and never
    invent a root from ``meta.sources[]``, sibling checkouts, or ``/tmp``.
    """
    cwd = (cwd or Path.cwd()).resolve()
    guarded_paths = (request_path, source_root, candidate_template, candidate_index, production_index, receipt_out)
    if any("example" in path.absolute().parts for path in guarded_paths):
        before = _file_digest(production_index)
        return {
            "report_schema_version": REPORT_SCHEMA_VERSION, "status": "failed",
            "gate": {"capture": "failed", "reproducibility": "failed", "validation": "failed", "eval": "failed"},
            "capture": None, "profile": None, "replay": {"status": "not-run"}, "eval": None,
            "production_index": {"before_digest": before, "after_digest": before, "unchanged_during_gate": True, "promoted": False},
            "degradation": None, "issues": [{"code": "EXCLUDED_EXAMPLE_PATH"}],
        }
    before = _file_digest(production_index)
    issues: list[dict[str, Any]] = []
    capture_receipt: dict[str, Any] | None = None
    validator_payload: dict[str, Any] | None = None
    eval_payload: dict[str, Any] | None = None
    profile: dict[str, Any] | None = None
    capture_status = "failed"
    reproducibility = "failed"
    try:
        first = capture_from_files(request_path, source_root)
        second = capture_from_files(request_path, source_root)
        capture_receipt = first
        capture_status = first.get("status", "failed")
        reproducibility = "passed" if canonical_json(first) == canonical_json(second) else "failed"
        if capture_status not in {"captured", "style-only"}:
            issues.append({"code": "CAPTURE_UNRESOLVED", "details": first.get("unresolved", [])})
        if reproducibility != "passed":
            issues.append({"code": "CAPTURE_NOT_REPRODUCIBLE"})
        if capture_status == "captured":
            generated = facts_to_fidelity(first)
            if "shell" in (first.get("request") or {}).get("scope", {}).get("scenes", []) and not chrome_complete_sidecar(generated):
                issues.append({"code": CHROME_INCOMPLETE})
            meta_path = candidate_template / "meta.yaml"
            if meta_path.is_file():
                meta = load_document(meta_path)
                declared = ((meta.get("coverage") or {}).get("page_modes") or {}).get("declared") if isinstance(meta, dict) else None
                if page_modes_replace_shell(declared) and not (candidate_template / "fidelity.yaml").is_file():
                    issues.append({"code": COVERAGE_TAXONOMY_REPLACES_SHELL})
        if capture_status == "style-only" and not (first.get("style_only_reason") or "").strip():
            issues.append({"code": "STYLE_ONLY_REASON_REQUIRED"})
    except CaptureError as exc:
        issues.append({"code": exc.code, "message": str(exc), "details": exc.details})
    if not issues and capture_receipt is not None:
        receipt_out.parent.mkdir(parents=True, exist_ok=True)
        receipt_out.write_text(json.dumps(capture_receipt, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        source_id = capture_receipt["request"]["source_id"]
        validator_arguments = [
            str(candidate_template), "--index", str(candidate_index), "--json",
            "--source-root", f"{source_id}={source_root.resolve()}",
        ]
        if capture_receipt["request"]["conformance"] == "structural":
            validator_arguments.append("--require-source-replay")
        validator_command = _command(validator, validator_arguments)
        returncode, validator_payload, stderr = _run_json(validator_command, cwd)
        if returncode != 0 or not isinstance(validator_payload, dict) or validator_payload.get("exit_code") != 0:
            issues.append({"code": "VALIDATOR_FAILED", "returncode": returncode, "stderr": stderr})
        else:
            profile = _profile_summary(validator_payload)
            if profile is None:
                issues.append({"code": "VALIDATOR_PROFILE_REPORT_MISSING"})
            elif profile.get("conformance") != capture_receipt["request"]["conformance"]:
                issues.append({"code": "CONFORMANCE_MISMATCH"})
            elif profile.get("conformance") == "structural" and not _replay_passed(profile.get("replay")):
                issues.append({"code": "STRUCTURAL_REPLAY_REQUIRED"})
            elif profile.get("conformance") == "structural" and profile.get("unresolved"):
                issues.append({"code": "STRUCTURAL_UNRESOLVED"})
    if not issues:
        eval_command = _command(eval_runner, ["--skill", "ui-template-author"])
        returncode, eval_payload, stderr = _run_json(eval_command, cwd)
        if returncode != 0 or not _eval_passed(eval_payload):
            issues.append({"code": "EVAL_FAILED", "returncode": returncode, "stderr": stderr})
    unchanged_before_promotion = _file_digest(production_index) == before
    if not unchanged_before_promotion:
        issues.append({"code": "PRODUCTION_INDEX_CHANGED_DURING_GATE"})
    promoted = False
    if not issues and promote_index:
        try:
            _atomic_copy(candidate_index, production_index)
            promoted = True
        except OSError as exc:
            issues.append({"code": "INDEX_PROMOTION_FAILED", "message": str(exc)})
    after = _file_digest(production_index)
    status = "passed" if not issues else "failed"
    replay = profile.get("replay") if isinstance(profile, dict) else {"status": "not-run"}
    report = {
        "report_schema_version": REPORT_SCHEMA_VERSION,
        "status": status,
        "gate": {
            "capture": capture_status, "reproducibility": reproducibility,
            "validation": "passed" if isinstance(validator_payload, dict) and validator_payload.get("exit_code") == 0 and not any(item["code"].startswith("VALIDATOR") or item["code"].startswith("STRUCTURAL") or item["code"] == "CONFORMANCE_MISMATCH" for item in issues) else "failed",
            "eval": "passed" if _eval_passed(eval_payload) else "failed",
        },
        "capture": None if capture_receipt is None else {
            "profile": capture_receipt["capture_profile"], "closure_digest": capture_receipt["closure_digest"],
            "source_revision": capture_receipt["source"]["revision"], "source_graph_digest": capture_receipt["source"]["graph_digest"],
            "scope": capture_receipt["request"]["scope"], "summary": capture_receipt["summary"],
            "unresolved": capture_receipt["unresolved"],
        },
        "profile": None if profile is None else {
            "schema_version": profile.get("schema_version"), "profile": profile.get("profile"),
            "conformance": profile.get("conformance"), "scope": profile.get("scope"),
            "canonical_digest": profile.get("canonical_digest"), "unresolved": profile.get("unresolved"),
        },
        "replay": replay,
        "eval": None if eval_payload is None else {
            "runner_version": eval_payload.get("runner_version"), "revision": eval_payload.get("revision"),
            "runtime_fingerprint": eval_payload.get("runtime_fingerprint"), "counts": eval_payload.get("counts"),
            "status": eval_payload.get("status"),
        },
        "production_index": {
            "before_digest": before, "after_digest": after, "unchanged_during_gate": unchanged_before_promotion,
            "promoted": promoted,
        },
        "degradation": (
            "style-only: structural layout/geometry/state fidelity is not provided; chrome composition is not provided"
            if isinstance(profile, dict) and profile.get("conformance") == "style-only" else None
        ),
        "issues": sorted(issues, key=canonical_json),
    }
    return report
