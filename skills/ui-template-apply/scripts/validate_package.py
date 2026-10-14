#!/usr/bin/env python3
"""Validate a ui-template style package, the pattern library, or an installed project.

  validate_package.py package DIR       meta.yaml + theme.css contract + contrast
  validate_package.py patterns DIR      pattern front matter and size budget
  validate_package.py project DIR       lock hashes, theme contract, ui-decisions.yaml (decisions, pages, feedback)

Exit 1 on any error. Codes are stable (P* package, T* theme, C* contrast, N* patterns, J* project).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import yaml

SKILL = Path(__file__).resolve().parents[1]
CORE = [
    "background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground",
    "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive",
    "border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "sidebar", "sidebar-foreground",
    "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
]
EXTENSIONS = ["success", "warning", "warning-foreground", "info", "brand", "brand-foreground", "faint-foreground", "app-shell"]
# (foreground, background, minimum ratio). Text pairs need 4.5; tones used as text on a 10% tint of themselves need 4.5 on background.
CONTRAST = [
    ("foreground", "background", 7.0), ("card-foreground", "card", 7.0), ("popover-foreground", "popover", 7.0),
    ("primary-foreground", "primary", 4.5), ("secondary-foreground", "secondary", 4.5), ("muted-foreground", "background", 4.5),
    ("muted-foreground", "muted", 4.0), ("accent-foreground", "accent", 4.5), ("sidebar-foreground", "sidebar", 7.0),
    ("sidebar-accent-foreground", "sidebar-accent", 4.5), ("destructive", "background", 4.5), ("success", "background", 4.5),
    ("info", "background", 4.5), ("warning-foreground", "background", 4.5), ("brand", "background", 4.5),
    ("faint-foreground", "background", 3.0), ("border", "background", 1.25), ("border", "card", 1.25), ("ring", "background", 3.0),
]
# (text, tinted tone, alpha light, alpha dark): text drawn on a tone/alpha tint over background and card
# (e.g. shadcn destructive button: bg-destructive/10 dark:bg-destructive/20 text-destructive). Must reach 4.5, like R06.
TINTS = [
    ("destructive", "destructive", 0.10, 0.20), ("foreground", "destructive", 0.10, 0.10),
    ("foreground", "info", 0.10, 0.10), ("foreground", "success", 0.10, 0.10), ("foreground", "warning", 0.15, 0.15),
]
META_REQUIRED = ["schema", "name", "version", "summary", "base", "density", "theme", "defaults", "sources"]
DENSITIES = {"compact"}


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, code: str, message: str) -> None:
        self.errors.append(f"{code} {message}")

    def warn(self, code: str, message: str) -> None:
        self.warnings.append(f"{code} {message}")

    def finish(self, label: str) -> int:
        for line in self.warnings:
            print("warn  " + line)
        for line in self.errors:
            print("ERROR " + line)
        print(f"{label}: {len(self.errors)} error(s), {len(self.warnings)} warning(s)")
        return 1 if self.errors else 0


# ---------- color ----------
def oklch_to_srgb(l: float, c: float, h: float) -> tuple[float, float, float]:
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
    g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
    bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
    return tuple(min(1.0, max(0.0, v)) for v in (r, g, bl))  # linear sRGB, clipped


def parse_color(value: str, under: tuple[float, float, float] | None = None) -> tuple[float, float, float] | None:
    m = re.fullmatch(r"oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:/\s*([\d.]+)(%?))?\s*\)", value.strip())
    if m is None:
        return None
    l = float(m.group(1)) / (100 if m.group(2) else 1)
    rgb = oklch_to_srgb(l, float(m.group(3)), float(m.group(4)))
    if m.group(5) is not None:
        alpha = float(m.group(5)) / (100 if m.group(6) else 1)
        base = under or (1.0, 1.0, 1.0)
        rgb = tuple(alpha * x + (1 - alpha) * y for x, y in zip(rgb, base))
    return rgb


def luminance(rgb: tuple[float, float, float]) -> float:
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def contrast(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def tint(tone: tuple[float, float, float], under: tuple[float, float, float], alpha: float) -> tuple[float, float, float]:
    """Alpha-composite in gamma-encoded sRGB, as browsers do."""
    enc = lambda x: 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    dec = lambda x: x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return tuple(dec(alpha * enc(a) + (1 - alpha) * enc(b)) for a, b in zip(tone, under))


# ---------- theme ----------
def blocks(css: str, selector: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in re.finditer(re.escape(selector) + r"\s*\{([^}]*)\}", css):
        for name, value in re.findall(r"--([\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)", m.group(1).strip()):
            out[name] = value.strip()
    return out


def resolve(vars_: dict[str, str], name: str, depth: int = 0) -> str | None:
    value = vars_.get(name)
    while value is not None and value.startswith("var(") and depth < 8:
        value = vars_.get(value[4:-1].strip().lstrip("-"))
        depth += 1
    return value


def check_theme(css: str, report: Report, where: str) -> None:
    mapped = set(re.findall(r"--color-([\w-]+)\s*:\s*var\(--([\w-]+)\)", css))
    mapped_names = {a for a, b in mapped if a == b}
    light, dark = blocks(css, ":root"), blocks(css, ".dark")
    if "--text-sm" not in css:
        report.error("T05", f"{where}: density must set --text-sm in @theme")
    for name in CORE + EXTENSIONS:
        if name not in light:
            report.error("T01", f"{where}: --{name} missing in :root")
        if name not in dark:
            report.error("T02", f"{where}: --{name} missing in .dark")
        if name not in mapped_names:
            report.error("T03", f"{where}: --color-{name} not mapped in @theme inline")
    for mode, vars_ in (("light", light), ("dark", dark)):
        for name in CORE + EXTENSIONS:
            value = resolve(vars_, name)
            if value is not None and parse_color(value) is None and not name.startswith("radius"):
                report.error("T04", f"{where}: {mode} --{name} is not oklch(): {value}")
        for fg, bg, minimum in CONTRAST:
            bg_value, fg_value = resolve(vars_, bg), resolve(vars_, fg)
            if bg_value is None or fg_value is None:
                continue
            bg_rgb = parse_color(bg_value)
            base = parse_color(resolve(vars_, "background") or "oklch(1 0 0)")
            if bg_rgb is None:
                continue
            if "/" in bg_value:
                bg_rgb = parse_color(bg_value, base)
            fg_rgb = parse_color(fg_value, bg_rgb)
            if fg_rgb is None:
                continue
            ratio = contrast(fg_rgb, bg_rgb)
            if ratio < minimum:
                report.error("C01", f"{where}: {mode} {fg} on {bg} = {ratio:.2f} < {minimum}")
        for text, tone, alpha_light, alpha_dark in TINTS:
            alpha = alpha_light if mode == "light" else alpha_dark
            text_value, tone_value = resolve(vars_, text), resolve(vars_, tone)
            for surface in ("background", "card"):
                surface_value = resolve(vars_, surface)
                if text_value is None or tone_value is None or surface_value is None:
                    continue
                under, tone_rgb, text_rgb = parse_color(surface_value), parse_color(tone_value), parse_color(text_value)
                if under is None or tone_rgb is None or text_rgb is None:
                    continue
                ratio = contrast(text_rgb, tint(tone_rgb, under, alpha))
                if ratio < 4.5:
                    report.error("C02", f"{where}: {mode} {text} on {tone}/{alpha:.0%} over {surface} = {ratio:.2f} < 4.5")


def cmd_package(path: Path) -> int:
    report = Report()
    meta_path = path / "meta.yaml"
    if not meta_path.is_file():
        report.error("P01", f"{meta_path} missing")
        return report.finish("package")
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
    for key in META_REQUIRED:
        if key not in meta:
            report.error("P02", f"meta.yaml: {key} missing")
    if meta.get("schema") != "ui-template/v4":
        report.error("P03", "meta.yaml: schema must be ui-template/v4")
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(meta.get("version", ""))):
        report.error("P04", "meta.yaml: version must be semver")
    if meta.get("name") != path.name:
        report.error("P05", f"meta.yaml: name {meta.get('name')!r} != directory {path.name!r}")
    if meta.get("density") not in DENSITIES:
        report.error("P06", f"meta.yaml: density must be one of {sorted(DENSITIES)}")
    base = meta.get("base") or {}
    if base.get("registry") != "shadcn" or not base.get("style"):
        report.error("P07", "meta.yaml: base.registry must be shadcn with a style")
    for source in meta.get("sources") or []:
        if not isinstance(source, dict) or not source.get("ref") or not source.get("license"):
            report.error("P08", f"meta.yaml: every source needs ref + license: {source!r}")
    known = pattern_decisions(SKILL / "patterns")
    for key in (meta.get("defaults") or {}):
        if known and key not in known:
            report.error("P09", f"meta.yaml: default {key!r} is not a decision declared by any pattern")
    theme = path / str(meta.get("theme", "theme.css"))
    if not theme.is_file():
        report.error("P10", f"{theme.name} missing")
    else:
        check_theme(theme.read_text(encoding="utf-8"), report, theme.name)
    shots = {p.name for p in (path / "reference").glob("*.png")} if (path / "reference").is_dir() else set()
    missing = [f"{k}-{v}.png" for k in ["collection", "detail", "form", "settings", "list-detail", "empty"]
               for v in ["1280-light", "1280-dark", "768-light", "1280-light-end"] if f"{k}-{v}.png" not in shots]
    if missing:
        report.warn("C10", f"reference screenshots missing ({len(missing)}, e.g. {missing[0]}): review_visual.py capture-reference --out {path}/reference")
    return report.finish(f"package {path.name}")


# ---------- patterns ----------
FRONT = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def read_pattern(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    m = FRONT.match(text)
    return (yaml.safe_load(m.group(1)) or {}, text[m.end():]) if m else ({}, text)


def pattern_decisions(directory: Path) -> set[str]:
    keys: set[str] = set()
    for path in sorted(directory.glob("*.md")):
        front, _ = read_pattern(path)
        for decision in front.get("decisions") or []:
            if isinstance(decision, dict) and "key" in decision:
                keys.add(str(decision["key"]))
    return keys


def cmd_patterns(directory: Path) -> int:
    report = Report()
    registry = json.loads((SKILL / "library/registry.json").read_text(encoding="utf-8"))
    items = {item["name"] for item in registry["items"]}
    seen: set[str] = set()
    for path in sorted(directory.glob("*.md")):
        if path.name == "index.md":
            continue
        front, body = read_pattern(path)
        lines = path.read_text(encoding="utf-8").count("\n")
        if not front:
            report.error("N01", f"{path.name}: front matter missing")
            continue
        for key in ("name", "when", "blocks", "decisions", "self_review"):
            if key not in front:
                report.error("N02", f"{path.name}: {key} missing")
        if front.get("name") != path.stem:
            report.error("N03", f"{path.name}: name must equal file stem")
        decisions = front.get("decisions") or []
        if len(decisions) > 6:
            report.error("N04", f"{path.name}: {len(decisions)} decisions > 6")
        for decision in decisions:
            if not isinstance(decision, dict) or not {"key", "options", "default"} <= set(decision):
                report.error("N05", f"{path.name}: decision needs key/options/default: {decision!r}")
                continue
            if decision["default"] not in decision["options"]:
                report.error("N05", f"{path.name}: {decision['key']} default not among options")
            if decision["key"] in seen:
                report.error("N06", f"{path.name}: decision {decision['key']} declared twice")
            seen.add(decision["key"])
            if not str(decision["key"]).startswith(path.stem.split("-")[0] + ".") and not str(decision["key"]).startswith(path.stem + "."):
                report.warn("N07", f"{path.name}: decision {decision['key']} not namespaced by pattern")
        if len(front.get("self_review") or []) > 8:
            report.error("N08", f"{path.name}: self_review > 8 items")
        for block in front.get("blocks") or []:
            if block not in items:
                report.error("N09", f"{path.name}: block {block!r} not in registry")
        if lines > 150:
            report.error("N10", f"{path.name}: {lines} lines > 150")
        refs = re.findall(r"reference/src/(?:pages/)?[\w.-]+\.tsx", body)
        for ref in refs:
            if not (SKILL / ref).is_file():
                report.error("N12", f"{path.name}: {ref} does not exist")
        if "```" not in body and not refs:
            report.warn("N11", f"{path.name}: no code example and no reference page")
    return report.finish("patterns")


# ---------- project ----------
FEEDBACK_LAYERS = {"theme", "block", "pattern", "page"}


def cmd_project(project: Path) -> int:
    report = Report()
    lock_path = project / "ui-template.lock.json"
    if not lock_path.is_file():
        report.error("J01", "ui-template.lock.json missing; run install_registry.py")
        return report.finish("project")
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    for target, digest in lock.get("files", {}).items():
        file = project / target
        if not file.is_file():
            report.error("J02", f"{target} missing (installed by lock)")
        elif hashlib.sha256(file.read_bytes()).hexdigest() != digest:
            report.warn("J03", f"{target} edited locally (record why in ui-decisions.yaml → local_edits)")
    theme = project / "src/styles/theme.css"
    if theme.is_file():
        check_theme(theme.read_text(encoding="utf-8"), report, "src/styles/theme.css")
    else:
        report.error("J04", "src/styles/theme.css missing")
    decisions_path = project / "ui-decisions.yaml"
    data = None
    if decisions_path.is_file():
        try:
            data = yaml.safe_load(decisions_path.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError as error:
            report.error("J09", f"ui-decisions.yaml is not valid YAML: {str(error).splitlines()[0]}")
    if data is not None:
        known = pattern_decisions(SKILL / "patterns")
        for key in (data.get("decisions") or {}):
            if key not in known:
                report.error("J05", f"ui-decisions.yaml: unknown decision {key!r}")
        names = {path.stem for path in (SKILL / "patterns").glob("*.md")} - {"index"}
        for route, pattern in (data.get("pages") or {}).items():
            if pattern not in names:
                report.error("J07", f"ui-decisions.yaml: page {route!r} uses unknown pattern {pattern!r}")
        for index, item in enumerate(data.get("feedback") or []):
            if not isinstance(item, dict) or not item.get("said") or not item.get("change") or item.get("layer") not in FEEDBACK_LAYERS:
                report.error("J08", f"ui-decisions.yaml: feedback[{index}] needs said, change and layer ∈ {sorted(FEEDBACK_LAYERS)}")
        edited = {w.split()[1] for w in report.warnings if w.startswith("J03")}
        for target in (data.get("local_edits") or {}):
            edited.discard(target)
        report.warnings = [w for w in report.warnings if not (w.startswith("J03") and w.split()[1] not in edited)]
    elif not decisions_path.is_file():
        report.warn("J06", "ui-decisions.yaml missing (step 01 records decisions there)")
    review = project / "ui-review.md"
    if not review.is_file():
        report.warn("J10", "ui-review.md missing (step 07: review_visual.py compose, then review every composite)")
    else:
        text = review.read_text(encoding="utf-8")
        sections = re.findall(r"^## (\S+)$", text, flags=re.M)
        for route in (data or {}).get("pages") or {}:
            rx = "^" + re.sub(r":[^/]+", "[^/]+", re.escape(route).replace(r"\*", ".*").replace(r"\:", ":")) + "$"
            if not any(re.match(rx, s) for s in sections):
                report.warn("J10", f"ui-review.md: no reviewed route matches page {route!r}")
        open_items = re.findall(r"^- \[ \] .*$", text, flags=re.M)
        pending = re.findall(r"^status: pending$", text, flags=re.M)
        if open_items or pending:
            report.error("J11", f"ui-review.md: {len(open_items)} open finding(s), {len(pending)} route(s) pending review")
    return report.finish("project")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("mode", choices=["package", "patterns", "project"])
    parser.add_argument("path", type=Path)
    args = parser.parse_args(argv)
    return {"package": cmd_package, "patterns": cmd_patterns, "project": cmd_project}[args.mode](args.path.resolve())


if __name__ == "__main__":
    sys.exit(main())
