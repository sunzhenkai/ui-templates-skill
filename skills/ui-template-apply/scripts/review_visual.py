#!/usr/bin/env python3
"""Reference-based visual review (step 07).

  review_visual.py compose --base URL --reference-base URL [--project .] PATH[=ARCHETYPE] [...]
      screenshot each route of your app and each reference archetype, then write
      .ui-review/<slug>-<width>-<theme>.png:
      left = your page, right = the reference archetype at the same size and theme.
      The archetype comes from `=ARCHETYPE` or from ui-decisions.yaml `pages:` (pattern -> archetype).
      --reference-base serves the reference app (reference/README.md); usually a second port of the
      same dev server, e.g. --base http://localhost:5173 --reference-base http://localhost:5180.
      Adds a pending section per route to ui-review.md (existing sections are kept).

  review_visual.py capture-reference --base URL --out DIR [--package workbench-shell]
      screenshot the reference app into DIR — for eyeballing while authoring a package
      (ui-template-design / author step 5). Never commit the output; screenshots are not
      shipped in the repo (they would bloat git history), review composes them live.

Then open every composite and go through CHECKLIST. Record each difference as `- [ ] ...` under its
route, fix it, re-run compose, and tick it `- [x] ...`. Set `status: reviewed` when a route has no open
findings. validate_package.py project fails (J11) while any `- [ ]` or `status: pending` remains.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ARCHETYPES = {
    "collection": "/jobs", "detail": "/jobs/demo", "form": "/jobs/new",
    "settings": "/settings/general", "list-detail": "/threads/t1", "empty": "/empty",
}
PATTERN_TO_ARCHETYPE = {
    "collection": "collection", "detail": "detail", "form": "form", "settings": "settings",
    "conversation": "list-detail", "list-detail": "list-detail", "log-viewer": "detail", "empty": "empty", "state": "empty",
}
# (width, theme, state): "end" = every scroller (document and [data-scroll-region]) scrolled to the bottom —
# catches what a top-of-page shot cannot: header/dock stay put, only declared regions scroll, canvas border still intact, the last row/message.
VIEWS = [(1280, "light", "top"), (1280, "dark", "top"), (768, "light", "top"), (1280, "light", "end")]
HEIGHT = 800
CHECKLIST = [
    "radius: frame > panel > control, one radius per level, same as reference",
    "seams: every divider runs edge to edge and meets the frame/header rule; no gaps, no double lines",
    "alignment: header, body and panels share left/right edges; columns line up",
    "spacing rhythm: same gaps between header/toolbar/content/sections as reference",
    "hierarchy: one title, one primary action, secondary text muted",
    "density: row height, control size and font size match reference",
    "contrast: borders, separators and muted text visible in light and dark",
    "truncation: nothing clipped or overflowing; long text truncates with ellipsis",
    "scroll (-end shot): header and dock stay put, only the declared region moved, last item fully visible, canvas border/radius/margin intact on all four sides, table header stuck to the region top",
    "collection footer: the count is the server total or 'loaded n / total m', never the loaded count posing as the total",
    "controls: typed text is foreground colour, placeholder readable, only disabled controls are dimmed",
]


def shoot(page, url: str, width: int, theme: str, out: Path, state: str = "top") -> None:
    page.set_viewport_size({"width": width, "height": HEIGHT})
    page.goto(url, wait_until="networkidle")
    page.evaluate(f"document.documentElement.classList.toggle('dark', {'true' if theme == 'dark' else 'false'})")
    if state == "end":
        # detach auto-load sentinels first so the shot shows the real footer (count + load more), not an endless feed
        page.evaluate("document.querySelectorAll('[data-load-more=sentinel]').forEach((el) => el.remove())")
        page.evaluate("for (const el of [document.scrollingElement, ...document.querySelectorAll('[data-scroll-region]')]) el.scrollTop = el.scrollHeight")
    page.wait_for_timeout(250)
    page.screenshot(path=str(out))


def view_name(width: int, theme: str, state: str) -> str:
    return f"{width}-{theme}" + ("-end" if state == "end" else "")


def browser():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    return pw, pw.chromium.launch()


def new_page(b, theme: str):
    ctx = b.new_context(color_scheme="dark" if theme == "dark" else "light")
    ctx.add_init_script(f"try{{localStorage.setItem('ui-theme','{theme}')}}catch(e){{}}")
    return ctx.new_page()


def slug(path: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", path).strip("_") or "root"


def load_pages(project: Path) -> dict[str, str]:
    pages: dict[str, str] = {}
    f = project / "ui-decisions.yaml"
    if not f.exists():
        return pages
    inside = False
    for line in f.read_text().splitlines():
        if re.match(r"^pages:\s*$", line):
            inside = True
            continue
        if inside:
            m = re.match(r"^\s+(\S+):\s*([\w-]+)", line)
            if m:
                pages[m.group(1)] = m.group(2)
            elif line.strip() and not line.startswith((" ", "\t")):
                inside = False
    return pages


def specificity(pattern: str) -> tuple[int, int, int]:
    """Literal routes before param routes before wildcards; longer first. Order in ui-decisions.yaml does not matter."""
    segs = [s for s in pattern.split("/") if s]
    return (sum(s == "*" for s in segs), sum(s.startswith(":") for s in segs), -len(segs))


def archetype_for(path: str, pages: dict[str, str]) -> str | None:
    for pattern, kind in sorted(pages.items(), key=lambda item: specificity(item[0])):
        rx = "^" + re.sub(r":[^/]+", "[^/]+", re.escape(pattern).replace(r"\*", ".*").replace(r"\:", ":")) + "$"
        if re.match(rx, path):
            return PATTERN_TO_ARCHETYPE.get(kind, "collection")
    return None


def cmd_capture(args) -> int:
    if not args.out:
        print("error: --out is required (e.g. /tmp/ref-shots) — screenshots are never committed", file=sys.stderr)
        return 2
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pw, b = browser()
    try:
        for width, theme, state in VIEWS:
            page = new_page(b, theme)
            for name, path in ARCHETYPES.items():
                shoot(page, args.base.rstrip("/") + path, width, theme, out / f"{name}-{view_name(width, theme, state)}.png", state)
            page.context.close()
    finally:
        b.close(); pw.stop()
    print(f"reference: {len(ARCHETYPES) * len(VIEWS)} screenshots in {out}")
    return 0


def compose(impl: Path, ref: Path, out: Path, left: str, right: str) -> None:
    from PIL import Image, ImageDraw
    a, r = Image.open(impl).convert("RGB"), Image.open(ref).convert("RGB")
    bar, gap = 28, 12
    w, h = a.width + gap + r.width, max(a.height, r.height) + bar
    img = Image.new("RGB", (w, h), (255, 0, 255))
    img.paste(a, (0, bar)); img.paste(r, (a.width + gap, bar))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, bar], fill=(20, 20, 20))
    d.text((8, 8), f"IMPLEMENTATION  {left}", fill=(255, 255, 255))
    d.text((a.width + gap + 8, 8), f"REFERENCE  {right}", fill=(255, 255, 255))
    img.save(out)


def cmd_compose(args) -> int:
    if not args.reference_base:
        print("error: --reference-base is required — start the reference app (reference/README.md) and pass its URL", file=sys.stderr)
        return 2
    project = Path(args.project).resolve()
    pages = load_pages(project)
    out = project / ".ui-review"
    out.mkdir(exist_ok=True)
    review = project / "ui-review.md"
    text = review.read_text() if review.exists() else "# UI review\n\nChecklist (per composite):\n" + "".join(f"{i + 1}. {c}\n" for i, c in enumerate(CHECKLIST))
    routes = []
    for spec in args.routes:
        path, _, kind = spec.partition("=")
        kind = kind or archetype_for(path, pages)
        if kind not in ARCHETYPES:
            print(f"error: no archetype for {path} (add it to ui-decisions.yaml pages or pass {path}=ARCHETYPE)", file=sys.stderr)
            return 2
        routes.append((path, kind))
    ref_urls = {kind: args.reference_base.rstrip("/") + path for kind, path in ARCHETYPES.items()}
    pw, b = browser()
    try:
        for width, theme, state in VIEWS:
            page = new_page(b, theme)
            for path, kind in routes:
                view = view_name(width, theme, state)
                shot = out / f"{slug(path)}-{view}.impl.png"
                shoot(page, args.base.rstrip("/") + path, width, theme, shot, state)
                ref = out / f"reference-{kind}-{view}.png"
                shoot(page, ref_urls[kind], width, theme, ref, state)
                composite = out / f"{slug(path)}-{view}.png"
                compose(shot, ref, composite, f"{path} @{view}", f"{kind} @{view}")
                print(composite)
            page.context.close()
    finally:
        b.close(); pw.stop()
    for path, kind in routes:
        if f"\n## {path}\n" not in text:
            text += f"\n## {path}\narchetype: {kind}\ncomposites: .ui-review/{slug(path)}-*.png\nstatus: pending\n"
    review.write_text(text)
    print(f"compose: {len(routes) * len(VIEWS)} composites in {out}; record findings in {review}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    cap = sub.add_parser("capture-reference")
    cap.add_argument("--base", required=True)
    cap.add_argument("--out", required=True, help="output dir, e.g. /tmp/ref-shots (screenshots are never committed)")
    com = sub.add_parser("compose")
    com.add_argument("--base", required=True)
    com.add_argument("--reference-base", required=True,
                     help="URL of the running reference app (reference/README.md), e.g. http://localhost:5180")
    com.add_argument("--project", default=".")
    com.add_argument("routes", nargs="+")
    args = parser.parse_args()
    return cmd_capture(args) if args.cmd == "capture-reference" else cmd_compose(args)


if __name__ == "__main__":
    sys.exit(main())
