#!/usr/bin/env python3
"""生产 templates/INDEX.md 的 list/show/retire/delete/seed/adopt/resolve，以及 Apply Intake 的 published 检查。"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

HEADER = ["名称", "风格描述", "来源类型", "采集日期", "状态"]
STATUSES = {"published", "retired"}
AUTHOR_SKILL = "ui-template-author"


def project_templates() -> Path:
    return Path.cwd() / "templates"


def project_index() -> Path:
    return project_templates() / "INDEX.md"


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


def try_parse_index(path: Path) -> dict[str, list[str]]:
    if not path.is_file():
        return {}
    return parse_index(path)[1]


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
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(render_index(rows), encoding="utf-8")
    tmp.replace(path)


def discover_catalog(explicit: Path | None = None) -> Path | None:
    if explicit is not None:
        return explicit
    here = Path(__file__).resolve()
    cwd = Path.cwd()
    candidates = [
        here.parents[1] / "catalog",
        here.parents[1].parent / AUTHOR_SKILL / "catalog",
        cwd / AUTHOR_SKILL / "catalog",
        cwd / "skills" / AUTHOR_SKILL / "catalog",
        cwd.parent / AUTHOR_SKILL / "catalog",
    ]
    if here.parent.name == "runtime":
        candidates.insert(0, here.parents[1] / "catalog")
        candidates.insert(1, here.parents[2] / AUTHOR_SKILL / "catalog")
    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key in seen:
            continue
        seen.add(key)
        if (candidate / "INDEX.md").is_file():
            return candidate
    return None


def require_published(index: Path, name: str) -> dict[str, object]:
    if not index.is_file():
        return {"ok": False, "code": "INDEX_MISSING", "name": name, "status": None}
    _, rows = parse_index(index)
    if name not in rows:
        return {"ok": False, "code": "INDEX_ROW_MISSING", "name": name, "status": None}
    status = rows[name][4]
    if status != "published":
        return {"ok": False, "code": "INDEX_NOT_PUBLISHED", "name": name, "status": status}
    return {"ok": True, "code": "INDEX_PUBLISHED", "name": name, "status": status}


def _meta_field(directory: Path, field: str) -> str | None:
    meta = directory / "meta.yaml"
    if not meta.is_file():
        return None
    match = re.search(rf"(?m)^{re.escape(field)}:\s*[\"']?([^\s\"']+)", meta.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def _template_digest(directory: Path) -> dict[str, str] | None:
    if not directory.is_dir():
        return None
    files = _tree_bytes(directory)
    payload = [{"path": path, "sha256": hashlib.sha256(body).hexdigest()} for path, body in sorted(files.items())]
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {"algorithm": "sha256-canonical-json-v1", "value": hashlib.sha256(encoded).hexdigest()}


def _locator(origin: str, name: str) -> str:
    return f"{'templates' if origin == 'project' else 'catalog'}/{name}"


def _identity(origin: str, directory: Path, name: str, status: str | None, code: str, ok: bool) -> dict[str, object]:
    return {
        "ok": ok,
        "code": code,
        "origin": origin,
        "name": name,
        "version": _meta_field(directory, "template_version") or _meta_field(directory, "version"),
        "digest": _template_digest(directory),
        "status": status,
        "path": _locator(origin, name),
        "directory": str(directory),
    }


def resolve_published(
    index: Path,
    templates: Path,
    name: str,
    catalog: Path | None = None,
) -> dict[str, object]:
    current = require_published(index, name)
    project_dir = templates / name
    if current["ok"]:
        return _identity("project", project_dir, name, "published", "RESOLVED_PUBLISHED", True)
    if current["code"] == "INDEX_NOT_PUBLISHED":
        payload = _identity("project", project_dir, name, current["status"], current["code"], False)
        return payload
    resolved = discover_catalog(catalog)
    if resolved is None:
        return {"ok": False, "code": "TEMPLATE_NOT_IN_CATALOG", "origin": None, "name": name, "version": None, "digest": None, "status": None, "path": None, "directory": None}
    catalog_index = resolved / "INDEX.md"
    rows = try_parse_index(catalog_index)
    cells = rows.get(name)
    catalog_dir = resolved / name
    if cells is None or cells[4] != "published" or not catalog_dir.is_dir():
        return {"ok": False, "code": "TEMPLATE_NOT_IN_CATALOG", "origin": None, "name": name, "version": None, "digest": None, "status": cells[4] if cells else None, "path": None, "directory": None}
    return _identity("catalog", catalog_dir, name, "published", "RESOLVED_PUBLISHED", True)


def seed_from_catalog(
    catalog: Path,
    index: Path,
    templates: Path,
    names: list[str] | None = None,
) -> dict[str, object]:
    catalog_index = catalog / "INDEX.md"
    if not catalog_index.is_file():
        return {"ok": False, "code": "CATALOG_MISSING", "seeded": [], "skipped": [], "missing": names or []}
    catalog_rows = parse_index(catalog_index)[1]
    project_rows = try_parse_index(index)
    wanted = list(names) if names else [name for name, cells in catalog_rows.items() if cells[4] == "published"]
    seeded: list[str] = []
    skipped: list[dict[str, object]] = []
    missing: list[dict[str, str]] = []
    for name in wanted:
        cells = catalog_rows.get(name)
        if cells is None or cells[4] != "published":
            missing.append({"name": name, "code": "CATALOG_NOT_PUBLISHED" if cells else "CATALOG_ROW_MISSING"})
            continue
        dest = templates / name
        if name in project_rows or dest.exists():
            skipped.append({
                "name": name,
                "code": "SEED_SKIPPED_EXISTS",
                "status": project_rows[name][4] if name in project_rows else None,
            })
            continue
        source = catalog / name
        if not source.is_dir():
            missing.append({"name": name, "code": "CATALOG_TEMPLATE_MISSING"})
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, dest)
        project_rows[name] = cells[:5]
        seeded.append(name)
    if seeded:
        write_index(index, project_rows)
    return {
        "ok": not missing,
        "code": "SEED_OK" if not missing else "SEED_INCOMPLETE",
        "seeded": seeded,
        "skipped": skipped,
        "missing": missing,
    }


def ensure_published(
    index: Path,
    templates: Path,
    name: str,
    catalog: Path | None = None,
) -> dict[str, object]:
    current = require_published(index, name)
    if current["ok"]:
        return current
    if current["code"] == "INDEX_NOT_PUBLISHED":
        return current
    resolved = discover_catalog(catalog)
    if resolved is None:
        return {"ok": False, "code": "TEMPLATE_NOT_IN_CATALOG", "name": name, "status": None}
    seeded = seed_from_catalog(resolved, index, templates, [name])
    if name in {item["name"] for item in seeded.get("skipped", [])}:  # type: ignore[arg-type]
        return require_published(index, name)
    if name not in seeded["seeded"]:
        return {"ok": False, "code": "TEMPLATE_NOT_IN_CATALOG", "name": name, "status": None}
    return require_published(index, name)


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


def _adopt_before_write(index: Path, templates: Path, name: str, catalog: Path | None) -> tuple[bool, bool]:
    if name in try_parse_index(index) or (templates / name).exists():
        return True, False
    resolved = discover_catalog(catalog)
    if resolved is None:
        print("CATALOG_MISSING", file=sys.stderr)
        return False, False
    payload = seed_from_catalog(resolved, index, templates, [name])
    if name not in payload["seeded"]:
        code = payload["code"]
        details = payload.get("missing") or payload.get("skipped") or []
        print(f"{code}: {name} {details}", file=sys.stderr)
        return False, False
    return True, True


def cmd_retire(index: Path, templates: Path, name: str, reason: str, catalog: Path | None) -> int:
    if not reason.strip():
        print("RETIRE_REASON_REQUIRED", file=sys.stderr)
        return 1
    adopted_ok, adopted = _adopt_before_write(index, templates, name, catalog)
    if not adopted_ok:
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


def cmd_delete(index: Path, templates: Path, name: str, catalog: Path | None) -> int:
    adopted_ok, adopted = _adopt_before_write(index, templates, name, catalog)
    if not adopted_ok:
        return 1
    if adopted and cmd_retire(index, templates, name, "delete requested after catalog adoption", catalog) != 0:
        return 1
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
        shutil.rmtree(directory)
    print(f"{name}\tdeleted")
    return 0


def cmd_seed(index: Path, templates: Path, catalog: Path | None, names: list[str], as_json: bool) -> int:
    resolved = discover_catalog(catalog)
    if resolved is None:
        payload = {"ok": False, "code": "CATALOG_MISSING", "seeded": [], "skipped": [], "missing": names}
        if as_json:
            _print_json(payload)
        else:
            print(payload["code"], file=sys.stderr)
        return 1
    payload = seed_from_catalog(resolved, index, templates, names or None)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload['code']}\tseeded={payload['seeded']}\tskipped={len(payload['skipped'])}")
    return 0 if payload["ok"] else 1


def cmd_require_published(
    index: Path,
    templates: Path,
    name: str,
    catalog: Path | None,
    as_json: bool,
    seed: bool,
) -> int:
    payload = ensure_published(index, templates, name, catalog) if seed else resolve_published(index, templates, name, catalog)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload.get('name')}\t{payload.get('origin')}\t{payload.get('status')}\t{payload.get('code')}")
    return 0 if payload["ok"] else 1


def cmd_resolve(
    index: Path,
    templates: Path,
    name: str,
    catalog: Path | None,
    as_json: bool,
) -> int:
    payload = resolve_published(index, templates, name, catalog)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload.get('name')}\t{payload.get('origin')}\t{payload.get('status')}\t{payload.get('code')}\t{payload.get('path')}")
    return 0 if payload["ok"] else 1


def _phase_status(text: str, phase_id: int) -> str | None:
    try:
        data = json.loads(text)
        for phase in data.get("phases") or []:
            if isinstance(phase, dict) and phase.get("id") == phase_id:
                status = phase.get("status")
                return str(status) if status is not None else None
    except json.JSONDecodeError:
        pass
    for block in re.split(r"(?m)^(?:-\s*)?id:\s*", text):
        if not block.startswith(f"{phase_id}") or (len(block) > 1 and block[len(str(phase_id))] not in {"", "\n", " ", "\t", "\r"}):
            continue
        match = re.search(r"(?m)^[ \t]*status:\s*(\S+)", block)
        return match.group(1) if match else None
    return None


def session_closed(apply_root: Path) -> dict[str, object]:
    checkpoint_path = apply_root / "checkpoint.yaml"
    inbox = apply_root / "feedback"
    if not checkpoint_path.is_file():
        return {"ok": False, "code": "APPLY_ROOT_INCOMPLETE", "session_closed": False, "may_delete_apply_root": False, "hint": "缺少 checkpoint.yaml"}
    phase9_complete = _phase_status(checkpoint_path.read_text(encoding="utf-8"), 9) == "complete"
    proposed = False
    if inbox.is_dir():
        for path in inbox.glob("*.y*ml"):
            if re.search(r"(?m)^status:\s*proposed\s*$", path.read_text(encoding="utf-8")):
                proposed = True
                break
    closed = phase9_complete and not proposed
    return {
        "ok": closed,
        "code": "APPLY_SESSION_CLOSED" if closed else "APPLY_SESSION_OPEN",
        "session_closed": closed,
        "may_delete_apply_root": closed,
        "may_delete_templates": False,
        "proposed_feedback": proposed,
        "hint": (
            "可以删除整个 .ui-template-apply/；删除后生成页面不受影响；再次 Apply 视为新 Intake。未领养则本仓不应存在 templates/。"
            if closed
            else "会话未 closed，不得删除 .ui-template-apply/，也不得宣称完成。"
        ),
    }


def cmd_apply_close(apply_root: Path, as_json: bool) -> int:
    payload = session_closed(apply_root)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload['code']}\t{payload['hint']}")
    return 0 if payload["ok"] else 1


def cmd_check_changeset(before: Path, after: Path, allowed: list[str], as_json: bool) -> int:
    payload = check_changeset(before, after, allowed)
    if as_json:
        _print_json(payload)
    else:
        print(f"{payload['code']}\tchanged={payload['changed']}\tundeclared={payload['undeclared']}")
    return 0 if payload["ok"] else 1


def _add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--index", type=Path, default=None)
    parser.add_argument("--templates", type=Path, default=None)


def _resolve_library(args: argparse.Namespace) -> tuple[Path, Path]:
    templates = args.templates if args.templates is not None else project_templates()
    index = args.index if args.index is not None else templates / "INDEX.md"
    return index, templates


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
    retire.add_argument("--catalog", type=Path)
    _add_common(retire)
    delete = sub.add_parser("delete")
    delete.add_argument("name")
    delete.add_argument("--catalog", type=Path)
    _add_common(delete)
    seed = sub.add_parser("seed")
    seed.add_argument("names", nargs="*")
    seed.add_argument("--catalog", type=Path)
    seed.add_argument("--json", action="store_true")
    _add_common(seed)
    adopt = sub.add_parser("adopt")
    adopt.add_argument("name")
    adopt.add_argument("--catalog", type=Path)
    adopt.add_argument("--json", action="store_true")
    _add_common(adopt)
    resolve_cmd = sub.add_parser("resolve")
    resolve_cmd.add_argument("name")
    resolve_cmd.add_argument("--catalog", type=Path)
    resolve_cmd.add_argument("--json", action="store_true")
    _add_common(resolve_cmd)
    require_cmd = sub.add_parser("require-published")
    require_cmd.add_argument("name")
    require_cmd.add_argument("--catalog", type=Path)
    require_cmd.add_argument("--json", action="store_true")
    require_cmd.add_argument("--seed", action="store_true")
    require_cmd.add_argument("--no-seed", action="store_true")
    _add_common(require_cmd)
    close_cmd = sub.add_parser("apply-close")
    close_cmd.add_argument("--apply-root", type=Path, default=Path(".ui-template-apply"))
    close_cmd.add_argument("--json", action="store_true")
    changeset = sub.add_parser("check-changeset")
    changeset.add_argument("--before", type=Path, required=True)
    changeset.add_argument("--after", type=Path, required=True)
    changeset.add_argument("--allow", action="append", default=[], dest="allowed")
    changeset.add_argument("--json", action="store_true")
    args = parser.parse_args()
    if args.command == "check-changeset":
        return cmd_check_changeset(args.before, args.after, args.allowed, args.json)
    if args.command == "apply-close":
        return cmd_apply_close(args.apply_root, args.json)
    index, templates = _resolve_library(args)
    if args.command == "list":
        return cmd_list(index)
    if args.command == "show":
        return cmd_show(index, templates, args.name)
    if args.command == "retire":
        return cmd_retire(index, templates, args.name, args.reason, args.catalog)
    if args.command == "delete":
        return cmd_delete(index, templates, args.name, args.catalog)
    if args.command == "seed":
        return cmd_seed(index, templates, args.catalog, args.names, args.json)
    if args.command == "adopt":
        return cmd_seed(index, templates, args.catalog, [args.name], args.json)
    if args.command == "resolve":
        return cmd_resolve(index, templates, args.name, args.catalog, args.json)
    if args.command == "require-published":
        return cmd_require_published(index, templates, args.name, args.catalog, args.json, seed=bool(args.seed) and not args.no_seed)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
