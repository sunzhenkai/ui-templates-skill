# workbench-shell

## 5.0.4
- Reference screenshots retaken: collection archetype now 2400 rows (windowed).

## 5.0.3
- Reference screenshots retaken: sticky table header, collection footer wording.

## 5.0.2
- Reference screenshots retaken under the 5.3 single scroll model (canvas fixed to the viewport; -end shots keep the border intact).

## 5.0.1
- theme.css header carries the package version again (was stale at 4.0.2).

## 5.0.0
- Ships reference screenshots (`reference/<archetype>-<1280|768>-<light|dark>.png`) of the six reference archetypes under this theme; `review_visual.py` composes them next to the implementation.
- Requires the 5.0 library (surfaces; `PageBody` removed).

## 4.0.2
- `--border` strengthened (light `oklch(0.905 0.004 286.3)`, dark 12% white) so region rules read in both themes (≥1.25 on background and card).
- Default `collection.frame: bordered`.

## 4.0.1
- Light `--destructive` darkened to `oklch(0.52 0.21 27.3)`: text on its own 10% tint (destructive button/badge) now ≥4.5 (was 3.9). Caught by new validator check C02.

## 4.0.0
- Rebuilt on the shadcn registry (radix base, nova style). A package now carries only style: `theme.css` + `meta.yaml` defaults.
- Palette mapped from an open-source workbench (neutral zinc-like grays, blue 255° accent ramp); blue restricted to focus/links/selection/charts.
- Compact density via `--text-sm: 13px`; nova controls already 32px.
- Removed v3 tokens.yaml / design-system.yaml / fidelity / measured expectations (superseded by theme contract + check_rendered).
