#!/usr/bin/env python3
"""校验生产 templates/INDEX.md 与模板目录、meta.yaml 之间的闭环一致性。

template-lifecycle.md 把三条规则写成硬约束，但此前没有任何可执行实现：

1. 每一行必须有同名目录（retired 保留目录，delete 同时移除行与目录）；
2. 每个已发布模板目录必须有一行（draft 是未进 INDEX 的候选目录，不在此列）；
3. 前四列（名称/风格描述/来源类型/采集日期）必须与 meta.yaml 一致。

INDEX 是 Apply 解析 published 模板的唯一入口，因此这三条必须 fail closed：
不一致时下游会消费到过期或错配的身份信息，而 catalog 漂移检查看不到
（catalog 本身就是从 INDEX 生成的）。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml

from manage_template_index import STATUSES, parse_index

REQUIRED_COLUMNS = 4


def _load(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _row_facts(meta: dict[str, Any] | None) -> dict[str, str | None]:
    """Derive the INDEX first four columns from the package meta."""
    sources = meta.get("sources") if isinstance(meta, dict) else None
    first_source = sources[0] if isinstance(sources, list) and sources and isinstance(sources[0], dict) else {}
    return {
        "description": meta.get("description") if isinstance(meta, dict) else None,
        "source_type": first_source.get("type"),
        "captured_at": meta.get("captured_at") if isinstance(meta, dict) else None,
    }


def check_index(templates_root: Path) -> list[dict[str, Any]]:
    """Return findings for every violated lifecycle rule; empty list means consistent."""
    index_path = templates_root / "INDEX.md"
    findings: list[dict[str, Any]] = []
    if not index_path.is_file():
        return [{"code": "INDEX_MISSING", "detail": str(index_path)}]
    try:
        _, rows = parse_index(index_path)
    except SystemExit as exc:
        return [{"code": "INDEX_UNPARSABLE", "detail": str(exc)}]

    def add(code: str, name: str, detail: str, **extra: Any) -> None:
        findings.append({"code": code, "name": name, "detail": detail, **extra})

    # 规则 1：每一行必须有同名目录。
    for name, cells in sorted(rows.items()):
        directory = templates_root / name
        if not directory.is_dir():
            add("INDEX_ROW_WITHOUT_DIRECTORY", name, f"{directory} 不存在")

    # 规则 2：每个模板目录必须有一行。
    if templates_root.is_dir():
        for directory in sorted(item for item in templates_root.iterdir() if item.is_dir()):
            if directory.name not in rows:
                add("TEMPLATE_WITHOUT_INDEX_ROW", directory.name, f"{directory} 未登记进 INDEX")

    # 规则 3：前四列与 meta.yaml 一致 + 状态闭集。
    for name, cells in sorted(rows.items()):
        status = cells[4] if len(cells) > 4 else None
        if status not in STATUSES:
            add("INDEX_STATUS_INVALID", name, f"status={status!r} 不在 {sorted(STATUSES)}")
        meta_path = templates_root / name / "meta.yaml"
        if not meta_path.is_file():
            add("TEMPLATE_META_MISSING", name, f"{meta_path} 不存在")
            continue
        try:
            meta = _load(meta_path)
        except yaml.YAMLError as exc:
            add("TEMPLATE_META_UNREADABLE", name, str(exc))
            continue
        facts = _row_facts(meta if isinstance(meta, dict) else None)
        for index_position, (column, actual) in enumerate(
            (("风格描述", facts["description"]), ("来源类型", facts["source_type"]), ("采集日期", facts["captured_at"])),
            start=1,
        ):
            declared = cells[index_position] if len(cells) > index_position else None
            if actual is None:
                add("TEMPLATE_META_FIELD_MISSING", name, f"meta.yaml 缺少 {column} 对应字段")
                continue
            if str(declared) != str(actual):
                add(
                    "INDEX_COLUMN_MISMATCH",
                    name,
                    f"INDEX {column}={declared!r} 与 meta.yaml 实际 {actual!r} 不一致",
                    column=column,
                    declared=declared,
                    actual=actual,
                )
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="校验生产 templates/INDEX.md 闭环一致性")
    parser.add_argument("--templates", type=Path, default=Path("templates"), help="生产 templates 根目录")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    findings = check_index(args.templates)
    payload = {"valid": not findings, "findings": findings}
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
    else:
        if not findings:
            print("INDEX_CONSISTENT: templates/INDEX.md 与目录、meta.yaml 闭环一致")
        for item in findings:
            print(f"{item['code']}\t{item.get('name', '-')}\t{item['detail']}", file=__import__("sys").stderr)
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
