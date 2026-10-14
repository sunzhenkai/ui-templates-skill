#!/usr/bin/env python3
"""Extract a ui-template style package from existing CSS custom properties.

  extract_theme.py --css a.css [--css b.css ...] --name NAME --out DIR [--map src=role ...] [--source-ref TEXT --license SPDX]

Reads `:root` and `.dark` (also `[data-theme=dark]`, `:root.dark`) blocks, converts hex / rgb() /
hsl() / bare "H S% L%" (shadcn v3) / oklch() values to oklch, maps them onto the theme contract,
and fills any role the source does not define from a neutral derivation (reported as `filled`).
The report lists every mapping so a human can correct it with --map before publishing.
"""
from __future__ import annotations

import argparse
import colorsys
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ui-template-design/scripts"))
try:
    import derive_theme  # sibling skill; used only to fill missing roles
except ImportError:  # pragma: no cover
    derive_theme = None

ALIASES = {  # common source names → contract role
    "surface": "card", "surface-foreground": "card-foreground", "surface-raised": "popover",
    "page-canvas": "background", "canvas": "background", "text": "foreground", "text-muted": "muted-foreground",
    "danger": "destructive", "error": "destructive", "positive": "success", "caution": "warning",
    "accent-brand": "brand", "focus": "ring", "outline": "border", "shell": "app-shell",
}
DARK_SELECTORS = (".dark", ":root.dark", "[data-theme=dark]", '[data-theme="dark"]', "html.dark")


def to_oklch(value: str) -> str | None:
    v = value.strip()
    if v.startswith("oklch("):
        return v
    rgb: tuple[float, float, float] | None = None
    alpha = None
    if m := re.fullmatch(r"#([0-9a-fA-F]{3,8})", v):
        h = m.group(1)
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        rgb = tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        if len(h) == 8:
            alpha = int(h[6:8], 16) / 255
    elif m := re.fullmatch(r"rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)", v):
        rgb = tuple(float(m.group(i)) / 255 for i in (1, 2, 3))
        alpha = m.group(4)
    elif m := re.fullmatch(r"(?:hsla?\()?\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)?", v):
        r, g, b = colorsys.hls_to_rgb(float(m.group(1)) / 360, float(m.group(3)) / 100, float(m.group(2)) / 100)
        rgb, alpha = (r, g, b), m.group(4)
    if rgb is None:
        return None
    lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in rgb]
    l_ = (0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]) ** (1 / 3)
    m_ = (0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]) ** (1 / 3)
    s_ = (0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]) ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    c, hue = math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360
    out = f"oklch({L:.3f} {c:.4f} {hue if c > 0.0005 else 0:.1f}"
    if alpha is not None:
        a_val = float(str(alpha).rstrip("%")) / (100 if str(alpha).endswith("%") else 1)
        if a_val < 1:
            return out + f" / {round(a_val * 100)}%)"
    return out + ")"


def read_blocks(css: str) -> tuple[dict[str, str], dict[str, str]]:
    light: dict[str, str] = {}
    dark: dict[str, str] = {}
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        selectors = {s.strip() for s in m.group(1).split(",")}
        target = dark if selectors & set(DARK_SELECTORS) else light if selectors & {":root", "html"} else None
        if target is None:
            continue
        for name, value in re.findall(r"--([\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)", m.group(2).strip()):
            target[name] = value.strip()
    return light, dark


def resolve(vars_: dict[str, str], value: str, depth: int = 0) -> str:
    while (m := re.fullmatch(r"var\(--([\w-]+)\)", value.strip())) and depth < 8:
        value, depth = vars_.get(m.group(1), value), depth + 1
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--css", action="append", required=True, type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--map", action="append", default=[], help="source-var=role override, e.g. --map brand-500=brand")
    parser.add_argument("--source-ref", default="")
    parser.add_argument("--license", default="UNKNOWN")
    args = parser.parse_args(argv)
    if derive_theme is None:
        print("needs ui-template-design/scripts/derive_theme.py next to this skill", file=sys.stderr)
        return 2
    light_src: dict[str, str] = {}
    dark_src: dict[str, str] = {}
    for path in args.css:
        l, d = read_blocks(path.read_text(encoding="utf-8"))
        light_src.update(l)
        dark_src.update(d)
    overrides = dict(item.split("=", 1) for item in args.map)
    ns = argparse.Namespace(name=args.name, accent_hue=255, accent_chroma=0.16, neutral_hue=286, neutral_chroma=0.005, radius=0.5, primary="neutral", summary="Extracted package.")
    base = derive_theme.palette(ns.accent_hue, ns.accent_chroma, ns.neutral_hue, ns.neutral_chroma, ns.primary)
    roles = list(base["light"])
    report: list[str] = []
    result = {"light": dict(base["light"]), "dark": dict(base["dark"])}
    for mode, src in (("light", light_src), ("dark", dark_src)):
        found: set[str] = set()
        for name in src:
            role = overrides.get(name) or (name if name in roles else ALIASES.get(name))
            if role is None or role in found and name != role:
                continue
            color = to_oklch(resolve(src, src[name]))
            if color is None:
                report.append(f"skip     {mode:5} --{name}: {src[name]} (not a color)")
                continue
            result[mode][role] = color
            found.add(role)
            report.append(f"mapped   {mode:5} --{name} → {role}")
        for role in roles:
            if role not in found:
                report.append(f"filled   {mode:5} {role} (derived default)")
    radius = light_src.get("radius", "0.5rem").replace("rem", "").strip()
    ns.radius = float(radius) if re.fullmatch(r"[\d.]+", radius) else 0.5
    meta, css = derive_theme.render(ns)
    for mode, selector in (("light", ":root"), ("dark", ".dark")):
        block_start = css.index(f"\n{selector} {{") if f"\n{selector} {{" in css else css.index(f"{selector} {{")
        block_end = css.index("}", block_start)
        block = css[block_start:block_end]
        for role, value in result[mode].items():
            block = re.sub(rf"(  --{re.escape(role)}: )[^;]+;", lambda m, v=value: m.group(1) + v + ";", block)
        css = css[:block_start] + block + css[block_end:]
    meta = meta.replace("kind: derived", "kind: extracted").replace(
        meta.split("ref: ", 1)[1].split("\n", 1)[0], args.source_ref or ", ".join(p.name for p in args.css)
    ).replace("license: project", f"license: {args.license}")
    out = args.out / args.name
    out.mkdir(parents=True, exist_ok=True)
    (out / "meta.yaml").write_text(meta, encoding="utf-8")
    (out / "theme.css").write_text(css.replace("generated by derive_theme.py", "extracted by extract_theme.py"), encoding="utf-8")
    (out / "EXTRACTION.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    filled = sum(line.startswith("filled") for line in report)
    print(f"wrote {out}: {sum(l.startswith('mapped') for l in report)} mapped, {filled} filled (see EXTRACTION.txt)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
