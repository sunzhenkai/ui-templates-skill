#!/usr/bin/env python3
"""校验 Template Apply 状态或计算 canonical digest。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from template_apply_state import (
    ApplyStateError,
    build_identity,
    canonical_digest,
    load_structured,
    merge_feedback,
    recovery_decision,
    source_identity,
    validate_checkpoint,
    validate_feedback_inbox,
    validate_verification,
)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    sub = result.add_subparsers(dest="command", required=True)
    digest = sub.add_parser("digest")
    digest.add_argument("path", type=Path)
    source = sub.add_parser("source-identity")
    source.add_argument("root", type=Path)
    build = sub.add_parser("build-identity")
    build.add_argument("artifact", type=Path)
    build.add_argument("--command", dest="build_command", required=True)
    feedback = sub.add_parser("feedback")
    feedback.add_argument("directory", type=Path)
    feedback.add_argument("--apply-root", type=Path, required=True)
    feedback.add_argument("--known-rule-id", action="append", default=None)
    feedback_merge = sub.add_parser("feedback-merge")
    feedback_merge.add_argument("directory", type=Path)
    feedback_merge.add_argument("candidate", type=Path)
    feedback_merge.add_argument("--apply-root", type=Path, required=True)
    feedback_merge.add_argument("--known-rule-id", action="append", default=None)
    verification = sub.add_parser("verification")
    verification.add_argument("path", type=Path)
    verification.add_argument("--apply-root", type=Path, required=True)
    verification.add_argument("--kind", choices=["phase-8-verification", "phase-9-review"], required=True)
    verification.add_argument("--known-rule-id", action="append", default=None)
    checkpoint = sub.add_parser("checkpoint")
    checkpoint.add_argument("--apply-root", type=Path, required=True)
    checkpoint.add_argument("--template", type=Path, required=True)
    checkpoint.add_argument("--tokens", type=Path, required=True)
    checkpoint.add_argument("--scope", type=Path, required=True)
    checkpoint.add_argument("--source-identity", required=True)
    checkpoint.add_argument("--build-identity", required=True)
    checkpoint.add_argument("--known-rule-id", action="append", default=None)
    return result


def main() -> int:
    args = parser().parse_args()
    if args.command == "digest":
        print(json.dumps(canonical_digest(load_structured(args.path)), ensure_ascii=False, sort_keys=True))
        return 0
    if args.command == "source-identity":
        print(source_identity(args.root))
        return 0
    if args.command == "build-identity":
        print(build_identity(args.build_command, args.artifact))
        return 0
    known_rule_ids = set(args.known_rule_id) if getattr(args, "known_rule_id", None) is not None else None
    if args.command == "feedback":
        findings = validate_feedback_inbox(
            args.directory,
            apply_root=args.apply_root,
            known_rule_ids=known_rule_ids,
        )
        payload = {"valid": not findings, "findings": [item.to_dict() for item in findings]}
    elif args.command == "feedback-merge":
        try:
            path, data, merged = merge_feedback(
                args.directory,
                load_structured(args.candidate),
                apply_root=args.apply_root,
                known_rule_ids=known_rule_ids,
            )
            payload = {"valid": True, "path": str(path), "merged": merged, "feedback": data}
        except ApplyStateError as exc:
            payload = {"valid": False, "error": str(exc)}
    elif args.command == "verification":
        data = load_structured(args.path)
        findings = validate_verification(
            data,
            path=str(args.path),
            apply_root=args.apply_root,
            expected_kind=args.kind,
            known_rule_ids=known_rule_ids,
        )
        payload = {"valid": not findings, "findings": [item.to_dict() for item in findings]}
    else:
        checkpoint_path = args.apply_root / "checkpoint.yaml"
        checkpoint = load_structured(checkpoint_path)
        scope_doc = load_structured(args.scope)
        scope = scope_doc.get("scope", scope_doc) if isinstance(scope_doc, dict) else scope_doc
        findings = validate_checkpoint(
            checkpoint,
            apply_root=args.apply_root,
            template_value=load_structured(args.template),
            tokens_value=load_structured(args.tokens),
            scope=scope,
            source_identity=args.source_identity,
            build_identity=args.build_identity,
            known_rule_ids=known_rule_ids,
        )
        payload = recovery_decision(findings, checkpoint)
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if payload["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
