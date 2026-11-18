# quiet-inset

## 0.1.0 — 2026-11-18

### Added
- Initial draft. Light values sampled from reference screenshots (pure-gray neutrals, chroma 0; indigo accent H≈277).
  Borders are darker than the screenshot sample (≈#e0e0e0 vs sampled #eeeeee) because a 1px line downscaled to ~0.7px is
  blended lighter in the JPEG, and the contract requires border ≥ 1.25:1 against background and card.
- Dark values are provisional (no dark reference yet): same surface ordering, white-alpha borders, lighter brand for text.
- Optional scale tokens: `--text-2xl` (page titles), `--duration-fast` / `--duration-base` / `--ease-out`.
