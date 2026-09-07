"""Scan output roots for raw palette, hex, and illegal imports."""
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
DOMAIN_IMPORT = re.compile(
    r"""import\s+(?:\{[^}]*\b(?:Button|Input|Dialog|Select)\b[^}]*\}|(?:Button|Input|Dialog))\s+from\s+['"][^'"]*(?:domain|features|entities)[^'"]*['"]"""
)
PAGE_DIV = re.compile(r"return\s*\(\s*<div\b[^>]*(?:className|class)=")


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
        if DOMAIN_IMPORT.search(text):
            findings.append({"code": "CROSS_LAYER_IMPORT", "path": relative})
        if "Page" not in text and PAGE_DIV.search(text) and ("app/" in relative or "pages/" in relative or "/routes/" in relative):
            findings.append({"code": "BARE_PAGE_CONTAINER", "path": relative})
    return {"ok": not findings, "findings": findings}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="扫描 raw token 与跨层 import")
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
