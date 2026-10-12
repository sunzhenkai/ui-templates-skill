#!/usr/bin/env python3
"""Check rendered DOM against the Active Instance primitive anatomy (generic).

Token/geometry checks cannot see a dropped icon, avatar, count or shortcut: a
nav item without its icon still has the right height, radius and color. This
check closes that gap by comparing the declared slot inventory
(core/primitives.yaml ``anatomy``) with what the page actually renders.

DOM convention (framework-neutral):
  * a primitive's root element carries ``data-primitive="<slug>"`` where
    ``<slug>`` is the primitive id without the ``primitive/`` prefix;
  * each content slot carries ``data-slot="<slot>"`` inside that root.

Input: ``--url`` (rendered with Playwright, optional ``--viewport WxH``,
repeatable ``--action click:<css>`` / ``--action press:<key>`` to reveal overlays;
hidden roots are skipped so run each relevant viewport) or ``--dom-json``
(list of {primitive, slots:[{slot, has_graphic, text}]}) for offline use.

Codes: ANATOMY_SLOT_MISSING, ANATOMY_ICON_EMPTY, ANATOMY_ORDER,
PRIMITIVE_NOT_RENDERED (only with --require-all), ANATOMY_CONTRACT_MISSING.
Exit 0 when no errors, 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

GRAPHIC_CONTENT = {"icon", "image", "indicator", "control"}

EXTRACT_JS = r"""
() => Array.from(document.querySelectorAll('[data-primitive]')).map(root => {
  const own = Array.from(root.querySelectorAll('[data-slot]')).filter(el => el.closest('[data-primitive]') === root);
  return {
    primitive: root.getAttribute('data-primitive'),
    visible: !!(root.offsetWidth || root.offsetHeight || root.getClientRects().length),
    slots: own.map(el => {
      const r = el.getBoundingClientRect();
      return {
        slot: el.getAttribute('data-slot'),
        has_graphic: !!(el.matches('svg,img,[role=img],canvas,input') || el.querySelector('svg,img,[role=img],canvas,input')
          || getComputedStyle(el).backgroundImage !== 'none' || (r.width > 0 && r.height > 0 && getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)')),
        text: ((el.textContent || '').trim() || el.value || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').slice(0, 40),
      };
    }),
  };
})
"""


def load_contract(instance: Path) -> dict[str, list[dict[str, Any]]]:
    path = instance / "core" / "primitives.yaml"
    if not path.is_file():
        manifest = instance / "design-system.yaml"
        if manifest.is_file() and yaml is not None:
            layers = (yaml.safe_load(manifest.read_text()) or {}).get("layers", {})
            if layers.get("primitives"):
                path = instance / layers["primitives"]
    if not path.is_file():
        raise SystemExit(f"primitives layer not found under {instance}")
    if yaml is None:
        raise SystemExit("PyYAML is required")
    doc = yaml.safe_load(path.read_text()) or {}
    contract: dict[str, list[dict[str, Any]]] = {}
    for item in doc.get("items", []):
        pid = str(item.get("id", ""))
        slug = pid.split("/", 1)[-1]
        anatomy = item.get("anatomy") or []
        contract[slug] = sorted((e for e in anatomy if isinstance(e, dict)), key=lambda e: e.get("order", 0))
    return contract


def check(contract: dict[str, list[dict[str, Any]]], rendered: list[dict[str, Any]], require_all: bool = False) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    seen: dict[str, int] = {}

    def add(code: str, where: str, message: str) -> None:
        errors.append({"code": code, "where": where, "message": message})

    for index, node in enumerate(rendered):
        slug = str(node.get("primitive", ""))
        where = f"[data-primitive={slug}]#{index}"
        if node.get("visible") is False:
            continue  # display:none / responsive-hidden copies are checked at the viewport where they render
        if slug not in contract:
            warnings.append({"code": "PRIMITIVE_UNKNOWN", "where": where, "message": "not declared in primitives layer"})
            continue
        seen[slug] = seen.get(slug, 0) + 1
        slots = node.get("slots") or []
        names = [s.get("slot") for s in slots]
        for entry in contract[slug]:
            slot = entry.get("slot")
            required = entry.get("required", True)
            matches = [s for s in slots if s.get("slot") == slot]
            if not matches:
                if required:
                    add("ANATOMY_SLOT_MISSING", where, f"required slot '{slot}' not rendered (data-slot={slot})")
                continue
            content = entry.get("content") or ("icon" if slot == "icon" else None)
            if content in GRAPHIC_CONTENT and not any(m.get("has_graphic") for m in matches):
                add("ANATOMY_ICON_EMPTY", where, f"slot '{slot}' expects {content} content but renders no graphic")
            if content in {"text", "number", "kbd"} and not any((m.get("text") or "").strip() for m in matches):
                add("ANATOMY_SLOT_MISSING", where, f"slot '{slot}' expects {content} but is empty")
        declared = [e.get("slot") for e in contract[slug]]
        order = [n for n in names if n in declared]
        dedup = [n for i, n in enumerate(order) if n not in order[:i]]
        expected = [d for d in declared if d in dedup]
        if dedup != expected:
            add("ANATOMY_ORDER", where, f"slot order {dedup} != declared {expected}")
    for slug, anatomy in contract.items():
        if anatomy and slug not in seen:
            entry = {"code": "PRIMITIVE_NOT_RENDERED", "where": f"primitive/{slug}", "message": "declares anatomy but no [data-primitive] instance was found"}
            (errors if require_all else warnings).append(entry)
    if not rendered:
        add("ANATOMY_CONTRACT_MISSING", "dom", "no [data-primitive] elements found; mark primitive roots and slots")
    return {"valid": not errors, "errors": errors, "warnings": warnings, "rendered": seen}


def render(url: str, viewport: str, actions: list[str], color_scheme: str = "light", theme_class: str | None = None) -> list[dict[str, Any]]:
    from playwright.sync_api import sync_playwright

    width, height = (int(x) for x in viewport.lower().split("x"))
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": width, "height": height}, color_scheme=color_scheme)
        page.goto(url, wait_until="networkidle")
        if theme_class:
            page.evaluate("(c) => document.documentElement.classList.add(c)", theme_class)
        nodes = page.evaluate(EXTRACT_JS)
        for action in actions:
            kind, _, selector = action.partition(":")
            if kind == "click":
                page.click(selector, timeout=5000)
            elif kind == "press":
                page.keyboard.press(selector)
            elif kind == "hover":
                page.hover(selector, timeout=5000)
                page.wait_for_timeout(500)
            elif kind == "contextmenu":
                page.click(selector, button="right", timeout=5000)
            else:
                raise SystemExit(f"unknown action {action!r} (use click:/hover:/contextmenu:<css> or press:<key>)")
            page.wait_for_timeout(150)
            nodes += page.evaluate(EXTRACT_JS)
        browser.close()
    return nodes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--instance", required=True, type=Path, help="Active Instance / package root")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--url")
    source.add_argument("--dom-json", type=Path)
    parser.add_argument("--viewport", default="1280x800")
    parser.add_argument("--action", action="append", default=[])
    parser.add_argument("--require-all", action="store_true")
    parser.add_argument("--color-scheme", default="light", choices=["light", "dark", "no-preference"])
    parser.add_argument("--theme-class", help="root class that activates a theme variant (tokens.themes selector)")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    contract = load_contract(args.instance)
    try:
        rendered = json.loads(args.dom_json.read_text()) if args.dom_json else render(args.url, args.viewport, args.action, args.color_scheme, args.theme_class)
    except Exception as exc:  # browser/action failure is a failed check, not a pass
        rendered = None
        result = {"valid": False, "errors": [{"code": "ANATOMY_RENDER_FAILED", "where": args.url or str(args.dom_json), "message": str(exc).splitlines()[0]}], "warnings": [], "rendered": {}}
        print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else f"ERROR ANATOMY_RENDER_FAILED: {result['errors'][0]['message']}")
        return 1
    result = check(contract, rendered, args.require_all)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for e in result["errors"]:
            print(f"ERROR {e['code']} {e['where']}: {e['message']}")
        for w in result["warnings"]:
            print(f"WARN  {w['code']} {w['where']}: {w['message']}")
        print("anatomy conformance:", "PASS" if result["valid"] else "FAIL", result["rendered"])
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
