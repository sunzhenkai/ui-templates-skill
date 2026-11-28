#!/usr/bin/env python3
"""Compose a ui-template style package from its base files and extensions/ layer.

Base files (templates/<pkg>/theme.css, meta.yaml) stay clean for upstream source re-extraction;
extensions/<id>.{yaml,css} hold project-derived evolution and are merged at token level into
single unique blocks (:root, .dark, @theme inline, @theme) for catalog/ distribution.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

TOKEN_BLOCKS = ("@theme inline", "@theme", ":root", ".dark")
UNSET_RE = re.compile(r"/\*\s*@unset\s+(--[\w-]+)\s*\*/")
COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
DECL_RE = re.compile(r"(?<![\w-])(--[\w-]+)\s*:\s*([^;]+?)\s*;")


@dataclass
class ComposedPackage:
    meta_text: str
    theme_css: str
    traces: list[dict[str, str]]
    ext_ids: list[str]
    has_extensions: bool


def _skip_string(text: str, idx: int, quote: str) -> int:
    idx += 1
    while idx < len(text):
        ch = text[idx]
        if ch == "\\" and idx + 1 < len(text):
            idx += 2
            continue
        if ch == quote:
            return idx + 1
        idx += 1
    return idx


def _strip_comments(text: str) -> str:
    return COMMENT_RE.sub("", text)


def parse_top_blocks(css: str) -> list[tuple[str, int, int, int]]:
    """Return [(normalized_selector, stmt_start, open_brace, close_brace)] for top-level CSS blocks."""
    blocks: list[tuple[str, int, int, int]] = []
    depth = 0
    stmt_start = 0
    open_brace = -1
    i = 0
    n = len(css)
    while i < n:
        ch = css[i]
        if ch == "/" and i + 1 < n and css[i + 1] == "*":
            end = css.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue
        if ch in ('"', "'"):
            i = _skip_string(css, i, ch)
            continue
        if ch == "{":
            if depth == 0:
                open_brace = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and open_brace != -1:
                    raw_sel = _strip_comments(css[stmt_start:open_brace])
                    selector = " ".join(raw_sel.split())
                    blocks.append((selector, stmt_start, open_brace, i))
                    stmt_start = i + 1
                    open_brace = -1
        elif ch == ";" and depth == 0:
            stmt_start = i + 1
        i += 1
    return blocks


def _find_decl_spans(body: str, var_name: str) -> list[tuple[int, int, str]]:
    """Find non-commented `--var: value;` spans in a block body."""
    spans: list[tuple[int, int, str]] = []
    # Mask comments with spaces of equal length to preserve character offsets.
    masked = COMMENT_RE.sub(lambda m: " " * len(m.group(0)), body)
    pattern = re.compile(rf"(?<![\w-]){re.escape(var_name)}\s*:\s*([^;]+?)\s*;")
    for m in pattern.finditer(masked):
        spans.append((m.start(), m.end(), m.group(1).strip()))
    return spans


def _remove_decl(body: str, var_name: str) -> tuple[str, str | None]:
    spans = _find_decl_spans(body, var_name)
    if not spans:
        return body, None
    old_val = spans[-1][2]
    # Remove from back to front; if the declaration sits on its own line, remove the whole line.
    out = body
    for start, end, _ in reversed(spans):
        line_start = out.rfind("\n", 0, start) + 1
        line_end = out.find("\n", end)
        line_end = len(out) if line_end == -1 else line_end + 1
        prefix = out[line_start:start].strip()
        suffix = _strip_comments(out[end:line_end]).strip()
        if not prefix and not suffix:
            out = out[:line_start] + out[line_end:]
        else:
            out = out[:start] + out[end:]
    return out, old_val


def _replace_decl(body: str, var_name: str, new_value: str) -> tuple[str, str | None]:
    spans = _find_decl_spans(body, var_name)
    if not spans:
        return body, None
    start, end, old_val = spans[-1]
    masked = COMMENT_RE.sub(lambda m: " " * len(m.group(0)), body[start:end])
    colon = masked.find(":")
    semi = masked.rfind(";")
    val_start = start + colon + 1
    val_end = start + semi
    updated = body[:val_start] + " " + new_value + body[val_end:]
    return updated, old_val


def _append_decls(body: str, ext_id: str, additions: list[tuple[str, str]]) -> str:
    if not additions:
        return body
    lines = [f"  /* extension: {ext_id} */"] + [f"  {name}: {val};" for name, val in additions]
    snippet = "\n".join(lines) + "\n"
    if body.endswith("\n"):
        return body + snippet
    return body + "\n" + snippet


def compose_theme(base_css: str, extensions: list[tuple[str, str]]) -> tuple[str, list[dict[str, str]]]:
    """Merge extensions CSS into base_css at token level, keeping TOKEN_BLOCKS unique."""
    if not extensions:
        return base_css, []

    css = base_css
    traces: list[dict[str, str]] = []
    extra_sections: list[str] = []
    applied_ids: list[str] = []

    for ext_id, ext_css in extensions:
        if ext_id not in applied_ids:
            applied_ids.append(ext_id)
        ext_blocks = parse_top_blocks(ext_css)
        ext_extras: list[str] = []

        for selector, stmt_start, open_b, close_b in ext_blocks:
            if selector in TOKEN_BLOCKS:
                ext_body = ext_css[open_b + 1:close_b]
                unsets = UNSET_RE.findall(ext_body)
                clean_body = _strip_comments(ext_body)
                decls = [(m.group(1), m.group(2).strip()) for m in DECL_RE.finditer(clean_body)]

                base_blocks = [b for b in parse_top_blocks(css) if b[0] == selector]
                if base_blocks:
                    _, _, b_open, b_close = base_blocks[0]
                    b_body = css[b_open + 1:b_close]
                    for var_name in unsets:
                        b_body, old_val = _remove_decl(b_body, var_name)
                        if old_val is not None:
                            traces.append({"ext": ext_id, "block": selector, "token": var_name, "action": "unset", "old": old_val, "new": ""})
                    additions: list[tuple[str, str]] = []
                    for var_name, new_val in decls:
                        b_body, old_val = _replace_decl(b_body, var_name, new_val)
                        if old_val is not None:
                            traces.append({"ext": ext_id, "block": selector, "token": var_name, "action": "override", "old": old_val, "new": new_val})
                        else:
                            additions.append((var_name, new_val))
                            traces.append({"ext": ext_id, "block": selector, "token": var_name, "action": "add", "old": "", "new": new_val})
                    b_body = _append_decls(b_body, ext_id, additions)
                    css = css[:b_open + 1] + b_body + css[b_close:]
                else:
                    lines = [f"{selector} {{", f"  /* extension: {ext_id} */"]
                    for var_name, new_val in decls:
                        lines.append(f"  {var_name}: {new_val};")
                        traces.append({"ext": ext_id, "block": selector, "token": var_name, "action": "add", "old": "", "new": new_val})
                    lines.append("}")
                    css = css.rstrip() + "\n\n" + "\n".join(lines) + "\n"
            else:
                raw_block = ext_css[stmt_start:close_b + 1].strip()
                if raw_block:
                    ext_extras.append(raw_block)

        if ext_extras:
            extra_sections.append(f"/* === extension: {ext_id} === */\n" + "\n\n".join(ext_extras))

    if extra_sections:
        css = css.rstrip() + "\n\n" + "\n\n".join(extra_sections) + "\n"

    header = f"/* Composed from base theme.css + extensions: {', '.join(applied_ids)} (do not edit catalog copy directly). */\n"
    css = header + css.lstrip("\n")
    return css, traces


def _extract_density_comment(meta_text: str) -> str | None:
    for line in meta_text.splitlines():
        if re.match(r"^density\s*:", line) and "#" in line:
            return line.split("#", 1)[1].strip()
    return None


def compose_meta(base_meta_text: str, ext_metas: list[tuple[str, dict]], ext_ids: list[str]) -> str:
    """Merge extension defaults & density_claims into meta.yaml for catalog/validation."""
    meta = yaml.safe_load(base_meta_text) or {}
    density_comment = _extract_density_comment(base_meta_text)
    defaults = dict(meta.get("defaults") or {})

    for _, ext_meta in ext_metas:
        for k, v in (ext_meta.get("defaults") or {}).items():
            defaults[k] = v
        for label, value in (ext_meta.get("density_claims") or {}).items():
            if density_comment is not None:
                density_comment = re.sub(
                    rf"({re.escape(str(label))}\s+)\S+",
                    lambda m, val=str(value): m.group(1) + val,
                    density_comment,
                )

    meta["defaults"] = defaults
    meta.pop("extensions", None)
    if ext_ids:
        meta["applied_extensions"] = list(ext_ids)

    dumped = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True)
    if density_comment is not None:
        dumped = re.sub(
            r"^(density\s*:[^\n#]*)$",
            lambda m: f"{m.group(1).rstrip()}  # {density_comment}",
            dumped,
            count=1,
            flags=re.M,
        )
    return dumped


def check_extensions(pkg_dir: Path, meta: dict) -> list[tuple[str, str]]:
    """Validate extensions declaration vs files on disk. Returns [(code, message)]."""
    errors: list[tuple[str, str]] = []
    ext_dir = pkg_dir / "extensions"
    declared = meta.get("extensions") or []
    if not isinstance(declared, list):
        return [("P15", f"{pkg_dir.name}: meta.yaml extensions must be a list")]

    seen: set[str] = set()
    for item in declared:
        ext_id = str(item)
        if ext_id in seen:
            errors.append(("P17", f"{pkg_dir.name}: duplicate extension id {ext_id!r} in meta.yaml"))
            continue
        seen.add(ext_id)
        css_file = ext_dir / f"{ext_id}.css"
        yaml_file = ext_dir / f"{ext_id}.yaml"
        if not css_file.is_file() and not yaml_file.is_file():
            errors.append(("P15", f"{pkg_dir.name}: extension {ext_id!r} has neither {ext_id}.css nor {ext_id}.yaml in extensions/"))
        elif yaml_file.is_file():
            ext_data = yaml.safe_load(yaml_file.read_text(encoding="utf-8")) or {}
            if "id" in ext_data and str(ext_data["id"]) != ext_id:
                errors.append(("P15", f"{pkg_dir.name}: extensions/{ext_id}.yaml id {ext_data['id']!r} != {ext_id!r}"))

    if ext_dir.is_dir():
        for path in sorted(ext_dir.iterdir()):
            if path.is_file() and path.suffix in {".css", ".yaml"}:
                if path.stem not in seen:
                    errors.append(("P16", f"{pkg_dir.name}: unregistered extension file extensions/{path.name} (add {path.stem!r} to meta.yaml extensions)"))
    return errors


def compose_package(pkg_dir: Path) -> ComposedPackage:
    """Compose meta.yaml and theme.css for pkg_dir (passes through untouched if no extensions)."""
    base_meta_text = (pkg_dir / "meta.yaml").read_text(encoding="utf-8")
    meta = yaml.safe_load(base_meta_text) or {}
    theme_name = str(meta.get("theme", "theme.css"))
    base_css = (pkg_dir / theme_name).read_text(encoding="utf-8")
    ext_ids = [str(item) for item in (meta.get("extensions") or [])]
    ext_dir = pkg_dir / "extensions"

    if not ext_ids:
        return ComposedPackage(
            meta_text=base_meta_text,
            theme_css=base_css,
            traces=[],
            ext_ids=[],
            has_extensions=False,
        )

    ext_css_list: list[tuple[str, str]] = []
    ext_meta_list: list[tuple[str, dict]] = []
    for ext_id in ext_ids:
        css_file = ext_dir / f"{ext_id}.css"
        yaml_file = ext_dir / f"{ext_id}.yaml"
        if css_file.is_file():
            ext_css_list.append((ext_id, css_file.read_text(encoding="utf-8")))
        if yaml_file.is_file():
            ext_meta_list.append((ext_id, yaml.safe_load(yaml_file.read_text(encoding="utf-8")) or {}))

    composed_css, traces = compose_theme(base_css, ext_css_list)
    composed_meta = compose_meta(base_meta_text, ext_meta_list, ext_ids)
    return ComposedPackage(
        meta_text=composed_meta,
        theme_css=composed_css,
        traces=traces,
        ext_ids=ext_ids,
        has_extensions=True,
    )
