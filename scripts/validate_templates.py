#!/usr/bin/env python3
"""Validate templates/ against the ui-template deterministic template contract.

Usage:
    python3 scripts/validate_templates.py

Checks:
  - required files (spec.md / tokens.yaml / meta.yaml) and prohibited
    engineering content (implementation/, code-structure.md, stack-*.md)
  - INDEX.md contains a row for every template
  - tokens.yaml: schema, per-theme role consistency, per-token value + origin,
    spacing whitelist, WCAG AA contrast for core text/brand pairs
  - meta.yaml: name, tokens reference, coverage block, source.type
  - spec.md: Non-negotiables section exists
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    print("error: PyYAML is required (python3 -m pip install pyyaml)")
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO_ROOT / "templates"
INDEX_FILE = TEMPLATES_DIR / "INDEX.md"
ORIGINS = {"source", "computed", "estimated", "default"}
SOURCE_TYPES = {"web", "repo", "image", "doc"}
REQUIRED_FILES = ("spec.md", "tokens.yaml", "meta.yaml")

findings: list[str] = []


def ok(msg: str) -> None:
    print(f"  ok   {msg}")


def fail(msg: str) -> None:
    findings.append(msg)
    print(f"  FAIL {msg}")


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", value.strip())
    if not m:
        raise ValueError(f"not a #rrggbb color: {value}")
    return tuple(int(m.group(1)[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def rel_lum(rgb: tuple[int, int, int]) -> float:
    def chan(c: int) -> float:
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (chan(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = rel_lum(hex_to_rgb(a)), rel_lum(hex_to_rgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def load_yaml(path: Path):
    try:
        with path.open(encoding="utf-8") as f:
            return yaml.safe_load(f)
    except yaml.YAMLError as e:
        fail(f"{path.relative_to(REPO_ROOT)}: YAML parse error: {e}")
        return None


def check_token_leaves(node, path: str) -> None:
    if isinstance(node, dict):
        if "value" in node:
            origin = node.get("origin")
            if origin not in ORIGINS:
                fail(f"{path}: origin missing or invalid ({origin!r}); expected one of {sorted(ORIGINS)}")
            if node.get("value") in (None, "", [], {}):
                fail(f"{path}: empty value is not allowed")
            return
        for key, child in node.items():
            check_token_leaves(child, f"{path}.{key}")


def validate_tokens(tpl: Path) -> dict | None:
    rel = tpl / "tokens.yaml"
    data = load_yaml(rel)
    if not isinstance(data, dict):
        fail(f"{rel.relative_to(REPO_ROOT)}: root must be a mapping")
        return None
    if data.get("schema") != 1:
        fail(f"{rel.relative_to(REPO_ROOT)}: schema must be 1")
    themes = data.get("themes")
    if not isinstance(themes, dict) or not themes:
        fail(f"{rel.relative_to(REPO_ROOT)}: themes missing or empty")
        return data

    theme_names = list(themes)
    base = themes[theme_names[0]]
    base_roles = set(base)
    for name in theme_names[1:]:
        roles = set(themes[name])
        if roles != base_roles:
            fail(f"tokens.yaml themes.{name}: role keys differ from {theme_names[0]} "
                 f"(missing={sorted(base_roles - roles)}, extra={sorted(roles - base_roles)})")
    ok(f"tokens.yaml: {len(theme_names)} theme(s), {len(base_roles)} consistent roles")

    check_token_leaves(data, "tokens")

    spacing = data.get("spacing", {})
    allowed = spacing.get("allowed", {})
    if isinstance(allowed, dict):
        allowed_val = allowed.get("value")
        if not isinstance(allowed_val, list) or not all(isinstance(v, int) for v in allowed_val):
            fail("tokens.yaml spacing.allowed.value: must be a non-empty int list")
        else:
            ok(f"tokens.yaml: spacing whitelist {allowed_val}")

    # WCAG AA for core readable pairs (4.5:1)
    for name, theme in themes.items():
        def color(role: str) -> str | None:
            v = theme.get(role, {}).get("value")
            return v if isinstance(v, str) and v.startswith("#") else None

        pairs = []
        fg = color("foreground")
        if fg:
            for bg_role in ("background",):
                if bg := color(bg_role):
                    pairs.append((fg, bg, f"themes.{name}: foreground vs {bg_role}"))
        mfg = color("muted-foreground")
        if mfg:
            for bg_role in ("background", "surface", "sidebar"):
                if bg := color(bg_role):
                    pairs.append((mfg, bg, f"themes.{name}: muted-foreground vs {bg_role}"))
        bfg, brand = color("brand-foreground"), color("brand")
        if bfg and brand:
            pairs.append((bfg, brand, f"themes.{name}: brand-foreground vs brand"))
        for a, b, label in pairs:
            try:
                ratio = contrast(a, b)
            except ValueError as e:
                fail(f"{label}: {e}")
                continue
            if ratio < 4.5:
                fail(f"{label}: contrast {ratio:.2f}:1 < 4.5:1 ({a} on {b})")
        if pairs:
            ok(f"tokens.yaml themes.{name}: {len(pairs)} WCAG pairs checked")
    return data


def validate_meta(tpl: Path) -> dict | None:
    rel = tpl / "meta.yaml"
    data = load_yaml(rel)
    if not isinstance(data, dict):
        fail(f"{rel.relative_to(REPO_ROOT)}: root must be a mapping")
        return None
    name = tpl.name
    if data.get("name") != name:
        fail(f"meta.yaml: name {data.get('name')!r} != directory name {name!r}")
    if data.get("tokens") != "tokens.yaml":
        fail("meta.yaml: tokens must reference tokens.yaml")
    stype = (data.get("source") or {}).get("type")
    if stype not in SOURCE_TYPES:
        fail(f"meta.yaml: source.type {stype!r} invalid; expected one of {sorted(SOURCE_TYPES)}")
    cov = data.get("coverage")
    if not isinstance(cov, dict):
        fail("meta.yaml: coverage block missing")
    else:
        for key in ("visual_reference", "viewports", "themes"):
            if key not in cov:
                fail(f"meta.yaml: coverage.{key} missing")
    ok("meta.yaml: name/tokens/source/coverage contract")
    return data


def validate_template(tpl: Path) -> None:
    print(f"[{tpl.name}]")
    for fname in REQUIRED_FILES:
        if not (tpl / fname).is_file():
            fail(f"{tpl.relative_to(REPO_ROOT)}/{fname}: required file missing")
    if (tpl / "implementation").exists():
        fail(f"{tpl.relative_to(REPO_ROOT)}/implementation/: prohibited (use apply/)")
    for pattern in ("code-structure.md", "stack-*.md"):
        for p in tpl.glob(pattern):
            fail(f"{p.relative_to(REPO_ROOT)}: prohibited engineering content in template")
    spec = tpl / "spec.md"
    if spec.is_file() and "Non-negotiables" not in spec.read_text(encoding="utf-8"):
        fail(f"{spec.relative_to(REPO_ROOT)}: Non-negotiables section missing")
    else:
        ok("spec.md: Non-negotiables present")
    validate_tokens(tpl)
    validate_meta(tpl)


def validate_index(names: list[str]) -> None:
    if not INDEX_FILE.is_file():
        fail("templates/INDEX.md: missing")
        return
    text = INDEX_FILE.read_text(encoding="utf-8")
    for name in names:
        if not re.search(rf"^\|\s*{re.escape(name)}\s*\|", text, re.MULTILINE):
            fail(f"templates/INDEX.md: no row for {name}")
    ok(f"INDEX.md: {len(names)} template row(s) matched")


def main() -> int:
    templates = sorted(p for p in TEMPLATES_DIR.iterdir() if p.is_dir()) if TEMPLATES_DIR.is_dir() else []
    if not templates:
        fail("templates/: no template directories")
    for tpl in templates:
        validate_template(tpl)
    validate_index([t.name for t in templates])
    print()
    if findings:
        print(f"FAILED: {len(findings)} finding(s)")
        return 1
    print(f"PASSED: {len(templates)} template(s) valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
