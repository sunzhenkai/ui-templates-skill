# workbench-shell 设计规范

> 中性浅暗双主题的工作台 App Shell：外壳安静、画布承载内容、信息密度紧凑、分区克制、品牌色仅用于关键强调。

- 来源身份、revision 与采集时间以 [`meta.yaml`](meta.yaml) 的 `sources[]` 为准：来源同时包含仓库源码与经泛化的布局设计文档，不将任一来源简化成唯一来源。
- 每个 token/default 决策的 provenance 见 [`evidence.yaml`](evidence.yaml)；无来源截图，不把默认决策描述为来源观察。
- 所有颜色、字体、字号、间距、圆角、阴影、动效、断点和组件几何精确值只见 [`tokens.yaml`](tokens.yaml)。
- 页面模式见 [`routes-and-layouts.md`](routes-and-layouts.md)，组件契约见 [`components.md`](components.md)。
- 平台外壳差异见 [`platforms/web.md`](platforms/web.md)、[`platforms/mobile.md`](platforms/mobile.md)、[`platforms/desktop.md`](platforms/desktop.md)。
- 阶段映射与验收见 [`apply/playbook.md`](apply/playbook.md) 和 [`apply/quality.md`](apply/quality.md)。

## 0. 不可协商规则（Non-negotiables）

1. [NN-001] Web / Desktop 根壳锁定 token 声明的视口高度且整页不滚动；内容列、集合、详情、时间线与设置面板内部滚动。
2. [NN-002] 表面分四层使用：`app-shell` 是最安静外框，`page-canvas` 是页面画布，`surface` 是有边界内容组，`surface-raised` 是弹层；不得反向混用。
3. [NN-003] 常驻导航、折叠导航和覆盖导航只使用 `layout.sidebar-*` token；Web 形态由 `responsive.web.*` token 与 @RESP-001 决定。
4. [NN-004] PageHeader、Toolbar、gutter 与正文对齐线只使用 `layout.page-*` / `layout.toolbar-*` token；页头内容组推开右侧动作，禁止因动作数量造成标题漂移。
5. [NN-005] 产品界面字号只使用 `typography.scale` 当前声明的完整阶梯；触控或窄屏可编辑文本使用该阶梯中满足防聚焦缩放要求的映射，不另写任意字号。
6. [NN-006] 文本灰度只允许 `foreground` 与 `muted-foreground`；`faint-foreground` 只用于非文本标记、图标和占位符号，禁止用透明度制造第三级正文文字。
7. [NN-007] 常规分区使用 token 边框；`shadow.surface` 只给有边界表面，`shadow.menu` 给近距离菜单，`shadow.floating` 给 Dialog / Sheet / 浮动窗口级弹层。
8. [NN-008] `brand` 只用于关键操作、激活强调、未读、进行中状态与导航进度；面积保持克制，图表使用当前 `chart-*` token 阶梯表达主次。
9. [NN-009] 必须提供 light / dark 双主题；两套主题角色键一致，暗色中 hover/选中层级方向可反转，但组件语义不变。
10. [NN-010] 跨页导航使用真实链接或等价可打开链接；当前项表达激活态；可恢复的过滤、视图、详情与页签状态进入 URL。
11. [NN-011] 全局浮层与浮动作挂在内容画布坐标内；净空只由 `layout.chat-fab-*` token 决定，页脚与最后内容不得被遮挡。
12. [NN-012] 所有交互控件必须有可见 `focus-visible`；环颜色来自当前主题 `ring` 或 `sidebar-ring`，几何来自 `interaction.focus-ring-width`，并在真实相邻表面满足非文本对比门禁；icon-only 控件必须有 accessible name。
13. [NN-013] 行响应式与列显隐优先用容器查询；插件面板、主从面板或卡片区不得只根据窗口宽度改变内部列结构。
14. [NN-014] A 常驻集合必须选择列表网格、卡片网格、看板、表格或泳道中的稳定模式；切换模式不得改变 PageHeader 与 Toolbar 几何。
15. [NN-015] 骨架屏必须复制最终布局的行、卡片、表头与列形状；禁止用居中 spinner 替代结构化加载。
16. [NN-016] 行导航不得把 checkbox、菜单或按钮嵌套进同一个交互元素；键盘可达链接位于名称单元格或独立动作上。
17. [NN-017] 窄屏页头动作可退化为 icon-only，但必须保留 accessible name；C 设置页签在窄屏横排、宽屏纵排。
18. [NN-018] 动效必须支持 `prefers-reduced-motion: reduce`；进度、导航与浮层过渡在减少动效模式下不得造成滚动或位移干扰。

## 1. 整体风格

- 风格关键词：工作台、中性、紧凑、高信息密度、安静外壳、克制品牌色。
- 明暗：双主题；Web 与 Desktop 共享语义角色，Mobile 使用独立平台 shell 但映射同一 token 角色，不维护第二套精确色值。
- 密度与圆角：从 `typography.scale`、`spacing.allowed`、`radius` 和 `layout` 的当前声明生成，不在 prose 固定档数或复制值。
- 分区方式：以 token 边框与表面色阶分区；普通表面阴影弱，弹层阴影更强。

## 2. 配色

- [TOKEN-001] `tokens.yaml` 是精确值唯一载体；设计文档和 `apply/` 只声明语义、token path 或 rule ID。
- [TOKEN-002] 颜色角色必须按声明表面使用；带 alpha 的前景或状态色必须在真实背景上合成后检查。
- [TOKEN-003] `muted-foreground` 用于可读次级正文；`faint-foreground` 只承担非文本弱化语义。两者的适用对比门禁由 validator 与 Phase 8 current-build evidence 证明。
- [TOKEN-004] `brand`、`brand-foreground` 与 light `ring` 的默认归一决策分别由 `evidence.yaml` 中对应 active default evidence 审计；prose 不复制色值或计算结果。

| 角色 | 用法 |
| --- | --- |
| `app-shell` | 最外层壳与 Desktop 画布外区域。 |
| `page-canvas` / `background` | 页面主画布；集合、时间线与聊天内容直接落在其上。 |
| `surface` / `card` | 有边界内容组、卡片。 |
| `surface-raised` / `popover` | Dialog、Sheet、Popover、Menu 与窗口级浮层。 |
| `surface-hover` / `surface-selected` | hover 与 selected 的相邻层级。 |
| `foreground` / `muted-foreground` / `faint-foreground` | 正文、次级正文、非文本弱化标记。 |
| `primary` | 中性主按钮与默认徽章。 |
| `brand` | 关键强调、未读与进行中状态。 |
| `success` / `warning` / `info` / `destructive` | 状态语义。 |
| `chart-*` | 当前 token 声明的图表序列，按主题表达主次。 |

## 3. 字体

- [TOKEN-005] 字族、字号、行高与字重语义均从 `typography` token 映射；实现与验收遍历 `typography.scale` 当前键集合，不假定固定档数。
- 正文与标题使用 `typography.family.body` / `heading`；计数、标识符与代码使用 `typography.family.mono`。
- CJK 与拉丁回退顺序保持 token 值；日文界面提升日文字族，禁止合成粗体。
- `micro` / `caption` 用于时间戳和元数据，`label` / `body*` 用于控件与正文，`title*` / `display*` 用于逐级标题；是否存在某档以当前 token 为准。

## 4. 间距与布局

- [TOKEN-006] 所有字号、行高、间距、圆角、布局、focus 与响应断点值必须来自 `tokens.yaml` 的带单位记录；不得以裸 numeric 或 prose 复制值绕过契约。
- 页面 chrome 使用 `layout.page-header-height`、`layout.toolbar-height` 与 `layout.page-gutter`。
- 导航使用 `layout.sidebar-*`；Web 展开/折叠/覆盖形态使用 `responsive.web.*`。
- 控件与内容密度从 `spacing.allowed`、`radius` 和 `typography.scale` 的当前声明映射。
- 浮动聊天与滚动净空使用 `layout.chat-fab-*`；导航进度使用 `layout.navigation-progress-height`。

## 5. 页面模式与组件

A–E 是 page-mode coverage 的完整声明：A 常驻集合、B 主从、C 设置页签、D 聊天/时间线、E 聚合网格。legacy 文档详情不是第六种模式，只能映射到 B 的详情槽位或在 Intake 显式 excluded。结构、滚动、URL 与响应规则见 [`routes-and-layouts.md`](routes-and-layouts.md)。

组件设计以 [`components.md`](components.md) 的稳定 `AX-*` 规则为准：组件必须复用当前 token 角色和动态 scale，覆盖适用状态、键盘路径、accessible name、非颜色状态与浮层焦点返回。

## 6. 其他特征

- 阴影只使用 `shadow.surface`、`shadow.menu`、`shadow.floating` 的当前值。
- 动效语义为导航反馈、宽度变化、浮层进入和进行中状态；时长不得在 prose 复制，减少动效时全部降级。
- 图标尺寸从当前 spacing/typography 映射；icon-only 必须有 accessible name。
- 滚动条使用主题 token；链接必须有非颜色辨识方式。

## 7. 还原要点

1. 先建立 `app-shell → page-canvas → surface → surface-raised` 四层表面，再放内容；不要让根页面滚动。
2. PageHeader、Toolbar 与正文共用 token 驱动的对齐线。
3. 品牌色只用于引导注意；文本灰度遵守 @NN-006。
4. typography、spacing、radius、shadow、focus 和 breakpoint 全部从当前 token map 读取。
5. 路由逐项映射 A–E；legacy 文档详情按 B 或 excluded 处理。
6. 状态与可恢复上下文写入 URL；loading、empty、error 必须保持真实结构。
