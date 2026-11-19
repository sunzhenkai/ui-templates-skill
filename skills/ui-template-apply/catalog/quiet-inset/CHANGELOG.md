# quiet-inset

## 0.2.0 — 2026-11-20

### Fixed
- 同一事件里改多个 URL 参数（「清除筛选」一次清六项）时只有最后一项生效：`blocks/router` 的 `useUrlState`
  改为在微任务里合并并发更新，再一次性写回。
- 窄容器下集合页脚换行：页脚与分页控件允许整行换行，「每页 20」保持一行不拆。

## 0.1.0 — 2026-11-18

### Added
- Initial draft. Light values sampled from reference screenshots (pure-gray neutrals, chroma 0; indigo accent H≈277).
  Borders are darker than the screenshot sample (≈#e0e0e0 vs sampled #eeeeee) because a 1px line downscaled to ~0.7px is
  blended lighter in the JPEG, and the contract requires border ≥ 1.25:1 against background and card.
- Dark values are provisional (no dark reference yet): same surface ordering, white-alpha borders, lighter brand for text.
- Optional scale tokens: `--text-2xl` (page titles), `--duration-fast` / `--duration-base` / `--ease-out`.
