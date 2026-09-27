#!/usr/bin/env python3
"""校验 Template Apply 状态或计算 canonical digest。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml

from template_apply_state import (
    ApplyStateError,
    artifact_value,
    build_checkpoint,
    build_identity,
    canonical_digest,
    detect_architecture_site,
    load_structured,
    merge_feedback,
    recovery_decision,
    source_identity,
    validate_checkpoint,
    validate_feedback_inbox,
    validate_verification,
)
from template_apply_state.state import DIGEST_ALGORITHM


def collect_active_layers(active_instance: Path) -> dict[str, set[str]] | None:
    """Load declared Stable Entity IDs from an Active Instance for route binding."""
    core = active_instance / "core"
    layers: dict[str, set[str]] = {}
    for layer, filename in (
        ("layouts", "layout.yaml"),
        ("page_types", "page-types.yaml"),
        ("patterns", "patterns.yaml"),
        ("primitives", "primitives.yaml"),
        ("rules", "rules.yaml"),
    ):
        path = core / filename
        if not path.is_file():
            continue
        data = load_structured(path)
        items = data.get("items", []) if isinstance(data, dict) else []
        layers[layer] = {
            item.get("id") for item in items if isinstance(item, dict) and isinstance(item.get("id"), str)
        }
    return layers or None


def collect_placement_context(active_instance: Path) -> dict[str, Any]:
    """Load Active Instance placement identity maps for route closure validation."""
    core = active_instance / "core"
    layouts: dict[str, dict[str, Any]] = {}
    layout_path = core / "layout.yaml"
    if layout_path.is_file():
        items = load_structured(layout_path).get("items", [])
        for item in items:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                layouts[item["id"]] = item
    page_type_patterns: dict[str, list[str]] = {}
    page_types_path = core / "page-types.yaml"
    if page_types_path.is_file():
        items = load_structured(page_types_path).get("items", [])
        for item in items:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                page_type_patterns[item["id"]] = [
                    value for value in item.get("patterns", []) if isinstance(value, str)
                ]
    return {"layouts": layouts, "page_type_patterns": page_type_patterns}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    sub = result.add_subparsers(dest="command", required=True)
    digest = sub.add_parser("digest")
    digest.add_argument("path", type=Path)
    init = sub.add_parser(
        "checkpoint-init",
        help="生成一次通过 checkpoint 校验的 checkpoint.yaml（自动计算 template.digest/tokens_digest）",
    )
    init.add_argument("--apply-root", type=Path, required=True)
    init.add_argument("--template", type=Path, required=True, help="模板 meta 或含 meta 的 envelope")
    init.add_argument("--tokens", type=Path, required=True)
    init.add_argument("--scope", type=Path, required=True)
    init.add_argument("--fidelity", type=Path, help="模板/Active Instance 的 fidelity.yaml；缺省按 legacy-baseline")
    init.add_argument("--source-identity", required=True)
    init.add_argument("--build-identity", required=True)
    init.add_argument("--mode", choices=["bootstrap", "increment"], default="bootstrap")
    init.add_argument("--origin", choices=["catalog", "project"], help="缺省 catalog")
    init.add_argument("--resolved-path", help="缺省按 origin 推导 catalog|templates/<name>")
    init.add_argument("--output-root", help="相对消费项目根的输出根")
    init.add_argument("--contract-id")
    init.add_argument("--contract-version")
    init.add_argument("--contract-digest", help="contract digest 的 sha256 hex；落盘为 canonical {algorithm, value} 对象")
    init.add_argument("--binding-digest", help="binding digest 的 sha256 hex；落盘为 canonical {algorithm, value} 对象")
    init.add_argument("--change-set", action="append", help="可重复；记录本次 increment 的 change set")
    init.add_argument("--force", action="store_true", help="允许覆盖已存在的 checkpoint.yaml")
    source = sub.add_parser("source-identity")
    source.add_argument("root", type=Path)
    site = sub.add_parser("architecture-site", help="判定本次前端输出根，不是仓库根")
    site.add_argument("root", type=Path, help="将写入应用源码的输出根")
    site.add_argument("--explicit-greenfield", action="store_true")
    css = sub.add_parser("css-mechanism-scan", help="扫描输出根全局机制 CSS（未 trace 模板状态事实的发明）")
    css.add_argument("root", type=Path)
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
    checkpoint.add_argument("--fidelity", type=Path)
    checkpoint.add_argument("--previous-fidelity", type=Path)
    checkpoint.add_argument("--source-identity", required=True)
    checkpoint.add_argument("--build-identity", required=True)
    checkpoint.add_argument(
        "--active-instance",
        type=Path,
        help="Active Instance 根目录；提供时校验 Pattern-bound route composition",
    )
    checkpoint.add_argument("--known-rule-id", action="append", default=None)
    scenarios = sub.add_parser(
        "scenarios",
        help="枚举 fidelity profile + core/layout placement + measured expectations 派生的 Phase 8 必备 scenario IDs",
    )
    scenarios.add_argument("--fidelity", type=Path, help="模板/Active Instance 的 fidelity.yaml")
    scenarios.add_argument("--layout", type=Path, help="core/layout.yaml（placement geometry/pattern 闭包场景来源）")
    scenarios.add_argument("--expectations", type=Path, help="measured-expectations.yaml（期望比对场景来源）")
    lint = sub.add_parser(
        "artifact-lint",
        help="对单个 apply 产物做写时校验：YAML 可解析、无裸日期、digest 字段为 canonical 对象、可 canonical JSON 编码",
    )
    lint.add_argument("path", type=Path)
    return result


def run_checkpoint_init(args: argparse.Namespace) -> int:
    contract: dict[str, Any] | None = None
    if any([args.contract_id, args.contract_version, args.contract_digest]):
        if not all([args.contract_id, args.contract_version, args.contract_digest]):
            print(json.dumps({"valid": False, "error": "--contract-id/--contract-version/--contract-digest 必须同时提供"}, ensure_ascii=False))
            return 1
        contract = {
            "id": args.contract_id,
            "version": args.contract_version,
            "digest": {"algorithm": DIGEST_ALGORITHM, "value": args.contract_digest},
        }
    scope_doc = load_structured(args.scope)
    scope = scope_doc.get("scope", scope_doc) if isinstance(scope_doc, dict) else scope_doc
    try:
        checkpoint = build_checkpoint(
            template_value=load_structured(args.template),
            tokens_value=load_structured(args.tokens),
            scope=scope,
            source_identity=args.source_identity,
            build_identity=args.build_identity,
            mode=args.mode,
            fidelity_value=load_structured(args.fidelity) if args.fidelity else None,
            origin=args.origin,
            resolved_path=args.resolved_path,
            output_root=args.output_root,
            contract=contract,
            binding_digest={"algorithm": DIGEST_ALGORITHM, "value": args.binding_digest} if args.binding_digest else None,
            change_set=args.change_set,
        )
    except ApplyStateError as exc:
        print(json.dumps({"valid": False, "error": str(exc)}, ensure_ascii=False))
        return 1
    target = args.apply_root / "checkpoint.yaml"
    if target.exists() and not args.force:
        print(json.dumps({"valid": False, "error": f"{target} 已存在；确认覆盖请加 --force"}, ensure_ascii=False))
        return 1
    args.apply_root.mkdir(parents=True, exist_ok=True)
    target.write_text(yaml.safe_dump(checkpoint, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(json.dumps({"valid": True, "path": str(target), "checkpoint": checkpoint}, ensure_ascii=False, sort_keys=True))
    return 0


def main() -> int:
    args = parser().parse_args()
    if args.command == "digest":
        print(json.dumps(canonical_digest(artifact_value(args.path)), ensure_ascii=False, sort_keys=True))
        return 0
    if args.command == "checkpoint-init":
        return run_checkpoint_init(args)
    if args.command == "source-identity":
        print(source_identity(args.root))
        return 0
    if args.command == "css-mechanism-scan":
        from template_apply_state.state import scan_global_mechanism_css

        files = {
            str(path.relative_to(args.root)): path.read_text(encoding="utf-8")
            for path in sorted(args.root.rglob("*.css"))
            if ".ui-template" not in path.parts and "node_modules" not in path.parts
        }
        payload = {"findings": scan_global_mechanism_css(files), "scanned": sorted(files)}
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
        return 1 if payload["findings"] else 0
    if args.command == "architecture-site":
        print(detect_architecture_site(args.root, explicit_greenfield=args.explicit_greenfield))
        return 0
    if args.command == "build-identity":
        print(build_identity(args.build_command, args.artifact))
        return 0
    if args.command == "scenarios":
        from template_apply_state.fidelity import derive_scenario_ids

        profile = load_structured(args.fidelity) if args.fidelity else None
        layout = load_structured(args.layout) if args.layout else None
        expectations = load_structured(args.expectations) if args.expectations else None
        ids = derive_scenario_ids(profile, layout, expectations)
        payload = {
            "count": len(ids),
            "scenarios": ids,
            "inputs": {
                "fidelity": bool(args.fidelity),
                "layout": bool(args.layout),
                "expectations": bool(args.expectations),
            },
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    if args.command == "artifact-lint":
        import datetime as _dt

        findings: list[dict[str, object]] = []
        try:
            data: object = load_structured(args.path)
        except (ApplyStateError, OSError) as exc:
            print(json.dumps({"valid": False, "findings": [{"code": "ARTIFACT_UNPARSEABLE", "path": str(args.path), "message": str(exc)}]}, ensure_ascii=False, indent=2))
            return 1

        def walk(node: object, pointer: str) -> None:
            if isinstance(node, dict):
                for key, value in node.items():
                    child = f"{pointer}/{key}"
                    if isinstance(key, str) and key.endswith("digest"):
                        ok = (
                            isinstance(value, dict)
                            and set(value) == {"algorithm", "value"}
                            and all(isinstance(item, str) and item for item in value.values())
                        )
                        if not ok:
                            findings.append({
                                "code": "ARTIFACT_DIGEST_SHAPE_INVALID",
                                "path": child,
                                "message": "digest 字段必须是 {algorithm, value} canonical 对象（字符串值），不得是裸字符串或空",
                            })
                    walk(value, child)
            elif isinstance(node, list):
                for index, value in enumerate(node):
                    walk(value, f"{pointer}/{index}")
            elif isinstance(node, (_dt.datetime, _dt.date)):
                findings.append({
                    "code": "ARTIFACT_BARE_DATE",
                    "path": pointer,
                    "message": "时间戳必须写成带引号的字符串；裸日期无法 canonical JSON 编码",
                })

        walk(data, "")
        try:
            canonical_digest(data)
        except ApplyStateError as exc:
            findings.append({"code": "ARTIFACT_NOT_CANONICAL", "path": str(args.path), "message": str(exc)})
        payload = {"valid": not findings, "findings": findings}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0 if payload["valid"] else 1
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
            fidelity_value=load_structured(args.fidelity) if args.fidelity else None,
            previous_fidelity=load_structured(args.previous_fidelity) if args.previous_fidelity else None,
            active_layers=collect_active_layers(args.active_instance) if getattr(args, "active_instance", None) else None,
            placement_context=collect_placement_context(args.active_instance) if getattr(args, "active_instance", None) else None,
        )
        payload = recovery_decision(findings, checkpoint)
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
    if args.command == "checkpoint":
        return 0 if payload["checkpoint_valid"] else 1
    return 0 if payload["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
