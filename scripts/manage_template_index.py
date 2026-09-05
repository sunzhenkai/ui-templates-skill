#!/usr/bin/env python3
"""生产 templates/INDEX.md 的 list/show/retire/delete，以及 Apply Intake 的 published 检查。"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HEADER = ["名称", "风格描述", "来源类型", "采集日期", "状态"]
STATUSES = {"published", "retired"}


def parse_index(path: Path) -> tuple[list[str], dict[str, list[str]]]:
    if not path.is_file():
        raise SystemExit(f"INDEX_MISSING: {path}")
    lines = path.read_text(encoding="utf-8").splitlines()
    rows: dict[str, list[str]] = {}
    for line in lines:
        if not line.lstrip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 4 and cells[0] not in {"名称", "---"} and not set(cells[0]) <= {"-", ":"}:
            if len(cells) < 5:
                raise SystemExit(f"INDEX_STATUS_MISSING: {cells[0]}")
            if cells[4] not in STATUSES:
                raise SystemExit(f"INDEX_STATUS_INVALID: {cells[0]}={cells[4]}")
            rows[cells[0]] = cells[:5]
    return lines, rows


def render_index(rows: dict[str, list[str]]) -> str:
    body = [
        "# 模板索引",
        "",
        "| " + " | ".join(HEADER) + " |",
        "| " + " | ".join("---" for _ in HEADER) + " |",
    ]
    for name in sorted(rows):
        body.append("| " + " | ".join(rows[name][:5]) + " |")
    return "\n".join(body) + "\n"


def write_index(path: Path, rows: dict[str, list[str]]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(render_index(rows), encoding="utf-8")
    tmp.replace(path)


def require_published(index: Path, name: str) -> dict[str, object]:
    _, rows = parse_index(index)
    if name not in rows:
        return {"ok": False, "code": "INDEX_ROW_MISSING", "name": name, "status": None}
    status = rows[name][4]
    if status != "published":
        return {"ok": False, "code": "INDEX_NOT_PUBLISHED", "name": name, "status": status}
    return {"ok": True, "code": "INDEX_PUBLISHED", "name": name, "status": status}


def _tree_bytes(root: Path) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    for path in sorted(root.rglob("*")):
        if path.is_file():
            files[path.relative_to(root).as_posix()] = path.read_bytes()
    return files


def check_changeset(before: Path, after: Path, allowed: list[str]) -> dict[str, object]:
    if not before.is_dir() or not after.is_dir():
        return {"ok": False, "code": "CHANGESET_ROOT_MISSING", "changed": [], "undeclared": [], "allowed": list(allowed)}
    left, right = _tree_bytes(before), _tree_bytes(after)
    allowed_set = set(allowed)
    changed = sorted(path for path in set(left) | set(right) if left.get(path) != right.get(path))
    undeclared = [path for path in changed if path not in allowed_set]
    return {
        "ok": not undeclared,
        "code": "CHANGESET_OK" if not undeclared else "CHANGESET_UNDECLARED",
        "changed": changed,
        "undeclared": undeclared,
        "allowed": sorted(allowed_set),
    }


def _print_json(payload: dict[str, object]) -> None:
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def cmd_list(index: Path) -> int:
    _, rows = parse_index(index)
    for name, cells in rows.items():
        print(f"{name}\t{cells[4]}\t{cells[2]}\t{cells[3]}")
    return 0


def cmd_show(index: Path, templates: Path, name: str) -> int:
    _, rows = parse_index(index)
    if name not in rows:
        print(f"INDEX_ROW_MISSING: {name}", file=sys.stderr)
        return 1
    cells = rows[name]
    directory = templates / name
    print(f"name: {cells[0]}")
    print(f"description: {cells[1]}")
    print(f"source.type: {cells[2]}")
    print(f"captured_at: {cells[3]}")
    print(f"status: {cells[4]}")
    print(f"directory: {directory} ({'present' if directory.is_dir() else 'missing'})")
    return 0


def cmd_retire(index: Path, name: str, reason: str) -> int:
    if not reason.strip():
        print("RETIRE_REASON_REQUIRED", file=sys.stderr)
        return 1
    _, rows = parse_index(index)
    if name not in rows:
        print(f"INDEX_ROW_MISSING: {name}", file=sys.stderr)
        return 1
    if rows[name][4] == "retired":
        print(f"{name}\tretired")
        return 0
    rows[name][4] = "retired"
    write_index(index, rows)
    print(f"{name}\tretired\t{reason}")
    return 0


def cmd_delete(index: Path, templates: Path, name: str) -> int:
    _, rows = parse_index(index)
    if name not in rows:
        print(f"INDEX_ROW_MISSING: {name}", file=sys.stderr)
        return 1
    if rows[name][4] != "retired":
        print(f"DELETE_REQUIRES_RETIRED: {name} is {rows[name][4]}", file=sys.stderr)
        return 1
    directory = templates / name
    del rows[name]
    write_index(index, rows)
    if directory.is_dir():
        import shutil
        shutil.rmtree(directory)
    print(f"{name}\tdeleted")
    return 0


def cmd_require_published(index: Path, name: str, as_json: bool) -> int:
    payload = require_published(index, name)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload['name']}\t{payload['status']}\t{payload['code']}")
    return 0 if payload["ok"] else 1


def cmd_check_changeset(before: Path, after: Path, allowed: list[str], as_json: bool) -> int:
    payload = check_changeset(before, after, allowed)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload['code']}\tchanged={payload['changed']}\tundeclared={payload['undeclared']}")
    return 0 if payload["ok"] else 1


def _add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--index", type=Path, default=ROOT / "templates/INDEX.md")
    parser.add_argument("--templates", type=Path, default=ROOT / "templates")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    listed = sub.add_parser("list")
    _add_common(listed)
    show = sub.add_parser("show")
    show.add_argument("name")
    _add_common(show)
    retire = sub.add_parser("retire")
    retire.add_argument("name")
    retire.add_argument("--reason", required=True)
    _add_common(retire)
    delete = sub.add_parser("delete")
    delete.add_argument("name")
    _add_common(delete)
    require_cmd = sub.add_parser("require-published")
    require_cmd.add_argument("name")
    require_cmd.add_argument("--json", action="store_true")
    _add_common(require_cmd)
    changeset = sub.add_parser("check-changeset")
    changeset.add_argument("--before", type=Path, required=True)
    changeset.add_argument("--after", type=Path, required=True)
    changeset.add_argument("--allow", action="append", default=[], dest="allowed")
    changeset.add_argument("--json", action="store_true")
    args = parser.parse_args()
    if args.command == "list":
        return cmd_list(args.index)
    if args.command == "show":
        return cmd_show(args.index, args.templates, args.name)
    if args.command == "retire":
        return cmd_retire(args.index, args.name, args.reason)
    if args.command == "delete":
        return cmd_delete(args.index, args.templates, args.name)
    if args.command == "require-published":
        return cmd_require_published(args.index, args.name, args.json)
    if args.command == "check-changeset":
        return cmd_check_changeset(args.before, args.after, args.allowed, args.json)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
