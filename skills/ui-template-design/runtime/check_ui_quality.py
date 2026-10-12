#!/usr/bin/env python3
"""Rendered UI quality checks per theme x viewport x view, with screenshots.

Checks (generic, token-driven):
  PAGE_HORIZONTAL_OVERFLOW  document scrolls horizontally
  TEXT_OVERFLOW_UNHANDLED   text overflows its box without ellipsis/line-clamp/scroll
                            (visually-hidden text <=1px, e.g. sr-only labels, is skipped)
  CONTROL_HEIGHT_MISMATCH   [data-control=<size>] height != tokens size.control.<size>
                            or size.control-height-<size> (primitive size names, e.g. default/xs)
                            (on touch viewports the expectation is >= size.touch-min)
  TOUCH_TARGET_TOO_SMALL    on touch viewports an interactive element's hit box
                            (its nearest [data-control] box) is below size.touch-min
  THEME_NOT_APPLIED         --theme-class requested but the root does not carry it

Conventions it relies on (see apply references/implementation-conventions.md):
``data-control`` sits on the element that owns the visible box and the hit area
(field wrappers forward clicks to their inner input/select).

Views: ``--view name=<action>[;<action>...]`` adds extra states after load
(actions: click:/hover:/contextmenu:<css>, press:<key>). Exit 0 when clean.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

JS = r"""
({expect, touch, mobile}) => {
  const out = {page_overflow: null, text_overflow: [], control_height: [], touch_target: []};
  const se = document.scrollingElement;
  out.page_overflow = {scrollWidth: se.scrollWidth, clientWidth: se.clientWidth, overflow: se.scrollWidth > se.clientWidth};
  const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const desc = el => (el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : '') + ' "' + (el.textContent || el.value || '').trim().slice(0, 30) + '"');
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || ['SCRIPT','STYLE','svg','path','INPUT','SELECT','OPTION','TEXTAREA'].includes(el.tagName)) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (r.width <= 1 && r.height <= 1) continue;
    const cs = getComputedStyle(el);
    const xOver = el.scrollWidth > el.clientWidth + 1;
    const yOver = el.scrollHeight > el.clientHeight + 1 && cs.overflowY !== 'visible';
    const handled = (cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible') || cs.webkitLineClamp !== 'none' || ['auto','scroll'].includes(cs.overflowX);
    if ((xOver || r.right > window.innerWidth + 1) && !handled) out.text_overflow.push({el: desc(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth});
    if (yOver && !handled) out.text_overflow.push({el: desc(el), kind: 'vertical-clip'});
  }
  for (const el of document.querySelectorAll('[data-control]')) {
    if (!visible(el)) continue;
    const h = el.getBoundingClientRect().height, want = expect[el.dataset.control];
    if (want == null) { out.control_height.push({el: desc(el), size: el.dataset.control, ok: false, reason: 'unknown size'}); continue; }
    const ok = mobile ? h >= touch - 0.5 : Math.abs(h - want) <= 0.5;
    out.control_height.push({el: desc(el), size: el.dataset.control, height: h, expected: mobile ? `>=${touch}` : want, ok});
  }
  if (mobile) for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=menuitem]')) {
    if (!visible(el)) continue;
    const box = (el.closest('[data-control]') || el).getBoundingClientRect();
    if (box.height < touch - 0.5 || box.width < touch - 0.5) out.touch_target.push({el: desc(el), w: Math.round(box.width), h: Math.round(box.height)});
  }
  return out;
}
"""


def tokens_of(instance: Path) -> dict:
    manifest = yaml.safe_load((instance / "design-system.yaml").read_text())
    return yaml.safe_load((instance / manifest["layers"]["tokens"]).read_text())["tokens"]


def act(page, spec: str) -> None:
    kind, _, arg = spec.partition(":")
    if kind == "click":
        page.click(arg, timeout=5000)
    elif kind == "hover":
        page.hover(arg, timeout=5000)
        page.wait_for_timeout(600)
    elif kind == "contextmenu":
        page.click(arg, button="right", timeout=5000)
    elif kind == "press":
        page.keyboard.press(arg)
    else:
        raise ValueError(f"unknown action {spec!r}")
    page.wait_for_timeout(200)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--instance", required=True, type=Path)
    ap.add_argument("--url", required=True)
    ap.add_argument("--viewports", default="360x900,768x1024,1280x900")
    ap.add_argument("--themes", default="light", help="comma list of color schemes, e.g. light,dark")
    ap.add_argument("--theme-class", help="root class expected when the theme is not light (e.g. dark)")
    ap.add_argument("--touch-below", type=int, default=768, help="viewports narrower than this are touch/mobile")
    ap.add_argument("--view", action="append", default=[], help="name=action[;action] extra view")
    ap.add_argument("--out", type=Path, default=Path("ui-quality"))
    args = ap.parse_args(argv)
    tok = tokens_of(args.instance)
    size = tok["size"]
    # data-control accepts keys of size.control.* and size.control-height-* (primitive size names)
    expect = {k: r["value"] for k, r in (size.get("control") or {}).items()}
    expect.update({k.removeprefix("control-height-"): r["value"] for k, r in size.items() if k.startswith("control-height-")})
    touch = tok["size"]["touch-min"]["value"]
    views = [("main", [])] + [(n, [a for a in spec.split(";") if a]) for n, _, spec in (v.partition("=") for v in args.view)]
    from playwright.sync_api import sync_playwright

    args.out.mkdir(parents=True, exist_ok=True)
    runs, errors = [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for theme in [t for t in args.themes.split(",") if t]:
            for vp in args.viewports.split(","):
                w, h = (int(x) for x in vp.split("x"))
                mobile = w < args.touch_below
                ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=mobile, is_mobile=mobile, color_scheme=theme)
                page = ctx.new_page()
                for name, actions in views:
                    page.goto(args.url, wait_until="networkidle")
                    if args.theme_class and theme != "light":
                        if not page.evaluate("(c) => document.documentElement.classList.contains(c)", args.theme_class):
                            errors.append({"code": "THEME_NOT_APPLIED", "where": f"{theme}:{w}:{name}"})
                    try:
                        for a in actions:
                            act(page, a)
                    except Exception as exc:  # noqa: BLE001
                        errors.append({"code": "VIEW_ACTION_FAILED", "where": f"{theme}:{w}:{name}", "message": str(exc).splitlines()[0]})
                        continue
                    shot = args.out / f"{theme}-{w}-{name}.png"
                    page.screenshot(path=str(shot))
                    res = page.evaluate(JS, {"expect": expect, "touch": touch, "mobile": mobile})
                    where = f"{theme}:{w}:{name}"
                    if res["page_overflow"]["overflow"]:
                        errors.append({"code": "PAGE_HORIZONTAL_OVERFLOW", "where": where})
                    errors += [{"code": "TEXT_OVERFLOW_UNHANDLED", "where": where, "el": x["el"]} for x in res["text_overflow"]]
                    errors += [{"code": "CONTROL_HEIGHT_MISMATCH", "where": where, **x} for x in res["control_height"] if not x["ok"]]
                    errors += [{"code": "TOUCH_TARGET_TOO_SMALL", "where": where, **x} for x in res["touch_target"]]
                    runs.append({"theme": theme, "width": w, "view": name, "screenshot": shot.name,
                                 "controls_checked": len(res["control_height"]), "violations": sum(1 for e in errors if e["where"] == where)})
                ctx.close()
        browser.close()
    report = {"valid": not errors, "expect": expect, "touch_min": touch, "runs": runs, "errors": errors}
    (args.out / "ui-quality-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    for e in errors[:40]:
        print("ERROR", e["code"], e["where"], e.get("el", ""))
    print("ui quality:", "PASS" if report["valid"] else "FAIL", f"{len(runs)} views", args.out)
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
