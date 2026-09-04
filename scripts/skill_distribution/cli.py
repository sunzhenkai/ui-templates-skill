from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .builder import build_bundle
from .config import DistributionError
from .installer import install_bundle
from .mirror import check_mirror, write_mirror


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="双 public skill 分发治理")
    result.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    sub = result.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build")
    build.add_argument("--output-dir", type=Path)
    install = sub.add_parser("install")
    install.add_argument("artifact", type=Path)
    install.add_argument("--checksum", type=Path)
    install.add_argument("--target", type=Path, required=True, help="目标 skills 父目录，例如 .agents/skills")
    mirror = sub.add_parser("mirror")
    mode = mirror.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    mirror.add_argument("--target", type=Path, default=Path(".agents/skills"))
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    root = args.repo_root.resolve()
    try:
        if args.command == "build":
            built = build_bundle(root, args.output_dir)
            payload = {
                "artifact": str(built.artifact),
                "checksum_file": str(built.checksum_file),
                "checksum": built.checksum,
                "bundle_version": built.manifest["bundle_version"],
                "files": len(built.manifest["files"]),
            }
        elif args.command == "install":
            payload = install_bundle(args.artifact, args.target, checksum_file=args.checksum)
        elif args.write:
            payload = write_mirror(root, (root / args.target) if not args.target.is_absolute() else args.target)
        else:
            target = (root / args.target) if not args.target.is_absolute() else args.target
            findings = check_mirror(root, target)
            payload = {"status": "failed" if findings else "passed", "findings": findings, "target": str(target)}
            print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
            return 1 if findings else 0
    except (DistributionError, OSError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps({"status": "passed", **payload}, ensure_ascii=False, sort_keys=True, indent=2))
    return 0
