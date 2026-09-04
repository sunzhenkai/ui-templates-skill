#!/usr/bin/env python3
"""执行 root governance gate；不读取或执行被 scope 排除的样例内容。"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED_SAMPLE_PATHS = (
    "example/workbench-shell/web-v2/**",
    "example/workbench-shell/web-v3/**",
)


class ValidationFailure(RuntimeError):
    pass


def run(
    command: list[str],
    *,
    cwd: Path,
    stdout_path: Path | None = None,
    label: str,
) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)
    if stdout_path is not None:
        stdout_path.parent.mkdir(parents=True, exist_ok=True)
        stdout_path.write_text(proc.stdout, encoding="utf-8")
    if proc.returncode != 0:
        raise ValidationFailure(
            f"{label} failed ({proc.returncode})\nstdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
        )
    if proc.stdout:
        print(proc.stdout, end="" if proc.stdout.endswith("\n") else "\n")
    if proc.stderr:
        print(proc.stderr, file=sys.stderr, end="" if proc.stderr.endswith("\n") else "\n")
    return proc


def artifact_from_build(stdout: str) -> Path:
    try:
        payload = json.loads(stdout)
        return Path(payload["artifact"])
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise ValidationFailure(f"bundle build returned invalid JSON: {exc}") from exc


def extract_manifest(artifact: Path, output: Path) -> None:
    with tarfile.open(artifact, "r:gz") as archive:
        member = archive.getmember("skills-manifest.yaml")
        stream = archive.extractfile(member)
        if stream is None:
            raise ValidationFailure("bundle manifest is unreadable")
        output.write_bytes(stream.read())


def validate(root: Path, report_dir: Path) -> dict:
    report_dir.mkdir(parents=True, exist_ok=True)
    python = sys.executable
    exclusion_report = {
        "schema_version": 1,
        "status": "excluded",
        "paths": [
            {"pattern": value, "content_read": False, "commands_executed": False, "modified": False}
            for value in EXCLUDED_SAMPLE_PATHS
        ],
        "sample_commands_executed": False,
    }
    (report_dir / "exclusions.json").write_text(
        json.dumps(exclusion_report, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    for value in EXCLUDED_SAMPLE_PATHS:
        print(f"governance exclusion (content not read/executed): {value}")

    run([python, "scripts/check_governance_scope.py", "--guard-web-v2"], cwd=root, label="scope guard")
    run(
        [python, "scripts/check_active_release.py", "--json-out", str(report_dir / "active-release.json")],
        cwd=root, label="active/release checker",
    )
    run(
        [python, "scripts/validate_templates.py", "templates", "--json"],
        cwd=root, stdout_path=report_dir / "template-validation.json", label="template validator",
    )
    tests = run(
        [python, "-m", "unittest", "discover", "-s", "tests", "-v"],
        cwd=root, label="unit tests",
    )
    (report_dir / "unittest.txt").write_text(tests.stdout + tests.stderr, encoding="utf-8")
    try:
        report_relative = report_dir.resolve().relative_to(root).as_posix()
    except ValueError as exc:
        raise ValidationFailure(f"report directory must stay inside repository: {report_dir}") from exc
    run(
        [python, "scripts/run_contract_evals.py", "--json-out", f"{report_relative}/eval.json", "--junit-out", f"{report_relative}/eval.xml"],
        cwd=root, label="contract eval",
    )
    run(["openspec", "validate", "--all", "--strict"], cwd=root, label="OpenSpec strict")

    with tempfile.TemporaryDirectory(prefix="ui-template-governance-") as temporary:
        temp = Path(temporary)
        first = run(
            [python, "scripts/manage_skill_distribution.py", "build", "--output-dir", str(temp / "bundle-a")],
            cwd=root, label="bundle build A",
        )
        second = run(
            [python, "scripts/manage_skill_distribution.py", "build", "--output-dir", str(temp / "bundle-b")],
            cwd=root, label="bundle build B",
        )
        artifact_a = artifact_from_build(first.stdout)
        artifact_b = artifact_from_build(second.stdout)
        if artifact_a.read_bytes() != artifact_b.read_bytes():
            raise ValidationFailure("reproducible bundle mismatch")
        shutil.copy2(artifact_a, report_dir / artifact_a.name)
        shutil.copy2(artifact_a.with_name(artifact_a.name + ".sha256"), report_dir / (artifact_a.name + ".sha256"))
        extract_manifest(artifact_a, report_dir / "skills-manifest.yaml")
        run(
            [python, "scripts/manage_skill_distribution.py", "install", str(artifact_a), "--target", str(temp / "project/.agents/skills")],
            cwd=root, label="bundle install smoke",
        )

    run(
        [python, "scripts/manage_skill_distribution.py", "mirror", "--check", "--target", ".agents/skills"],
        cwd=root, label="production mirror",
    )
    summary = {
        "schema_version": 1,
        "status": "passed",
        "reports": sorted(path.name for path in report_dir.iterdir() if path.is_file()),
        "exclusions": list(EXCLUDED_SAMPLE_PATHS),
        "sample_commands_executed": False,
    }
    (report_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--report-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    root = args.root.resolve()
    report_dir = args.report_dir if args.report_dir.is_absolute() else root / args.report_dir
    try:
        summary = validate(root, report_dir)
    except (ValidationFailure, OSError, tarfile.TarError) as exc:
        print(f"governance validation failed: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
