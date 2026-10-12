#!/usr/bin/env python3
"""Capture a per-primitive state matrix (state x theme x viewport) as evidence.

Default screenshots never show hover, focus, pressed, selected, disabled or open
states, so a reproduction can ship with no hover feedback, no focus ring or a
selected row identical to an unselected one and still pass token checks. This
script drives each declared state of every rendered ``[data-primitive]`` root
(see check_anatomy_conformance.py for the DOM convention), screenshots it and
compares a computed-style signature with the default state.

States: default, hover, focus-visible, active (pointer down), selected
(aria-selected/aria-current/aria-pressed/data-state=active|on|checked),
disabled (:disabled / aria-disabled), open (aria-expanded=true / data-state=open,
or present after an ``--open slug=click:<css>|hover:<css>|contextmenu:<css>|press:<key>`` action).
Other declared states are reported as ``manual`` (need scenario evidence).
Primitives with ``anatomy_exempt`` (layout containers) only need states that
are demonstrated by their children; their pointer states are reported, not gated.

Codes: STATE_NOT_DEMONSTRATED, STATE_NO_VISUAL_CHANGE, PRIMITIVE_NOT_RENDERED,
STATE_RENDER_FAILED. Exit 0 when no errors.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

AUTOMATED = ("default", "hover", "focus-visible", "active", "selected", "disabled", "open")
POINTER_STATES = {"hover", "focus-visible", "active"}
SIG_JS = r"""
(el) => {
  const pick = (n) => { const c = getComputedStyle(n); return [c.backgroundColor, c.color, c.borderColor, c.boxShadow, c.outlineStyle + c.outlineColor + c.outlineWidth, c.textDecorationLine, c.opacity, c.transform, c.scale, c.translate, c.rotate, c.fontWeight].join('|'); };
  const kids = [el, ...el.querySelectorAll('*')].slice(0, 40);
  return kids.map(pick).join('#');
}
"""
SELECTED = '[aria-selected="true"],[aria-current]:not([aria-current="false"]),[aria-pressed="true"],[data-state="active"],[data-state="on"],[data-state="checked"]'
DISABLED = ':disabled,[aria-disabled="true"],[data-disabled]'
OPEN = '[aria-expanded="true"],[data-state="open"]'


def load_primitives(instance: Path) -> list[dict[str, Any]]:
    manifest = yaml.safe_load((instance / "design-system.yaml").read_text())
    doc = yaml.safe_load((instance / manifest["layers"]["primitives"]).read_text()) or {}
    return [item for item in doc.get("items", []) if isinstance(item, dict)]


def _act(page, spec: str) -> None:
    kind, _, arg = spec.partition(":")
    if kind == "click":
        page.click(arg, timeout=5000)
    elif kind == "hover":
        page.hover(arg, timeout=5000)
        page.wait_for_timeout(600)  # tooltip open delay
    elif kind == "contextmenu":
        page.click(arg, button="right", timeout=5000)
    elif kind == "press":
        page.keyboard.press(arg)
    else:
        raise ValueError(f"unknown action {spec!r}")
    page.wait_for_timeout(250)


def run(instance: Path, url: str, viewport: str, themes: list[str], theme_class: str | None, opens: dict[str, list[str]],
        out: Path, allow: set[str]) -> dict[str, Any]:
    from playwright.sync_api import sync_playwright

    width, height = (int(x) for x in viewport.lower().split("x"))
    items = load_primitives(instance)
    errors: list[dict[str, str]] = []
    matrix: list[dict[str, Any]] = []
    out.mkdir(parents=True, exist_ok=True)

    def err(code: str, where: str, message: str) -> None:
        if where not in allow:
            errors.append({"code": code, "where": where, "message": message})

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for theme in themes:
            page = browser.new_page(viewport={"width": width, "height": height}, reduced_motion="reduce")

            page.set_default_timeout(4000)

            def fresh(slug: str) -> None:
                """Reload, apply theme, re-open the primitive's overlay, park pointer, drop focus."""
                page.goto(url, wait_until="networkidle")
                if theme_class:
                    page.evaluate("([c, on]) => document.documentElement.classList.toggle(c, on)", [theme_class, theme != "default" and theme == theme_class])
                page.mouse.move(0, height - 1)  # park the pointer first so hover-opened overlays stay open
                for spec in opens.get(slug, []):
                    try:
                        _act(page, spec)
                    except Exception as exc:  # noqa: BLE001
                        err("STATE_RENDER_FAILED", f"{theme}:{slug}:open", str(exc).splitlines()[0])
                page.evaluate("() => document.activeElement && document.activeElement !== document.body && document.activeElement.blur && document.activeElement.blur()")
                page.wait_for_timeout(50)

            for item in items:
                slug = str(item.get("id", "")).split("/", 1)[-1]
                states = [s for s in (item.get("states") or []) if isinstance(s, str)]
                container = bool(item.get("anatomy_exempt"))
                fresh(slug)
                loc = page.locator(f'[data-primitive="{slug}"]:visible')
                if loc.count() == 0:
                    if any(s in AUTOMATED for s in states):
                        err("PRIMITIVE_NOT_RENDERED", f"{theme}:{slug}", "no visible instance (add --open for overlays)")
                    continue
                plain_sel = f'[data-primitive="{slug}"]:visible:not({SELECTED}):not({DISABLED}):not(:has({SELECTED})):not(:has({DISABLED}))'

                def baseline():
                    plain = page.locator(plain_sel)
                    return plain.first if plain.count() else page.locator(f'[data-primitive="{slug}"]:visible').first

                base = baseline()

                def shot(target, state: str) -> str:
                    path = out / theme / f"{slug}--{state}.png"
                    path.parent.mkdir(parents=True, exist_ok=True)
                    try:
                        target.scroll_into_view_if_needed(timeout=3000)
                        box = target.bounding_box()
                        if box and box["width"] > 0:
                            pad = 8
                            page.screenshot(path=str(path), clip={"x": max(box["x"] - pad, 0), "y": max(box["y"] - pad, 0),
                                                                  "width": min(box["width"] + 2 * pad, width), "height": min(box["height"] + 2 * pad, height)})
                            return str(path.relative_to(out))
                    except Exception:  # noqa: BLE001
                        pass
                    return ""

                default_sig = base.evaluate(SIG_JS)
                row = {"theme": theme, "primitive": slug, "states": {}}
                row["states"]["default"] = {"result": "captured", "evidence": shot(base, "default")}
                for state in states:
                    if state == "default":
                        continue
                    where = f"{theme}:{slug}:{state}"
                    if state not in AUTOMATED:
                        row["states"][state] = {"result": "manual"}
                        continue
                    try:
                        fresh(slug)
                        base = baseline()
                        if state in POINTER_STATES:
                            if state == "hover":
                                base.hover(timeout=3000)
                            elif state == "focus-visible":
                                page.keyboard.press("Shift")
                                base.evaluate("(el) => { const f = el.matches('a,button,input,select,textarea,[tabindex]') ? el : el.querySelector('a,button,input,select,textarea,[tabindex]'); (f || el).focus(); }")
                            else:
                                base.hover(timeout=3000)
                                page.mouse.down()
                            page.wait_for_timeout(60)
                            sig = base.evaluate(SIG_JS)
                            evidence = shot(base, state)
                            if state == "active":
                                page.mouse.move(0, height - 1)
                                page.mouse.up()
                                page.keyboard.press("Escape")
                            if state == "focus-visible":
                                base.evaluate("() => document.activeElement && document.activeElement.blur()")
                            changed = sig != default_sig
                            row["states"][state] = {"result": "changed" if changed else "unchanged", "evidence": evidence}
                            if not changed and not container:
                                err("STATE_NO_VISUAL_CHANGE", where, "computed style identical to default")
                            continue
                        selector = {"selected": SELECTED, "disabled": DISABLED, "open": OPEN}[state]
                        target = page.locator(f'[data-primitive="{slug}"]:visible:is({selector}), [data-primitive="{slug}"]:visible:has({selector})')
                        if state == "open" and target.count() == 0 and opens.get(slug):
                            target = loc  # overlay exists only while open
                        if target.count() == 0:
                            row["states"][state] = {"result": "not-demonstrated"}
                            if not container:
                                err("STATE_NOT_DEMONSTRATED", where, f"no rendered instance in state {state}")
                            continue
                        sig = target.first.evaluate(SIG_JS)
                        changed = sig != default_sig or state == "open"
                        row["states"][state] = {"result": "changed" if changed else "unchanged", "evidence": shot(target.first, state)}
                        if not changed and not container:
                            err("STATE_NO_VISUAL_CHANGE", where, "computed style identical to default")
                    except Exception as exc:  # noqa: BLE001
                        row["states"][state] = {"result": "failed"}
                        err("STATE_RENDER_FAILED", where, str(exc).splitlines()[0])
                matrix.append(row)
            page.close()
        browser.close()
    html = ["<!doctype html><meta charset=utf-8><title>state matrix</title><style>body{font:12px system-ui}td{vertical-align:top;padding:4px}img{max-width:220px;display:block}</style><table>"]
    for row in matrix:
        cells = "".join(f"<td>{s}<br>{v['result']}{'<img src=' + chr(34) + v['evidence'] + chr(34) + '>' if v.get('evidence') else ''}</td>" for s, v in row["states"].items())
        html.append(f"<tr><th>{row['theme']}<br>{row['primitive']}</th>{cells}</tr>")
    (out / "index.html").write_text("".join(html) + "</table>")
    return {"valid": not errors, "viewport": viewport, "errors": errors, "matrix": matrix}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--instance", required=True, type=Path)
    parser.add_argument("--url", required=True)
    parser.add_argument("--viewport", default="1280x800")
    parser.add_argument("--themes", default="default", help="comma list, e.g. light,dark")
    parser.add_argument("--theme-class", help="root class that activates the non-default theme, e.g. dark")
    parser.add_argument("--open", action="append", default=[], help="slug=action to reveal an overlay (repeatable)")
    parser.add_argument("--allow", action="append", default=[], help="theme:slug:state accepted with a recorded reason")
    parser.add_argument("--out", type=Path, default=Path("state-matrix"))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    opens: dict[str, list[str]] = {}
    for spec in args.open:
        slug, _, action = spec.partition("=")
        opens.setdefault(slug, []).append(action)
    themes = [t.strip() for t in args.themes.split(",") if t.strip()]
    result = run(args.instance, args.url, args.viewport, themes, args.theme_class, opens, args.out, set(args.allow))
    (args.out / "state-matrix.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for e in result["errors"]:
            print(f"ERROR {e['code']} {e['where']}: {e['message']}")
        print("state matrix:", "PASS" if result["valid"] else "FAIL", f"{len(result['matrix'])} rows", args.out / "index.html")
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
