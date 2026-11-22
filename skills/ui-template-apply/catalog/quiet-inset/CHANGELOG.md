# quiet-inset

## 0.6.12 — 2026-11-22

### Fixed
- `blocks/use-container-width`：`ResizeObserver` 的 layout effect 由空依赖改为跟随 `node`——观察目标在
  加载态之后才挂载（`ref` 第一次为 null）时，旧实现只观察一次 null、宽度永远为 0，依赖它的布局决策
  （容器折叠、右栏显隐）全部失效。挂载后再渲染即可测得宽度。

## 0.6.11 — 2026-11-22

### Fixed
- `blocks/list-detail`：`PaneHeader` 改 sticky（`sticky top-0 z-10 bg-background`）——主从布局里 pane 本身是
  滚动容器，列表一长标题行会被滚走（会话列表、Wiki 页面列表）。

### Added
- `blocks/surfaces`：`Split` 新增 `sidePosition`（默认 `start`）——`end` 把侧栏放到主列之后（文档右侧目录栏），
  分割线改画在侧栏左缘；窄屏堆叠时侧栏仍在前，向后兼容。
- `blocks/page-header`：新增 `inlineMax`（默认 2）——内联预算可提高，但仅用于 iconOnly 且语义明确的动作
  （文档阅读页的信息/反链/历史图标）；destructive 仍恒进溢出菜单。

## 0.6.10 — 2026-11-22

### Added
- `blocks/surfaces`：`Body` 新增 `width="narrow"`（max-w-2xl，42rem）——设置类居中窄列的标准宽度。
- `blocks/section-nav`：`SectionLayout` 新增 `align`（默认 `start`，向后兼容）；设置页用
  `width="narrow" align="center"` 得到「导航 + 居中窄列」形态。参考原型 settings 已切换为该形态，
  pattern 规则同步（分区内容 ≤ 42rem 且居中）。

## 0.6.9 — 2026-11-22

### Added
- `blocks/section-nav`：`SectionNavItem` 新增可选 `icon`（16px，与侧栏 NavItem 同一视觉语言；无图标仍为
  纯文字），参考原型 settings 的分区导航带图标。多分区页面（设置等）用 SectionLayout 做二级导航时，
  导航项可与侧栏保持同一套 icon+文字表达。

## 0.6.8 — 2026-11-22

### Fixed
- **侧栏父/子路径重复选中**：`useIsActive` 前缀匹配下，路径 `/wiki/graph` 同时命中导航项 `/wiki`（前缀）
  与 `/wiki/graph`（相等），两项同时高亮。`blocks/router` 拆出 `isActivePath`（纯判定）并新增 `pickActive`
  （候选中最长匹配胜出）；`blocks/app-shell` 改为整组导航先求唯一最佳匹配，再按 `to` 分发 `active`——
  父项与子项不再同时选中，深层子路由仍只点亮所属父项。

## 0.6.7 — 2026-11-21

### Added
- `contract/components.json` + validate P14：组件实现契约登记（button/input/select/switch/command/
  浮层/Sheet/sidebar/导航/markdown 各自必须保留的 token 与类）。今后任何「h-8 写死、shadow-md 回退、
  容器 padding 丢失」在 package 校验即报错，而不是等生产观感暴露。
- ESLint 新规则 `no-raw-scroll-containers`：页面原生元素（div/section/…）禁用 overflow 滚动类——
  滚动区域必须用 ScrollRegion/Body/Split/Sheet 容器，从源头杜绝「自建滚动容器无 padding」类缺陷。

## 0.6.6 — 2026-11-21

### Fixed
- **弹层 padding 契约不一致**：`DialogContent` 有 `p-4` 而 `SheetContent` 没有，Sheet 内部靠
  `SheetHeader`/`SheetFooter` 自带的 p-4 撑场面——页面把带边框 Panel 放进 Sheet 内容区时直接贴抽屉边缘
  （详情抽屉的「内容与边框紧贴」bug）。`SheetContent` 补 `p-4`（与 Dialog 对齐），
  `SheetHeader`/`SheetFooter` 去掉各自 `p-4` 避免双 padding；特殊用法（pane sheet）用 `p-0` 覆盖不受影响。
- 文件头补弹层 padding 契约注释（容器负责内边距，内容块不写）。

## 0.6.5 — 2026-11-21

### Fixed
- `ui/select`：SelectContent 补 `p-1`（与 DropdownMenuContent 一致）——此前选项容器无内边距，
  选中/聚焦背景块左右贴菜单边框。
- `blocks/surfaces`：Split 注释补「内边距契约」——main 列无 padding，内容必须自带（Body 或全幅
  surface）；带边框 Panel 直接塞进 main 会与分隔线/header 线相邻形成双线。

## 0.6.4 — 2026-11-21

### Changed
- `blocks/surfaces` NavList/NavItem 对齐一级导航：行高 28px（sidebar 同）、支持 `icon`
  （16px 前导图标）与 `indent`（大纲层级缩进）；NavList 去掉自带 padding（容器负责边距，
  页面内二级导航不再需要 Panel 卡片包裹）。设计原则：一个层级一种导航外观（icon + 文字）。

## 0.6.3 — 2026-11-21

### Fixed
- **列表项 hover / 选中浓度差与行间隔（机制）**：`ui/sidebar` MenuButton 的 hover 与选中态原共用
  `--sidebar-accent`，同色无从区分；`SidebarMenu` 行间 `gap-0` 使相邻高亮块粘连。新增 `--sidebar-hover`
  token（light 0.935 / dark 0.21，hover 比选中浅一档，参照实测 hover #e4e4e5 vs 选中 #e1e1e2），
  MenuButton hover 改读该 token（默认回退 `--sidebar-accent`）；`SidebarMenu` 与 `NavList` 行间隔
  改 2px。
- **链接下划线机制**：`blocks/markdown` 正文链接从常驻 `underline` 改为默认 primary + hover 变淡；
  `ui/button` / `ui/badge` 的 link variant、`blocks/log-view` 的展开按钮同步去掉 hover 下划线。
  设计原则：不用下划线表达可点击，hover 用颜色/面变化（ui-kit language.md §7）。

## 0.6.2 — 2026-11-21

### Added
- `blocks/page-header`：`HeaderAction.iconOnly` —— 图标语义明确（刷新/归档/导出/更多）时图标按钮渲染，
  `aria-label`/`title` 取动作名；不明确的自定义动作保持 icon + 文字（设计原则见 ui-kit language.md §7）。
- `blocks/surfaces`：`NavList` / `NavItem` —— 页面内二级导航（帮助目录、文档大纲、设置分组）用紧凑菜单
  节奏（32px 行、hover/active 面、无分隔线），不再用表格行 `Rows` 冒充导航。

## 0.6.1 — 2026-11-21

### Fixed
- 浮层阴影接线缺口：dropdown-menu / select / popover / command 面板此前用 tailwind `shadow-md`
  （默认深灰投影），未接 theme 的 `--floating-shadow`（`--shadow-lg` 映射）。全部改 `shadow-lg`，
  0.6.0 的实测浮层阴影至此真正作用到消费端（wiki.lan 线上复核发现主题菜单仍为 shadow-md）。
- workbench-shell 5.0.13 基线跟随（浮层阴影统一加深，为共享语义）。

## 0.6.0 — 2026-11-21

### Changed
- **全组件校准**（参照产品四页 computed-style 采样：documents/activity、settings、agent、command palette）：
  - `--floating-shadow` 换实测值（`0.08 0 9px 48px, 0.1 0 6px 24px`）——0.4.0 的估计值明显偏轻，浮层（command 面板）
    阴影加深。
  - 控件档位修正：参照控件高 28px（search 28 / combobox 30 / 主按钮 28）、圆角 8px（输入类）、按钮 pill 形。
    共享库新增 `--control-height`（默认 2rem）、`--button-radius`（默认 `var(--radius-lg)`）；
    input/select 基础圆角改 `min(--radius-md,12px)`（=8px，两包一致）。
  - switch 尺寸 token 化：`--switch-width` / `--switch-height`（默认 32px / 18.4px），本包置 30px / 20px。
  - command 菜单项 token 化：`--command-item-height` / `--command-item-font-size`（默认 2.125rem / 0.875rem），
    本包置 46px / 15px，水平内边距 px-2 → px-3。
- meta.yaml 声明的「controls 28px」至此落地（与 0.5.0 的 sidebar rows 28px 同类修正）。

### Notes
- 保留：0.5px hairline（契约对比度，见 F-1）、正文 450 字重档（token 阶梯无此档）、卡片 12px 圆角
  （参照示例卡 8px 属内容卡，静待内容卡专项）。
- 按钮 pill 化是本包按钮语义的一部分（参照主/次/自定义按钮均 pill）。

## 0.5.1 — 2026-11-20

### Changed
- 补 0.5.0 遗漏：普通项字重 token 化。0.5.0 的 `--sidebar-active-weight` 只覆盖选中态，
  普通项仍继承 body 400；参照复测普通项（Inbox 等）内部文字同为 13px/500。共享库新增
  `--sidebar-item-weight`（默认 400，跟随 workbench-shell 参照的 multica 普通项实测），本包置 500。

## 0.5.0 — 2026-11-20

### Changed
- **F-2 推翻重定案**：0.4.0 的「实测侧栏项与分组标题均 400」来自容器级 picks（`<a>`/`<button>`
  继承 body 的 16px/400），漏读内部文字 span。2026-11-20 对参照产品复测（内部文字直读）：
  侧栏项普通与选中态均为 13px/**500**、分组标题 12px/**500**。`--sidebar-active-weight` 与
  `--sidebar-group-weight` 400 → 500；密度注释「group titles 15px」同步纠正为 12px。
- 侧栏行高落地：meta.yaml 一直声明「sidebar rows 28px」，但共享库 MenuButton 默认 `h-8`(32px)
  从未兑现。共享文件 token 化为 `--sidebar-row-height`（默认 2rem，跟随 workbench-shell 参照
  的 32px 行高），本包显式置 28px。
- 侧栏普通项文字色 token 化：参照实测普通项为次级灰 lch(37.776 1.25 282)、选中态近黑（共享库
  两个参照均如此——multica 普通项 oklch(0.505)）。共享库 MenuButton 基础色改读
  `--sidebar-item-foreground`（默认回退 `--sidebar-foreground`），本包 light 置
  `oklch(0.378 0.013 284)`、dark 置 `oklch(0.7 0.004 284)`（dark 无参照，跟随 dark muted 档）。

### 已知偏差
- 分组标题色保持共享库的 `sidebar-foreground/70` alpha 机制，有效灰度(~0.53)比参照实测
  (0.378)浅一档；需动共享文件才能改，留待下次共享库窗口。
- `--sidebar-item-foreground` 的 chroma 保留实测 0.013，高于包惯例 0.001–0.003（Inter 抗锯齿
  采样所致），视觉上是可感知的「次级灰」而非纯中性。

## 0.4.1 — 2026-11-20

### Changed
- `ui/sidebar` 侧栏字重 token 化（共享库改动，详见 workbench-shell 5.0.9）：主题新增
  `--sidebar-active-weight: 400` / `--sidebar-group-weight: 400`，承接 0.4.0 的 F-2 实测
  （此前靠删共享文件里的 `font-medium`，会误伤 multica 语义——multica 实测 active 为 500）。

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
