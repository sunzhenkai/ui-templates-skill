#!/usr/bin/env python3
"""Render pages in Chromium and check what only the browser can see.

  check_rendered.py URL [URL ...] [--widths 1280,768,390] [--themes light,dark] [--row-height 36]
                    [--json out.json] [--shots DIR]

Codes (error unless noted):
  R01 page scrolls horizontally          R05 control without accessible name
  R02 nested vertical scroll container   R06 text contrast below AA
  R03 text clipped without ellipsis      R07 not exactly one h1
  R04 touch target < 24px                R08 console error / page error
  R09 (warn) table row height differs from density (tables inside [data-prose] — Markdown content — are skipped by R09/R11)
  R10 dev-server error overlay on the page (e.g. unresolved import) — always run against `npm run dev` too
  R11 (warn) adjacent regions not separated: side-by-side panes or a table with the same background,
      no border between them and almost no gap
  R12 more than one corner radius among panels ([data-surface=panel]) or panel radius >= frame radius
  R13 seam gap: a split side column does not span its split, or the split does not reach the frame bottom
      / start right under the page header (dividers must meet the edges they separate)
  R14 sibling panels in one column do not share left/right edges
  R15 scroll ownership: on a viewport page ([data-layout=viewport]) the document or frame scrolls, or a
      [data-scroll-region] grows instead of scrolling when stressed with long content
  R16 form control: enabled input text < 4.5 (counting ancestor opacity) or placeholder < 3.0
R08 ignores HTTP 404 resource errors on pages that render the not-found state ([data-state=not-found]).
Theme is switched by toggling the `dark` class on <html> (blocks/theme contract).
Elements inside [role=log], [role=dialog], pre, textarea, [data-scroll-region] or [data-scroll-ok] may scroll.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

PROBE = r"""
(rowHeight) => {
  const out = []
  const desc = (el) => {
    const id = el.id ? '#' + el.id : ''
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`
  }
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const exempt = (el) => el.closest('[role=log],[role=dialog],[role=alertdialog],[role=listbox],[role=menu],pre,textarea,[data-scroll-ok],[data-scroll-region],[data-sidebar=content],[data-radix-popper-content-wrapper]')
  const doc = document.documentElement
  if (doc.scrollWidth > doc.clientWidth + 1) out.push(['R01', `document scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}`])
  const all = Array.from(document.body.querySelectorAll('*'))
  for (const el of all) {
    const s = getComputedStyle(el)
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1 && !exempt(el) && visible(el))
      out.push(['R02', desc(el)])
  }
  for (const el of all) {
    if (!visible(el) || exempt(el) || el.getBoundingClientRect().width <= 1) continue
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!hasText) continue
    const s = getComputedStyle(el)
    if ((s.overflowX === 'hidden' || s.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis' && !el.title)
      out.push(['R03', desc(el)])
  }
  const controls = Array.from(document.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, [role=tab], [role=menuitem], [role=checkbox], [role=switch]'))
  const rects = controls.filter(visible).map((el) => [el, el.getBoundingClientRect()])
  for (const el of controls) {
    if (!visible(el) || el.closest('[aria-hidden=true],[data-sidebar=rail]')) continue
    const r = el.getBoundingClientRect()
    const inlineLink = el.tagName === 'A' && getComputedStyle(el).display === 'inline'
    const labelledBy = el.id && document.querySelector(`label[for="${el.id}"]`)
    if (r.width < 24 || r.height < 24) {
      // WCAG 2.5.8 spacing exception: a 24px circle on the target's center overlaps no other target
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const crowded = rects.some(([o, q]) => o !== el && !o.contains(el) && !el.contains(o) && q.left < cx + 12 && q.right > cx - 12 && q.top < cy + 12 && q.bottom > cy - 12)
      if (!inlineLink && !labelledBy && crowded) out.push(['R04', `${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`])
    }
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '').trim()
    const labelled = el.getAttribute('aria-labelledby') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label') || el.placeholder
    if (!name && !labelled) out.push(['R05', desc(el)])
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rgba = (color) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
  const parseAlpha = (color) => { const m = /\/\s*([\d.]+)(%?)\s*\)$/.exec(color) || /rgba\([^)]*,\s*([\d.]+)\)$/.exec(color); return m ? parseFloat(m[1]) / (m[2] ? 100 : 1) : (color === 'transparent' ? 0 : 1) }
  const bgOf = (el) => {
    const layers = []
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor
      const a = parseAlpha(c)
      if (a > 0) { layers.push([rgba(c), a]); if (a >= 1) break }
    }
    let acc = [255, 255, 255]
    for (const [c, a] of layers.reverse()) acc = acc.map((v, i) => c[i] * a + v * (1 - a))
    return acc
  }
  const opacityOf = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o }
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const seen = new Set()
  for (const el of all) {
    if (!visible(el)) continue
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!hasText || el.closest('[disabled],[aria-disabled=true],[data-disabled]')) continue
    const s = getComputedStyle(el)
    const bg = bgOf(el)
    const fgRaw = rgba(s.color); const fa = parseAlpha(s.color) * opacityOf(el)
    const fg = fgRaw.slice(0, 3).map((v, i) => v * fa + bg[i] * (1 - fa))
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
    const ratio = (hi + 0.05) / (lo + 0.05)
    const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && parseInt(s.fontWeight) >= 700)
    const min = large ? 3 : 4.5
    if (ratio < min) { const d = desc(el); if (!seen.has(d)) { seen.add(d); out.push(['R06', `${d} ${ratio.toFixed(2)} < ${min}`]) } }
  }
  const h1 = Array.from(document.querySelectorAll('h1')).filter(visible).length
  if (h1 !== 1) out.push(['R07', `${h1} visible h1`])
  if (rowHeight > 0) {
    for (const tr of document.querySelectorAll('tbody tr')) {
      if (tr.closest('[data-prose]')) continue
      const h = tr.getBoundingClientRect().height
      if (visible(tr) && Math.abs(h - rowHeight) > 4 && tr.cells.length > 1) { out.push(['R09', `row ${Math.round(h)}px vs ${rowHeight}px: ${desc(tr.cells[0])}`]); break }
    }
  }
  if (document.querySelector('vite-error-overlay, nextjs-portal, #webpack-dev-server-client-overlay')) out.push(['R10', 'dev-server error overlay is shown'])
  const bgKey = (el) => bgOf(el).map(Math.round).join(',')
  const ruled = (el, side) => { for (let n = el, i = 0; n && i < 3; n = n.parentElement, i++) { const w = parseFloat(getComputedStyle(n)[`border${side}Width`]); if (w > 0 && getComputedStyle(n)[`border${side}Style`] !== 'none') return true; if (n.parentElement && n.parentElement.children.length > 1) break } return false }
  const scope = document.querySelector('[data-slot=sidebar-inset], main') || document.body
  for (const el of scope.querySelectorAll('*')) {
    const next = el.nextElementSibling
    if (!next || !visible(el) || !visible(next)) continue
    const a = el.getBoundingClientRect(), b = next.getBoundingClientRect()
    if (a.height < 160 || b.height < 160 || a.width < 120 || b.width < 120 || b.left < a.right - 1) continue
    if (b.left - a.right >= 24 || bgKey(el) !== bgKey(next) || ruled(el, 'Right') || ruled(next, 'Left')) continue
    out.push(['R11', `panes ${desc(el).slice(0, 60)} | ${desc(next).slice(0, 60)}`]); break
  }
  for (const t of scope.querySelectorAll('table')) {
    if (!visible(t) || t.rows.length < 2 || t.closest('[data-prose]')) continue
    let framed = false
    for (let n = t, i = 0; n && n !== scope && i < 6; n = n.parentElement, i++) { const s = getComputedStyle(n); if (parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderLeftWidth) > 0) { framed = true; break } }
    if (!framed && bgKey(t) === bgKey(scope)) { out.push(['R11', `table without frame: ${desc(t).slice(0, 60)}`]); break }
  }
  const px = (v) => parseFloat(v) || 0
  const frame = document.querySelector('[data-surface=frame]')
  const panels = Array.from(document.querySelectorAll('[data-surface=panel]')).filter(visible)
  const radii = new Set(panels.map((el) => px(getComputedStyle(el).borderTopLeftRadius)))
  if (radii.size > 1) out.push(['R12', `panel radii ${[...radii].join('/')}px`])
  if (frame && panels.length && Math.max(...radii) >= px(getComputedStyle(frame).borderTopLeftRadius) && window.innerWidth >= 768) out.push(['R12', `panel radius ${Math.max(...radii)}px >= frame radius`])
  for (const split of document.querySelectorAll('[data-surface=split]')) {
    if (!visible(split)) continue
    const r = split.getBoundingClientRect()
    const side = split.querySelector(':scope > [data-surface=split-side]')
    if (side && visible(side)) {
      const q = side.getBoundingClientRect()
      const beside = q.right <= r.left + q.width + 1 && q.height < r.height - 1 && getComputedStyle(split).display === 'grid'
      if (beside) out.push(['R13', `split side ${Math.round(q.height)}px < split ${Math.round(r.height)}px`])
    }
    if (frame && window.innerWidth >= 768) {
      const f = frame.getBoundingClientRect()
      const docBottom = Math.max(f.bottom, r.bottom)
      if (f.bottom - r.bottom > 1.5 && r.bottom < docBottom) out.push(['R13', `split ends ${Math.round(f.bottom - r.bottom)}px above the frame bottom`])
      const header = frame.querySelector('header')
      if (header && r.top - header.getBoundingClientRect().bottom > 1.5 && r.top > header.getBoundingClientRect().bottom) out.push(['R13', `split starts ${Math.round(r.top - header.getBoundingClientRect().bottom)}px below the header rule`])
    }
  }
  const byParent = new Map()
  for (const el of panels) { const k = el.parentElement; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(el) }
  for (const group of byParent.values()) {
    const rs = group.map((el) => el.getBoundingClientRect()).filter((q, i, all) => all.every((o) => o === q || o.top >= q.bottom || o.bottom <= q.top || true))
    const stacked = rs.filter((q) => rs.every((o) => o === q || Math.abs(o.left - q.left) < q.width / 2))
    if (stacked.length > 1 && stacked.some((q) => Math.abs(q.left - stacked[0].left) > 1 || Math.abs(q.right - stacked[0].right) > 1)) out.push(['R14', `${stacked.length} stacked panels with different edges`])
  }
  // R15 scroll ownership: a viewport page never scrolls the document or the frame; its declared regions do,
  // even with long content (stress: 3000px appended to every region).
  const vframe = document.querySelector('[data-surface=frame]')
  if (document.querySelector('[data-layout=viewport]')) {
    const regions = Array.from(document.querySelectorAll('[data-scroll-region]')).filter(visible)
    const fill = regions.map((r) => { const d = document.createElement('div'); d.style.height = '3000px'; d.style.flexShrink = '0'; r.appendChild(d); return d })
    const se = document.scrollingElement
    if (se.scrollHeight > innerHeight + 1) out.push(['R15', `viewport page: document scrolls (${se.scrollHeight} > ${innerHeight}) under long content`])
    if (vframe && vframe.scrollHeight > vframe.clientHeight + 1 && getComputedStyle(vframe).overflowY !== 'visible') out.push(['R15', 'viewport page: frame scrolls'])
    for (const r of regions) if (r.scrollHeight <= r.clientHeight + 1) out.push(['R15', `region ${r.dataset.scrollRegion} does not scroll its long content (grows instead)`])
    fill.forEach((d) => d.remove())
    if (regions.length === 0) out.push(['R15', 'viewport page without [data-scroll-region]'])
  }
  // R16 form-control colours: typed text >= 4.5 against the control background including every ancestor's
  // opacity (an enabled control must never be dimmed); placeholder >= 3.0 (a hint, but readable).
  const ratioOf = (color, el, bg) => { const a = parseAlpha(color) * opacityOf(el); const c = rgba(color).slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a)); const [hi, lo] = [lum(c), lum(bg)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true]')) {
    if (!visible(el) || el.disabled || el.readOnly || el.closest('[aria-disabled=true]')) continue
    const bg = bgOf(el)
    const v = ratioOf(getComputedStyle(el).color, el, bg)
    if (v < 4.5) out.push(['R16', `${desc(el)} text ${v.toFixed(2)} < 4.5 (opacity ${opacityOf(el).toFixed(2)})`])
    if (el.placeholder) { const ph = ratioOf(getComputedStyle(el, '::placeholder').color, el, bg); if (ph < 3) out.push(['R16', `${desc(el)} placeholder ${ph.toFixed(2)} < 3`]) }
  }
  return out
}
"""
WARN = {"R09", "R11"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("urls", nargs="+")
    parser.add_argument("--widths", default="1280,768,390")
    parser.add_argument("--themes", default="light,dark")
    parser.add_argument("--row-height", type=int, default=36)
    parser.add_argument("--json", type=Path)
    parser.add_argument("--shots", type=Path)
    parser.add_argument("--wait", default="networkidle")
    args = parser.parse_args(argv)
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for url in args.urls:
            for width in (int(w) for w in args.widths.split(",")):
                for theme in args.themes.split(","):
                    page = browser.new_page(viewport={"width": width, "height": 900})
                    errors: list[str] = []
                    page.on("console", lambda m, errors=errors: errors.append(m.text) if m.type == "error" else None)
                    page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
                    page.add_init_script(f"try{{localStorage.setItem('ui-theme','{theme}')}}catch(e){{}}")
                    page.goto(url, wait_until=args.wait)
                    page.evaluate(f"document.documentElement.classList.toggle('dark', {'true' if theme == 'dark' else 'false'})")
                    page.wait_for_timeout(250)
                    findings = [list(f) for f in page.evaluate(PROBE, args.row_height)]
                    if page.evaluate("!!document.querySelector('[data-state=not-found]')"):
                        errors = [e for e in errors if "status of 404" not in e]
                    findings += [["R08", e[:200]] for e in errors]
                    if args.shots is not None:
                        args.shots.mkdir(parents=True, exist_ok=True)
                        slug = url.split("://", 1)[-1].split("/", 1)[-1].replace("/", "_").replace("?", "_") or "root"
                        page.screenshot(path=str(args.shots / f"{slug}-{width}-{theme}.png"), full_page=True)
                    results.append({"url": url, "width": width, "theme": theme, "findings": findings})
                    page.close()
        browser.close()
    errors = 0
    for r in results:
        for code, detail in r["findings"]:
            level = "warn " if code in WARN else "ERROR"
            errors += code not in WARN
            print(f"{level} {code} {r['url']} @{r['width']} {r['theme']}: {detail}")
    print(f"check_rendered: {len(results)} view(s), {errors} error(s)")
    if args.json is not None:
        args.json.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
