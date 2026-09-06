# components

本文件是技术栈无关的设计层契约。精确 expected 只从 [`tokens.yaml`](tokens.yaml) 读取；provenance 按相同 token path 在 [`evidence.yaml`](evidence.yaml) 查找唯一 active 记录。组件密度遍历 `typography.scale`、`spacing.allowed`、`radius` 和 `layout` 当前声明，不假定固定档数。focus 统一遵守 @NN-012。

## Button

- [AX-001] 语义：`button`；跨页导航动作使用链接语义。
- [AX-002] 变体：default、outline、brand、brandSubtle、secondary、ghost、destructive、link。
- [AX-003] 尺寸：从当前 spacing 与 typography scale 映射 xs、sm、default、lg；icon-only 与同级控件保持一致触控几何。
- [AX-004] 几何：文字、padding、gap 与图标只取当前 token scale；不得创建任意值。
- [AX-005] 状态：default、hover、active、expanded、focus-visible、disabled、invalid；focus-visible 使用 @NN-012 的统一环，disabled 保持几何且阻止操作。
- [AX-006] a11y：icon-only 必须有 accessible name；按钮内不得嵌套按钮。
- [AX-115] 变体语义：PageHeader 与 Toolbar 的主动作默认使用 primary 或 outline；`brand` 变体只用于未读、进行中、激活强调等注意点（@NN-008），不得作为常规页头按钮默认色。

## Sidebar / navigation

- [AX-007] 语义：`nav` + 列表 + 链接/button 触发器。
- [AX-008] 尺寸：展开、折叠和覆盖宽度读取 `layout.sidebar-*`；Web 形态读取 `responsive.web.*`。
- [AX-009] 结构：空间切换/搜索、滚动分组、菜单、页脚和折叠 rail。
- [AX-010] 几何：group、item、icon 与 gap 仅从当前 spacing/layout scale 映射；item 高度读取 `layout.sidebar-item-height`，item 文字使用 `typography.scale.body`。
- [AX-011] 状态：hover/active 使用 sidebar 角色；focus 几何与 @NN-012 一致，仅颜色切换为 `sidebar-ring`；折叠项提供 Tooltip；disabled 非颜色可辨。
- [AX-012] a11y：当前页使用 `aria-current="page"`；截断文本的 accessible name 完整；纯图标项有 Tooltip 与 accessible name。

## Page header / toolbar

- [AX-013] 语义：`header` + 标题层级；Toolbar 是控件容器或表单区域。
- [AX-116] 标题排版：集合/列表页头的 `h1` 默认使用 `typography.scale.body` 档 + medium 字重；详情页可在同一阶梯内升档（如 title-sm），不得跳出当前 scale。
- [AX-014] 几何：高度、gutter 与 gap 读取 `layout.page-*`、`layout.toolbar-*` 和 spacing scale，正文左线对齐。
- [AX-015] 状态：头部不因 viewport 或动作数量改变几何；动作按 @NN-017 降级。
- [AX-016] a11y：每页一个可见 `h1`；描述可截断但不遮挡动作；icon-only 动作有 accessible name。

## List grid

- [AX-017] 语义：table/rowgroup/row/columnheader/cell role 完整。
- [AX-018] 变体：核心列 compact、全部启用列、可选多选/排序/行菜单/批量操作。
- [AX-019] 几何：header、row、cell、track 与文字从当前 layout/spacing/typography scale 映射；header/row/skeleton 共用列定义。
- [AX-020] 状态：hover、selected、sorted 与 disabled 使用主题角色及非颜色提示。
- [AX-021] a11y：sortable 列设置 `aria-sort`；名称单元格提供真实链接；交互单元格不嵌套进行导航。

## Native table

- [AX-022] 语义：原生 table/theader/tbody/th/td；宽内容的容器可横向滚动。
- [AX-023] 几何：文字、行、cell padding 和 footer surface 从当前 token scale 映射。
- [AX-024] 状态：hover、selected 与边界层级保持主题语义，不靠颜色单独表达。
- [AX-025] a11y：空表提供 caption 或相邻空态；表格不承载根滚动。

## Card

- [AX-026] 语义：section 或 article，标题使用 heading。
- [AX-027] 变体：default、compact，可带 media、action、content、footer。
- [AX-028] 几何：padding、gap、title、description、radius 与 footer divider 从当前 token scale 映射。
- [AX-029] 状态：静态卡片无强制 hover；可点击卡片提供 surface hover 与 @NN-012 focus。
- [AX-030] a11y：card action 使用独立控件；整卡可点时不得嵌套交互控件。

## Input / textarea

- [AX-031] 语义：input/textarea 与可解析 label 关联。
- [AX-032] 变体：单行、多行、文件、compact 下拉。
- [AX-033] 几何：高度、radius、padding、正文与 placeholder 从当前 token scale/主题角色映射。
- [AX-034] 状态：focus 使用 @NN-012；invalid 使用 destructive；disabled/read-only 均保留语义；窄屏可编辑字号按 @NN-005。
- [AX-035] a11y：错误文本用 `aria-describedby`；required、disabled、read-only 不得只用视觉表达。

## Badge

- [AX-036] 语义：状态文本使用 span；包含导航时保留 link 语义。
- [AX-037] 变体：default、secondary、destructive、outline、ghost、link。
- [AX-038] 几何：高度、padding、radius、文字与图标从当前 token scale 映射。
- [AX-039] 状态：focus 使用 @NN-012；destructive 的前景/真实背景需可验证；link hover 有非颜色提示。
- [AX-040] a11y：计数徽章不是唯一操作入口，操作由独立可达控件承载。

## Tabs

- [AX-041] 语义：tablist/tab/tabpanel。
- [AX-042] 变体：segmented、line、C 设置纵向导航。
- [AX-043] 几何：容器、导航列与 indicator 从当前 layout/spacing token 映射。
- [AX-044] 状态：default、hover、active、focus-visible、disabled；focus 使用 @NN-012。
- [AX-045] a11y：URL 可恢复当前 tab；orientation 与键盘方向一致；panel 由 tab 关联命名。

## Dialog / sheet / popover

- [AX-046] 语义：Dialog/Sheet 使用 dialog 语义；Popover/Menu 使用适用 popup/menu 语义。
- [AX-047] 几何：inset、width、padding、radius 与 Tooltip 密度只从当前 token scale 映射。
- [AX-048] 层级与阴影：使用 `surface-raised`；近距离菜单用 `shadow.menu`，窗口级浮层用 `shadow.floating`。
- [AX-049] 状态：开合动效从 token map 读取；关闭按钮独立可达；菜单支持键盘、typeahead 与 selected。
- [AX-050] a11y：标题、描述、关闭按钮有 accessible name；焦点进入并受约束，关闭后返回触发器；路由跳转后关闭覆盖层。

## Empty / error state

- [AX-051] 语义：empty 可用 status；error 使用 alert。
- [AX-052] 变体：muted、warning、destructive、minimal（裸图标 + 单行 muted 说明，用于主从面板/列表空态，不加标题强调与容器底色）。
- [AX-053] 几何：container、icon、title、description 与 action 从当前 token scale 映射。
- [AX-054] 状态：过滤空态提供清除；错误提供重试；not-found 提供返回。
- [AX-055] a11y：真实标题可读取；按钮与链接语义明确。

## Skeleton

- [AX-056] 语义：装饰块对 AT 隐藏，加载区域声明 busy。
- [AX-057] 变体：row、card、board column、table/grid。
- [AX-058] 几何：复制真实 row、column、card padding 与 radius，并与最终布局共用 token 映射。
- [AX-059] 状态：loading 动效不改变布局；数据到达不跳版。
- [AX-060] a11y：提供文本加载状态或 live 通知，不只依赖视觉脉冲。

## Floating chat / FAB

- [AX-061] 语义：button 打开 dialog。
- [AX-062] 几何：size、inset 与 clearance 读取 `layout.chat-fab-*`；icon 从当前 scale 映射。
- [AX-063] 状态：hover 使用 surface role；focus 使用 @NN-012 的统一环；运行中使用 brand 状态；打开后隐藏 FAB。
- [AX-064] a11y：accessible name 区分默认、未读和运行状态；Tooltip 可展示快捷键；浮层可由键盘关闭。

## Avatar

- [AX-074] 语义：img 或具名 fallback；包含链接时保留 link 语义。
- [AX-075] 变体：单人、团队/工作区、组合叠放（stack）、带状态点。
- [AX-076] 几何：尺寸从当前 spacing/typography scale 映射；fallback 使用 label 字号与 surface 角色背景；叠放间距与描边从 token scale 取值。
- [AX-077] 状态：图片加载失败回退具名 fallback；状态点使用 success/info/destructive 语义并配 accessible 描述；focus 按 @NN-012。

## Checkbox / Radio / Switch / Slider

- [AX-078] 语义：input[type=checkbox|radio]、`role="switch"`、`role="slider"`；分组使用 fieldset/legend 或 group。
- [AX-079] 变体：checkbox（含 indeterminate）、radio 组、switch、slider 单/双柄。
- [AX-080] 几何：控件尺寸、圆角、轨道高度与 gap 从当前 spacing/radius token 映射；选中填充使用 primary/brand 语义，不引入新色。
- [AX-081] 状态：checked/unchecked/indeterminate、disabled、read-only、invalid、focus-visible（@NN-012）；switch 的 on/off 必须有非颜色差异。
- [AX-082] a11y：label 关联必达；slider 有 aria-valuemin/max/now 与键盘步进；radio 组支持方向键移动。

## Select / Combobox / Command palette

- [AX-083] 语义：原生 select 或 listbox/option 组合；command palette 使用 dialog + combobox 语义。
- [AX-084] 变体：单选下拉、多选、可创建选项、分组与描述行、命令面板（含快捷键与分类）。
- [AX-085] 几何：触发器高度与 Input 一致；菜单宽度、padding、item 高度从 token scale 映射；面板阴影按 @AX-048。
- [AX-086] 状态：loading、empty（提供创建/清除入口）、selected、disabled option、focus-visible；输入过滤不丢失已选项。
- [AX-087] a11y：触发器有可解析名称；键盘打开/方向键/Enter/Escape/typeahead；多选回显以文本或计数表达。

## Tooltip / Kbd

- [AX-088] 语义：tooltip 使用 tooltip 语义；Kbd 是静态文本标记。
- [AX-089] 几何：出现延迟、inset、padding 与字号从 token scale 映射；密度与 @AX-047 菜单一致。
- [AX-090] a11y：icon-only 控件必须配 Tooltip 但不作为唯一名称；hover 与 focus 均触发；Esc 可关闭；不得承载必读信息。

## Date picker / Time input

- [AX-091] 语义：输入框 + dialog/popover 日历（grid 语义）；time input 保持可键入。
- [AX-092] 变体：单日、范围、带时间、月/年切换。
- [AX-093] 几何：单元格尺寸、today/selected 高亮从 token scale 与状态角色映射。
- [AX-094] a11y：方向键移动、Enter 选择、Esc 关闭；范围选择表达起止；周首日由 locale 决定。

## Toast

- [AX-095] 语义：status/alert region；成功用 status，失败用 assertive alert。
- [AX-096] 变体：success、error、warning、loading、带动作（重试/撤销）。
- [AX-097] 几何：位置与净空读取 layout token，并遵守 @LAYOUT-008 的 chat-fab 净空；堆叠上限与时长按交互声明。
- [AX-098] a11y：错误 toast 停留可读时长并提供重试动作；动作可达；不作为唯一错误通道。

## Progress / Stepper

- [AX-099] 语义：`role="progressbar"` 或 status；stepper 使用有序列表。
- [AX-100] 几何：轨道高度、半径与颜色从 token scale 与 brand/状态角色映射。
- [AX-101] 状态：indeterminate、成功/失败着色、当前/已完成/未完成步；提供 aria-valuenow 或文本进度。

## Alert / Separator / Collapsible

- [AX-102] 语义：alert 使用 alert role；separator 可 aria-hidden；collapsible 使用 disclosure 语义。
- [AX-103] 变体：info/success/warning/destructive alert；水平/垂直 separator；分组标题可折叠。
- [AX-104] 几何与状态：边框、背景与图标使用状态语义色 + surface 角色；折叠状态可进 URL（@ROUTE-001）；focus 按 @NN-012。

## Context menu / Dropdown menu

- [AX-105] 语义：menu/menuitem；右键与触发按钮共用同一菜单定义。
- [AX-106] 几何与状态：同 @AX-046–@AX-050；危险项使用 destructive；disabled/checked 项非颜色可辨；typeahead 可用。

## Charts

- [AX-107] 语义：图表容器配 figure 与可访问表格或文本摘要；装饰网格对 AT 隐藏。
- [AX-108] 变体：趋势（线/面积）、分布（柱/堆叠）、排行（水平条）。
- [AX-109] 几何与色：序列颜色按主题顺序读取 `chart-*` 阶梯并表达主次（@NN-008）；轴、图例与 tooltip 文本使用 foreground/muted-foreground。
- [AX-110] 状态：loading 骨架复制图表形状；empty/error 提供重试；hover/键盘可读数值详情；reduced-motion 下关闭入场动画。

## File upload

- [AX-111] 语义：input[type=file] 或 dropzone button；附件列表使用 list。
- [AX-112] 变体：拖拽区、按钮入口、附件列表（名称/大小/进度/失败重试/删除）。
- [AX-113] 几何与状态：dropzone 使用 token 边框；进度条按 @AX-099；上传失败保留文件并提供重试；dragover 有非颜色提示。
- [AX-114] a11y：每项有删除/重试可达控件与 accessible name；进度有文本或 live 表达。
