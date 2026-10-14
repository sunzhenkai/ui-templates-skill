#!/usr/bin/env python3
"""Derive a complete ui-template style package (meta.yaml + theme.css) from a handful of inputs.

  derive_theme.py --name NAME --out DIR [--accent-hex #2563eb | --accent-hue 255] [--accent-chroma 0.16]
                  [--neutral-hue 286] [--neutral-chroma 0.005] [--radius 0.5]
                  [--primary neutral|accent] [--summary TEXT]

Every shadcn core variable and every extension is written for light and dark, so the package
passes the theme contract by construction. Contrast is then checked by ui-template-apply's
validate_package.py; fix by moving the offending lightness, not by adding variables.
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from pathlib import Path


def ok(l: float, c: float, h: float, alpha: str | None = None) -> str:
    base = f"oklch({l:.3f} {c:.4f} {h:.1f}"
    return base + (f" / {alpha})" if alpha else ")")


def palette(a_h: float, a_c: float, n_h: float, n_c: float, primary: str) -> dict[str, dict[str, str]]:
    n = lambda l, k=1.0: ok(l, n_c * k, n_h)  # neutral step
    a = lambda l, k=1.0: ok(l, a_c * k, a_h)  # accent step
    light = {
        "app-shell": n(0.964, 0.3), "background": n(0.988, 0), "foreground": n(0.141),
        "card": n(1, 0), "card-foreground": n(0.141), "popover": n(1, 0), "popover-foreground": n(0.141),
        "primary": n(0.21) if primary == "neutral" else a(0.5), "primary-foreground": n(0.985, 0),
        "secondary": n(0.967, 0.2), "secondary-foreground": n(0.21), "muted": n(0.967, 0.2),
        "muted-foreground": n(0.505, 3), "faint-foreground": n(0.606, 3), "accent": n(0.955, 0.4),
        "accent-foreground": n(0.21), "destructive": ok(0.52, 0.21, 27.3),
        "success": ok(0.53, 0.15, 145), "warning": ok(0.75, 0.16, 85), "warning-foreground": ok(0.48, 0.12, 70),
        "info": ok(0.55, 0.18, 250), "brand": a(0.55), "brand-foreground": n(0.985, 0),
        "border": n(0.905, 0.6), "input": n(0.92, 0.8), "ring": a(0.62, 0.75),
        **{f"chart-{i + 1}": a(l, k) for i, (l, k) in enumerate([(0.55, 1), (0.66, 0.8), (0.76, 0.6), (0.85, 0.4), (0.92, 0.2)])},
        "sidebar": n(0.964, 0.3), "sidebar-foreground": n(0.141), "sidebar-primary": a(0.55),
        "sidebar-primary-foreground": n(0.985, 0), "sidebar-accent": n(0.935, 0.6), "sidebar-accent-foreground": n(0.21),
        "sidebar-border": n(0.92, 0.8), "sidebar-ring": a(0.62, 0.75),
    }
    dark = {
        "app-shell": n(0.155), "background": n(0.18), "foreground": n(0.985, 0),
        "card": n(0.21), "card-foreground": n(0.985, 0), "popover": n(0.235), "popover-foreground": n(0.985, 0),
        "primary": n(0.92, 0.8) if primary == "neutral" else a(0.7), "primary-foreground": n(0.21),
        "secondary": n(0.274), "secondary-foreground": n(0.985, 0), "muted": n(0.274),
        "muted-foreground": n(0.705, 3), "faint-foreground": n(0.6, 3), "accent": n(0.3),
        "accent-foreground": n(0.985, 0), "destructive": ok(0.704, 0.191, 22.2),
        "success": ok(0.65, 0.15, 145), "warning": ok(0.7, 0.16, 85), "warning-foreground": ok(0.8, 0.14, 85),
        "info": ok(0.65, 0.18, 250), "brand": a(0.65), "brand-foreground": n(0.985, 0),
        "border": "oklch(1 0 0 / 12%)", "input": "oklch(1 0 0 / 15%)", "ring": a(0.6, 0.75),
        **{f"chart-{i + 1}": a(l, k) for i, (l, k) in enumerate([(0.72, 1), (0.62, 0.8), (0.52, 0.6), (0.42, 0.4), (0.32, 0.2)])},
        "sidebar": n(0.155), "sidebar-foreground": n(0.985, 0), "sidebar-primary": a(0.65),
        "sidebar-primary-foreground": n(0.985, 0), "sidebar-accent": n(0.274), "sidebar-accent-foreground": n(0.985, 0),
        "sidebar-border": "oklch(1 0 0 / 10%)", "sidebar-ring": a(0.6, 0.75),
    }
    return {"light": light, "dark": dark}


THEME_INLINE = """@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-heading: var(--font-sans);
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
%s
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --shadow-xs: var(--surface-shadow);
  --shadow-lg: var(--floating-shadow);
}

/* Density: compact */
@theme {
  --text-xs: 12px;
  --text-xs--line-height: 16px;
  --text-sm: 13px;
  --text-sm--line-height: 20px;
  --text-base: 14px;
  --text-base--line-height: 22px;
  --text-lg: 16px;
  --text-lg--line-height: 24px;
  --text-xl: 18px;
  --text-xl--line-height: 26px;
}
"""
SHADOWS = {
    "light": ("0 1px 2px rgb(15 23 42 / 0.04), 0 1px 1px rgb(15 23 42 / 0.03)", "0 16px 40px rgb(15 23 42 / 0.14), 0 3px 10px rgb(15 23 42 / 0.08)"),
    "dark": ("0 1px 2px rgb(0 0 0 / 0.2), 0 1px 1px rgb(0 0 0 / 0.16)", "0 20px 48px rgb(0 0 0 / 0.46), 0 4px 12px rgb(0 0 0 / 0.28)"),
}
BASE = """
@layer base {
  * { @apply border-border outline-ring/50; }
  html { @apply font-sans; }
  body { @apply bg-background text-foreground text-sm antialiased; }
  :where(h1, h2, h3) { text-wrap: balance; }
}
"""


def _lum(value: str) -> float:
    l, c, h = (float(x) for x in re.findall(r"[\d.]+", value)[:3])
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_, m_, s_ = ((l + 0.3963377774 * a + 0.2158037573 * b) ** 3, (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, (l - 0.0894841775 * a - 1.2914855480 * b) ** 3)
    rgb = (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)
    r, g, bl = (min(1.0, max(0.0, v)) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl


def _ratio(x: str, y: str) -> float:
    hi, lo = sorted((_lum(x), _lum(y)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


# accent-derived roles that carry text or must stand out; nudged until AA holds
TEXT_ROLES = [("brand", "background", 4.5), ("sidebar-primary", "sidebar", 4.5), ("primary", "primary-foreground", 4.5), ("ring", "background", 3.0)]


def fit_contrast(pal: dict[str, dict[str, str]]) -> None:
    for mode, step in (("light", -0.01), ("dark", 0.01)):
        vars_ = pal[mode]
        for role, against, minimum in TEXT_ROLES:
            value = vars_[role]
            for _ in range(40):
                if _ratio(value, vars_[against]) >= minimum:
                    break
                l, rest = value[6:].split(" ", 1)
                value = f"oklch({float(l) + step:.3f} {rest}"
            vars_[role] = value


def hex_to_oklch(value: str) -> tuple[float, float, float]:
    v = value.lstrip("#")
    if len(v) == 3:
        v = "".join(ch * 2 for ch in v)
    lin = [((c / 255 + 0.055) / 1.055) ** 2.4 if c / 255 > 0.04045 else c / 255 / 12.92 for c in (int(v[i:i + 2], 16) for i in (0, 2, 4))]
    l_ = (0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]) ** (1 / 3)
    m_ = (0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]) ** (1 / 3)
    s_ = (0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]) ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def render(args: argparse.Namespace) -> tuple[str, str]:
    pal = palette(args.accent_hue, args.accent_chroma, args.neutral_hue, args.neutral_chroma, args.primary)
    fit_contrast(pal)
    names = list(pal["light"])
    mapping = "\n".join(f"  --color-{n}: var(--{n});" for n in names)
    css = [f"/* ui-template package theme: {args.name} — generated by derive_theme.py; edit values freely, keep every name. */\n", THEME_INLINE % mapping]
    for mode, selector in (("light", ":root"), ("dark", ".dark")):
        lines = [f"{selector} {{"]
        if mode == "dark":
            lines.append("  color-scheme: dark;")
        else:
            lines.append(f"  --radius: {args.radius}rem;")
        lines += [f"  --{n}: {v};" for n, v in pal[mode].items()]
        lines += [f"  --surface-shadow: {SHADOWS[mode][0]};", f"  --floating-shadow: {SHADOWS[mode][1]};", "}\n"]
        css.append("\n".join(lines))
    css.append(BASE)
    meta = f"""schema: ui-template/v4
name: {args.name}
version: 0.1.0
summary: {args.summary}
fits: []
not_for: []
base:
  registry: shadcn
  cli: shadcn@4.21.4
  base: radix
  style: nova
density: compact
theme: theme.css
defaults: {{}}
sources:
  - kind: derived
    ref: derive_theme.py accent={args.accent_hue}/{args.accent_chroma} neutral={args.neutral_hue}/{args.neutral_chroma} radius={args.radius} primary={args.primary}
    license: project
"""
    return meta, "\n".join(css)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--accent-hex", help="brand color; sets accent hue and chroma (chroma capped at 0.18)")
    parser.add_argument("--accent-hue", type=float, default=255)
    parser.add_argument("--accent-chroma", type=float, default=0.16)
    parser.add_argument("--neutral-hue", type=float, default=286)
    parser.add_argument("--neutral-chroma", type=float, default=0.005)
    parser.add_argument("--radius", type=float, default=0.5)
    parser.add_argument("--primary", choices=["neutral", "accent"], default="neutral")
    parser.add_argument("--summary", default="Project style package.")
    args = parser.parse_args(argv)
    if args.accent_hex:
        _, chroma, hue = hex_to_oklch(args.accent_hex)
        args.accent_hue, args.accent_chroma = round(hue, 1), round(min(chroma, 0.18), 3)
    out = args.out / args.name
    out.mkdir(parents=True, exist_ok=True)
    meta, css = render(args)
    (out / "meta.yaml").write_text(meta, encoding="utf-8")
    (out / "theme.css").write_text(css, encoding="utf-8")
    print(f"wrote {out}/meta.yaml, {out}/theme.css")
    return 0


if __name__ == "__main__":
    sys.exit(main())
