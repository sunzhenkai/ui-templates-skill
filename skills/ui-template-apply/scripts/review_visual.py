#!/usr/bin/env python3
"""Reference-based visual review (step 07).

  review_visual.py compose --base URL [--reference-base URL] [--project .] PATH[=ARCHETYPE][#STATE] [...]
      screenshot each route of your app and, when the route has an archetype, the reference page.
      .ui-review/<slug>-<width>-<theme>.png is a composite (left = implementation, right = reference).
      States that need another fixture use PATH#STATE and write only
      .ui-review/<slug>-state-<STATE>.impl.png (no reference composite).
      --reference-base is required only when a route is compared with an archetype.
      Same-url states (populated, narrow, cards, saved, dense, dark) are shot from PATH.
      Data states (empty, no-session, sessions) are shot only via #STATE.

  review_visual.py capture-reference --base URL --out DIR [--package workbench-shell]
      screenshot the reference app into DIR — for eyeballing while authoring a package
      (ui-template-design / author step 5). Never commit the output; screenshots are not
      shipped in the repo (they would bloat git history), review composes them live.

Then open every picture and go through CHECKLIST. Tick `- [x] state <name>:`.
validate_package.py project fails (J11) while any `- [ ]` or `status: pending` remains,
and fails (J10) when a declared state line is missing.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

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
    "identity: two rows with the same primary text still show a path, time, or id",
    "count: the same number is not repeated in the header and a footer or toolbar",
    "canvas: labels do not cover nodes, dark edges stay visible, and labels are capped",
    "copy: database names, file paths, and ports match the running system",
]
# Keep in step with validate_package.DEFAULT_STATES.
DEFAULT_STATES = {
    "collection": ("empty", "populated"),
    "conversation": ("no-session", "sessions"),
    "settings": ("saved",),
    "log-viewer": ("narrow",),
    "canvas": ("dense", "dark"),
}
PRODUCT_ONLY = {"canvas"}
SAME_URL_STATES = {"populated", "narrow", "cards", "saved", "dense", "dark"}
STATE_VIEWS = {
    "empty": (1280, "light"),
    "populated": (390, "light"),
    "no-session": (390, "light"),
    "sessions": (390, "light"),
    "saved": (1280, "light"),
    "narrow": (390, "light"),
    "cards": (390, "light"),
    "dense": (1280, "light"),
    "dark": (1280, "dark"),
}
STATE_HINT = {
    "empty": "空集是 EmptyState，页面上没有「共 0 项」页脚",
    "populated": "390 下至少两行；主文案相同的两行能看见路径、时间或 id",
    "no-session": "390 无会话时列表入口可见",
    "sessions": "390 有会话；同名两条能看见更新时间",
    "saved": "输入框显示已保存值；未设置才用 placeholder",
    "narrow": "390 下行内换行，计数只出现一处",
    "cards": "390 下事件是卡片，字段不被挤成一行",
    "dense": "标签不压节点，标签有上限",
    "dark": "深色连线可辨",
}


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


def route_rx(pattern: str) -> str:
    return "^" + re.sub(r":[^/]+", "[^/]+", re.escape(pattern).replace(r"\*", ".*").replace(r"\:", ":")) + "$"


def specificity(pattern: str) -> tuple[int, int, int]:
    """Literal routes before param routes before wildcards; longer first. Order in ui-decisions.yaml does not matter."""
    segs = [s for s in pattern.split("/") if s]
    return (sum(s == "*" for s in segs), sum(s.startswith(":") for s in segs), -len(segs))


def load_raw_pages(project: Path) -> dict:
    f = project / "ui-decisions.yaml"
    if not f.exists():
        return {}
    data = yaml.safe_load(f.read_text()) or {}
    raw = data.get("pages") if isinstance(data, dict) else None
    return raw if isinstance(raw, dict) else {}


def page_pattern(spec: object) -> str | None:
    if isinstance(spec, str):
        return spec
    if isinstance(spec, dict) and isinstance(spec.get("pattern"), str):
        return spec["pattern"]
    return None


def page_states(spec: object) -> list[str]:
    if isinstance(spec, dict) and "states" in spec and spec["states"] is not None:
        return [str(item) for item in spec["states"]]
    pattern = page_pattern(spec)
    return list(DEFAULT_STATES.get(pattern or "", ()))


def load_pages(project: Path) -> dict[str, str]:
    pages: dict[str, str] = {}
    for route, spec in load_raw_pages(project).items():
        pattern = page_pattern(spec)
        if isinstance(pattern, str):
            pages[str(route)] = pattern
    return pages


def pattern_for(path: str, pages: dict[str, str]) -> str | None:
    for pattern, kind in sorted(pages.items(), key=lambda item: specificity(item[0])):
        if re.match(route_rx(pattern), path):
            return kind
    return None


def archetype_for(path: str, pages: dict[str, str]) -> str | None:
    kind = pattern_for(path, pages)
    if kind is None or kind in PRODUCT_ONLY:
        return None
    return PATTERN_TO_ARCHETYPE.get(kind, "collection")


def states_for(path: str, raw: dict) -> list[str]:
    for route, spec in sorted(raw.items(), key=lambda item: specificity(str(item[0]))):
        if re.match(route_rx(str(route)), path):
            return page_states(spec)
    return []


def upsert_section(text: str, path: str, archetype: str | None, states: list[str]) -> str:
    """Ensure the route section lists every required state. New open lines flip status back to pending."""
    def line_for(name: str) -> str:
        return f"- [ ] state {name}: {STATE_HINT.get(name, name)}"

    marker = f"## {path}\n"
    if marker not in text:
        arch = archetype or "none"
        block = f"\n## {path}\narchetype: {arch}\nshots: .ui-review/{slug(path)}-*.png\nstatus: pending\n"
        body = "\n".join(line_for(name) for name in states)
        return text + block + (body + "\n" if body else "")
    start = text.index(marker) + len(marker)
    nxt = text.find("\n## ", start)
    body = text[start:] if nxt < 0 else text[start:nxt]
    missing = [line_for(name) for name in states if not re.search(rf"(?m)^- \[[ x]\] state {re.escape(name)}\b", body)]
    if not missing:
        return text
    if "status: reviewed" in body:
        body = body.replace("status: reviewed", "status: pending", 1)
    addition = "\n".join(missing) + "\n"
    if nxt < 0:
        return text[:start] + body + addition
    return text[:start] + body + addition + text[nxt:]


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


def shoot_state(browser_handle, base: str, path: str, name: str, out: Path) -> None:
    width, theme = STATE_VIEWS.get(name, (1280, "light"))
    page = new_page(browser_handle, theme)
    shot = out / f"{slug(path)}-state-{name}.impl.png"
    shoot(page, base.rstrip("/") + path, width, theme, shot, "top")
    page.context.close()
    print(shot)


def cmd_compose(args) -> int:
    project = Path(args.project).resolve()
    raw = load_raw_pages(project)
    pages = load_pages(project)
    out = project / ".ui-review"
    out.mkdir(exist_ok=True)
    review = project / "ui-review.md"
    text = review.read_text() if review.exists() else "# UI review\n\nChecklist (per composite):\n" + "".join(f"{i + 1}. {c}\n" for i, c in enumerate(CHECKLIST))
    parsed = []
    for spec in args.routes:
        raw_spec, hash_sep, state = spec.partition("#")
        path, eq, kind = raw_spec.partition("=")
        explicit = state if hash_sep else None
        pattern = pattern_for(path, pages)
        arch = kind if eq else (None if explicit else archetype_for(path, pages))
        if explicit is None and arch is None and pattern not in PRODUCT_ONLY:
            print(f"error: no archetype for {path} (add it to ui-decisions.yaml pages, pass {path}=ARCHETYPE, or pass {path}#STATE)", file=sys.stderr)
            return 2
        if arch is not None and arch not in ARCHETYPES:
            print(f"error: unknown archetype {arch!r} for {path}", file=sys.stderr)
            return 2
        parsed.append((path, arch, explicit))
    if any(arch is not None for _, arch, _ in parsed) and not args.reference_base:
        print("error: --reference-base is required when a route is compared with an archetype", file=sys.stderr)
        return 2
    ref_urls = {kind: args.reference_base.rstrip("/") + ref for kind, ref in ARCHETYPES.items()} if args.reference_base else {}
    pw, b = browser()
    composites = 0
    try:
        compared = [(path, arch) for path, arch, explicit in parsed if explicit is None and arch is not None]
        for width, theme, state in VIEWS:
            if not compared:
                break
            page = new_page(b, theme)
            for path, kind in compared:
                view = view_name(width, theme, state)
                shot = out / f"{slug(path)}-{view}.impl.png"
                shoot(page, args.base.rstrip("/") + path, width, theme, shot, state)
                ref = out / f"reference-{kind}-{view}.png"
                shoot(page, ref_urls[kind], width, theme, ref, state)
                composite = out / f"{slug(path)}-{view}.png"
                compose(shot, ref, composite, f"{path} @{view}", f"{kind} @{view}")
                print(composite)
                composites += 1
            page.context.close()
        for path, arch, explicit in parsed:
            wanted = [explicit] if explicit else [name for name in states_for(path, raw) if name in SAME_URL_STATES]
            for name in wanted:
                if name:
                    shoot_state(b, args.base, path, name, out)
    finally:
        b.close(); pw.stop()
    for path, arch, explicit in parsed:
        states = states_for(path, raw)
        if explicit and explicit not in states:
            states.append(explicit)
        label = arch or pattern_for(path, pages)
        text = upsert_section(text, path, label, states)
    review.write_text(text)
    print(f"compose: {composites} composites in {out}; record findings in {review}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    cap = sub.add_parser("capture-reference")
    cap.add_argument("--base", required=True)
    cap.add_argument("--out", required=True, help="output dir, e.g. /tmp/ref-shots (screenshots are never committed)")
    com = sub.add_parser("compose")
    com.add_argument("--base", required=True)
    com.add_argument("--reference-base",
                     help="URL of the running reference app (reference/README.md). Required only for archetype composites.")
    com.add_argument("--project", default=".")
    com.add_argument("routes", nargs="+")
    args = parser.parse_args()
    return cmd_capture(args) if args.cmd == "capture-reference" else cmd_compose(args)


if __name__ == "__main__":
    sys.exit(main())
