"""Scan output roots for raw palette, hex, raw spacing/size/type values, and illegal imports."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Iterable

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".ui-template-design",
    ".ui-template-apply", "__pycache__", "vendor",
}
TEXT_SUFFIXES = {
    ".css", ".scss", ".sass", ".less", ".tsx", ".ts", ".jsx", ".js", ".vue",
    ".svelte", ".html", ".mdx",
}
RAW_PALETTE = re.compile(
    r"\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:gray|zinc|slate|neutral|stone|red|green|blue|yellow|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b"
)
RAW_HEX = re.compile(r"(?:className|style|color)\s*[=\:]\s*['\"`][^'\"`]*#[0-9A-Fa-f]{3,8}")
HEX_CSS = re.compile(r"(?:color|background(?:-color)?|border-color)\s*:\s*#[0-9A-Fa-f]{3,8}")
CSS_CUSTOM_HEX = re.compile(r"--[\w-]+\s*:\s*#[0-9A-Fa-f]{3,8}")
RAW_SPACING_ARBITRARY = re.compile(r"\b[pm][trblxy]?-\[[\d.]+(?:px|rem|em|vh|vw)\]")
RAW_SPACING_CSS = re.compile(
    r"(?:padding|margin|gap|row-gap|column-gap)\s*:\s*[\d.]+(?:px|rem|em)\b"
)
RAW_SIZE_ARBITRARY = re.compile(
    r"(?<![\w-])(?:min-h|max-h|min-w|max-w|h|w|size)-\[[\d.]+(?:px|rem|em|vh|vw|dvh|svh|%)\]"
)
RAW_TYPE_ARBITRARY = re.compile(r"(?<![\w-])(?:text|leading)-\[[\d.]+(?:px|rem|em|%)?\]")
# Literal (non-var) CSS declarations; `var(...)`, inherit/initial/unset are allowed.
RAW_TYPE_CSS = re.compile(
    r"(?<![\w-])(?:font-size|line-height)\s*:\s*[\d.]+(?:px|rem|em|%)?\s*(?:!important)?\s*[;}\n]"
)
RAW_FONT_FAMILY_CSS = re.compile(
    r"(?<![\w-])font-family\s*:\s*(?!\s*(?:var\(|inherit|initial|unset|revert))[^;}\n]+"
)
RAW_HEIGHT_CSS = re.compile(r"(?<![\w-])(?:min-|max-)?height\s*:\s*[\d.]+(?:px|rem|em)\b")
# CSS-in-JS / inline style objects.
RAW_TYPE_JS = re.compile(
    r"\b(?:fontSize|lineHeight|height|minHeight|maxHeight)\s*:\s*['\"`]?[\d.]+(?:px|rem|em)?\b"
)
RAW_FONT_FAMILY_JS = re.compile(r"\bfontFamily\s*:\s*['\"`](?!\s*var\()")
# Token projection carriers (theme/tokens stylesheets) may hold literal values.
PROJECTION_NAME_MARKERS = ("token", "theme")
RAW_TRANSITION_ALL = re.compile(r"\btransition-all\b")
RAW_KEYFRAMES = re.compile(r"@keyframes\b")
DOMAIN_IMPORT = re.compile(
    r"""import\s+(?:\{[^}]*\b(?:Button|Input|Dialog|Select)\b[^}]*\}|(?:Button|Input|Dialog))\s+from\s+['"][^'"]*(?:domain|features|entities)[^'"]*['"]"""
)
PAGE_DIV = re.compile(r"return\s*\(\s*<div\b[^>]*(?:className|class)=")
NON_CSS_SUFFIXES = {".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte", ".html", ".mdx"}
APP_PATH_MARKERS = ("app/", "pages/", "/routes/", "views/")


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        yield path


def scan(root: Path) -> dict[str, object]:
    findings: list[dict[str, str]] = []
    for path in iter_files(root):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        relative = path.relative_to(root).as_posix()
        if RAW_PALETTE.search(text):
            findings.append({"code": "RAW_PALETTE", "path": relative})
        if RAW_HEX.search(text) or HEX_CSS.search(text):
            findings.append({"code": "RAW_HEX", "path": relative})
        if path.suffix.lower() in NON_CSS_SUFFIXES and CSS_CUSTOM_HEX.search(text):
            findings.append({"code": "RAW_HEX", "path": relative})
        if RAW_SPACING_ARBITRARY.search(text):
            findings.append({"code": "RAW_SPACING", "path": relative})
        if path.suffix.lower() in NON_CSS_SUFFIXES and RAW_SPACING_CSS.search(text):
            findings.append({"code": "RAW_SPACING", "path": relative})
        suffix = path.suffix.lower()
        is_projection = any(marker in path.name.lower() for marker in PROJECTION_NAME_MARKERS)
        if RAW_SIZE_ARBITRARY.search(text):
            findings.append({"code": "RAW_SIZE", "path": relative})
        if RAW_TYPE_ARBITRARY.search(text):
            findings.append({"code": "RAW_TYPOGRAPHY", "path": relative})
        if not is_projection and (RAW_TYPE_CSS.search(text) or RAW_FONT_FAMILY_CSS.search(text)):
            findings.append({"code": "RAW_TYPOGRAPHY", "path": relative})
        if not is_projection and RAW_HEIGHT_CSS.search(text):
            findings.append({"code": "RAW_SIZE", "path": relative})
        if suffix in NON_CSS_SUFFIXES and (RAW_TYPE_JS.search(text) or RAW_FONT_FAMILY_JS.search(text)):
            findings.append({"code": "RAW_TYPOGRAPHY_OR_SIZE", "path": relative})
        if RAW_TRANSITION_ALL.search(text):
            findings.append({"code": "RAW_MOTION", "path": relative})
        if RAW_KEYFRAMES.search(text) and any(m in relative for m in APP_PATH_MARKERS):
            findings.append({"code": "RAW_MOTION", "path": relative})
        if DOMAIN_IMPORT.search(text):
            findings.append({"code": "CROSS_LAYER_IMPORT", "path": relative})
        if "Page" not in text and PAGE_DIV.search(text) and ("app/" in relative or "pages/" in relative or "/routes/" in relative):
            findings.append({"code": "BARE_PAGE_CONTAINER", "path": relative})
    return {"ok": not findings, "findings": findings}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="扫描 raw token（色/间距/尺寸/字体）与跨层 import")
    parser.add_argument("output_root", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    root = args.output_root.resolve()
    if not root.exists():
        payload = {"ok": False, "error": f"OUTPUT_ROOT_MISSING: {root}"}
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
        return 1
    payload = scan(root)
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
