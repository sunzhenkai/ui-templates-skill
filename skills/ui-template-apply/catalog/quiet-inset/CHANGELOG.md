# quiet-inset

## 0.4.0 — 2026-11-20

### Changed
- 亮色 token 全量替换为参照产品的计算样式实测值（浏览器 Console 导出：resolved CSS 变量 + 全页属性频次 + 打标
  元素，issues 与 settings 两页）。中性色保留参照的微弱薰衣草色偏（chroma 0.001，hue ≈284），0.1.0 的纯灰草值
  退役。面层：shell `#efeff0`、内容面板 `#f9f9fa`、卡片白色；hover `#e9e9ea`、选中 `#e1e1e2`。
- 字号阶梯对齐实测（11/12/13/15/18/24/36）：`--text-base` 14px → 15px（参照 regular 档；实测无 14px），
  `--text-lg` 行高 22px → 23px（实测分组标题）。
- 圆角锚定实测 4/8/10/12px（sm ×0.5、md ×1、lg ×1.25、xl ×1.5、2xl ×2）。
- `--surface-shadow` 改为实测面板阴影：1px 环 `rgb(0 0 0 / 0.029)` + 柔和投影——参照靠阴影环而非边框做面层
  分隔。`--floating-shadow` 按实测同族投影放大估计（弹层未采到样本）。
- `--font-sans` 更新为实测字体栈（Inter Variable 优先）。
- 时长 token 保留（实测过渡 150ms 印证 `--duration-base`）。

### Fixed
- F-2（`library/shadcn/ui/sidebar.tsx`）：侧栏菜单项选中态不再加 `font-medium`，分组标题去掉 `font-medium`——
  实测侧栏项与分组标题均为 400（参照正文 normal 为 450，侧栏更轻）。

### 已知偏差（保持契约，实测数字记入 theme.css 头注释）
- F-1：参照边框 `#e2e2e2` 对内容底 1.23:1、对侧栏底 1.13:1，低于契约 ≥1.25——token 保持 `#dedede`
  （1.27/1.34）。参照以 1px 阴影环补偿视觉分隔。
- faint-foreground 加深 `#9c9d9f` → `#8e8e90`（实测 2.59 vs 面板；契约 ≥3.0）。
- primary/brand 加深 `#5e6ad2` → `#5d69d1`（实测 4.47 vs 面板；契约 ≥4.5）；较亮的交互靛蓝 `#6d78d5` 保留为
  `--ring`。
- 0.3.0 版本号保留给未合入的 p2 段一分支（集合页模板 + 状态矩阵），本次跳至 0.4.0。

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
