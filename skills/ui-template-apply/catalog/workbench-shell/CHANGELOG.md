# workbench-shell

## 5.0.24
- 共享 hook 跟随（quiet-inset 0.6.12 同一 patch）：`useContainerWidth` 在节点晚挂载时也能测到宽度。

## 5.0.23
- 共享组件跟随（quiet-inset 0.6.11 同一 patch）：`PaneHeader` sticky；`Split` 支持 `sidePosition="end"`
  （右侧目录栏）；`PageHeader` 支持 `inlineMax`（iconOnly 动作内联预算）。

## 5.0.22
- 共享组件跟随（quiet-inset 0.6.10 同一 patch）：`Body` 新增 `narrow`（42rem）宽度；
  `SectionLayout` 新增 `align`，设置页用 `narrow + center` 居中窄列。

## 5.0.21
- 共享组件跟随（quiet-inset 0.6.9 同一 patch）：`SectionNavItem` 支持可选 16px 图标（设置分区导航）。

## 5.0.20
- 共享组件跟随（quiet-inset 0.6.8 同一 patch）：侧栏 active 匹配改为最长前缀胜出（`blocks/router`
  新增 `pickActive`，`blocks/app-shell` 整组导航求唯一最佳匹配）——父/子路径（如 `/wiki` 与
  `/wiki/graph`）不再同时选中。

## 5.0.19
- 共享工具跟随（quiet-inset 0.6.7 同一 patch）：ESLint 新增 `no-raw-scroll-containers`；
  `contract/components.json` 与 validate P14 组件契约闸门。

## 5.0.18
- 共享组件跟随（quiet-inset 0.6.6 同一 patch）：`SheetContent` 补 `p-4`、`SheetHeader`/`SheetFooter`
  去掉自带 `p-4`——弹层内边距统一由容器提供（与 Dialog 一致）。

## 5.0.17
- 共享组件跟随（quiet-inset 0.6.5 同一 patch）：`ui/select` SelectContent 补 `p-1`。

## 5.0.16
- 共享组件跟随（quiet-inset 0.6.4 同一 patch）：`NavList`/`NavItem` 行高 28px、支持 icon 与 indent，
  NavList 去掉自带 padding（本包无消费差异，渲染影响仅限使用二级导航的页面）。

## 5.0.15
- 共享组件跟随（quiet-inset 0.6.3 同一 patch）：`ui/sidebar` MenuButton hover 改读
  `--sidebar-hover`（默认回退 `--sidebar-accent`，本包不定义新值，渲染不变）；侧栏/导航列表行间隔 2px。
- `ui/button`、`ui/badge` 的 link variant 与 `blocks/markdown` 链接去掉 hover 下划线（hover 变淡）。

## 5.0.14
- 共享 blocks 跟随（quiet-inset 0.6.2 同一 patch）：`page-header` 新增 `HeaderAction.iconOnly`（默认行为
  不变）；`surfaces` 新增 `NavList` / `NavItem` 紧凑导航组件。

## 5.0.13
- 浮层阴影接线跟随（quiet-inset 0.6.1 同一 patch）：dropdown-menu / select / popover / command
  改读 `--floating-shadow`（`shadow-lg`），与 0.6.0 实测值联动。

## 5.0.12
- 共享库基线跟随（quiet-inset 0.6.0 同一 patch）：button/input/select/switch/command 控件尺寸与圆角
  token 化（`--control-height` / `--button-radius` / `--switch-width|height` / `--command-item-height|font-size`），
  默认值保持现值，渲染不变；input/select 基础圆角改 `min(--radius-md,12px)`（本包 radius-md 亦为 8px，渲染不变）。
- `--floating-shadow` 换参照实测值（共享 token，浮层阴影加深，为两包共识语义）。

## 5.0.11
- 共享库基线跟随（quiet-inset 0.5.1 同一 patch）：`ui/sidebar` MenuButton 普通项字重 token 化
  为 `--sidebar-item-weight`（默认 400 = multica 普通项实测值，渲染不变）。本包不定义新值。

## 5.0.10
- 共享库基线跟随（quiet-inset 0.5.0 同一 patch）：`ui/sidebar` MenuButton 行高 token 化为
  `--sidebar-row-height`（默认 2rem，实测行高 32px 不变）、普通项文字色 token 化为
  `--sidebar-item-foreground`（默认回退 `--sidebar-foreground`，渲染不变）。本包不定义这两个
  token 的新值；multica 普通项实测灰 oklch(0.505)，置值留待下次校准窗口。
- 字重：本包已显式 500（5.0.9），quiet-inset 0.5.0 推翻其 0.4.0 的 400 误测后两包口径一致。

## 5.0.9
- 亮色 token 用部署实例的计算样式实测校准（my-issues + settings 两页；原 5.0.x 值取自 OSS
  tokens.css，渲染有漂移）：`--accent` 0.955 → 0.967（实测与 muted/secondary 同调）；`--destructive`
  取实测 chroma/hue、L 压至 0.515（实测 0.577 过不了 C02 tint 对 ≈3.9 < 4.5）；`--sidebar-primary`
  蓝 → 实测近黑（与 --primary 一致）；`--radius` 0.5rem → 0.625rem（实测基准 10px，md ×0.8 = 8px、
  lg 10px、xl 14px 与实测频次吻合）。
- 字体栈修正：`--font-sans` Geist → 实测 Inter 栈；`--font-mono` 实测 Geist Mono 优先。
- 文本阶梯对齐实测语义档（caption 12/16、label 13/18、body 14/20、body-lg 15/22、title 18/28）：
  `--text-sm` 行高 20→18、`--text-base` 行高 22→20、`--text-lg` 16/24 → 15/22、`--text-xl` 18/26 → 18/28。
- `ui/sidebar` 侧栏字重 token 化：新增 `--sidebar-active-weight` / `--sidebar-group-weight`
  （默认 500 = multica 实测；quiet-inset 0.4.1 置 400）。5.0.8 直接删共享文件 `font-medium` 的做法
  与 multica 语义冲突，本版纠正。
- 已知偏差（保持契约，实测数字记 theme.css 头注释）：border 实测 1.136/1.175（契约 1.25，保持
  0.905 = 1.283/1.328）；ring 实测灰 2.541（契约 3.0，保持蓝 3.524）；success 实测 4.386（契约
  4.5，保持 0.53 = 4.788）。阴影未采到样本，维持估计；dark 保持草值。

## 5.0.8
- `ui/sidebar`：侧栏菜单项选中态不再加 `font-medium`，分组标题去掉 `font-medium`（实测侧栏字重 400；
  quiet-inset 0.4.0 的 F-2 修复，共享库文件）。版本号跳过 5.0.7——该号保留给未合入的 p2 段一分支。

## 5.0.6
- `blocks/router`: `useUrlState` batches concurrent updates (one microtask flush), so changing several params in
  one handler no longer keeps only the last one.
- `blocks/data-table`: the footer and its page controls wrap as whole rows on narrow widths instead of splitting
  the page-size label from its select.

## 5.0.5
- No longer ships reference screenshots: the repo keeps no binary images (git size); step 07 composes
  the reference live via `review_visual.py compose --reference-base`. `reference/` now holds only `src/`.

## 5.0.4
- Reference screenshots retaken: collection archetype now 2400 rows (windowed).

## 5.0.3
- Reference screenshots retaken: sticky table header, collection footer wording.

## 5.0.2
- Reference screenshots retaken under the 5.3 single scroll model (canvas fixed to the viewport; -end shots keep the border intact).

## 5.0.1
- theme.css header carries the package version again (was stale at 4.0.2).

## 5.0.0
- Reference archetypes rebuilt as finished pages under `reference/src` (collection, detail, form, settings, list-detail, empty); pattern layout code moves there, 04-pages becomes "copy the archetype, swap the data".
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
