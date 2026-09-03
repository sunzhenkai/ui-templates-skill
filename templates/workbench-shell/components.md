# components

本文件是设计层契约，不绑定组件库或目录结构。精确值见 [`tokens.yaml`](tokens.yaml)。

## Button

- 语义：`button`；导航动作可渲染为链接语义。
- 变体：`default`、`outline`、`brand`、`brandSubtle`、`secondary`、`ghost`、`destructive`、`link`。
- 尺寸：`xs`=24px、`sm`=28px、`default`=32px、`lg`=36px；icon 尺寸与同级高度相同。
- 几何：默认文字 14px medium、水平内边距 10px、元素间距 6px、图标 16px；小 / 超小档分别用 13px / 12px 和 14px / 12px 图标。
- 状态：hover 加深或换 muted；active 下移 1px；`aria-expanded` 固定为 hover 表达；focus-visible 用 3px ring；disabled 阻止指针并降到 50% 不透明度；invalid 使用 destructive 边框与环。
- a11y：icon-only 必须有 `aria-label`；按钮内不得嵌套按钮。

## Sidebar / navigation

- 语义：`nav` + `ul` + 链接 / button 触发器。
- 尺寸：默认 256px，可拖拽 200–360px；图标栏 48px；移动 Sheet 288px。
- 结构：顶部空间切换 / 搜索、滚动内容、分组标签、菜单、页脚、折叠 rail。
- 几何：分组 padding 8px；组标签高 32px；默认菜单项高 32px，紧凑 28px；内边距 8px，图标与文本间距 8px。
- 状态：hover / active 用 `sidebar-accent`；激活项 medium 字重；focus 用 2px sidebar ring；折叠时显示 Tooltip；disabled 降低透明度。
- a11y：当前页使用 `aria-current="page"`；菜单项文本截断但可访问名完整；纯图标折叠项有 Tooltip / accessible name。

## Page header / toolbar

- 语义：`header` + 标题层级；Toolbar 是 `div` 或表单控件容器。
- 几何：高度均为 48px，左右 padding 16px，元素间距 8px；正文左线对齐。
- 状态：输入与按钮使用各自组件状态；头部不因页宽改变高度。
- a11y：每页一个可见 `h1`；描述文字可截断但不得遮挡动作；icon-only 动作提供 label。

## List grid

- 语义：`role="table"` / `rowgroup` / `row` / `columnheader` / `cell`。
- 变体：核心两列 compact 模式；全列 WYSIWYG 模式；可选多选、排序、行菜单与批量操作。
- 几何：行高 48px、表头 36px、列间距 12px、首尾轨道 20px、单元格水平 padding 8px；header 文本 12px，正文 14px。
- 状态：行 hover 使用 40% accent；selected 使用 muted；排序激活用 foreground + medium，未激活用 muted；hover 后显示排序箭头。
- a11y：可排序列设置 `aria-sort`；整行鼠标导航不得替代名称单元格里的真实链接；交互单元格阻断行导航。

## Native table

- 语义：`table` / `thead` / `tbody` / `th` / `td`；外层容器横向滚动。
- 几何：正文 14px；head / cell 高 40px、padding 8px；header medium、左对齐；footer 用 50% muted 底。
- 状态：行 hover 用 50% muted；selected 用 muted；首行无底边、最后行无边。
- a11y：空表格提供可见 caption 或相邻空态；表格不承载整页滚动。

## Card

- 语义：`section` 或 `article`，标题用 heading 语义。
- 变体：default 与 compact；可带 media、action、content、footer。
- 几何：default 纵向 padding 16px、水平 16px、内部间距 16px；compact 为 12px；标题 16px medium；描述 14px muted；footer 顶边 1px。
- 状态：静态卡片无 hover 必需态；可点击卡片使用 surface hover，且焦点环可见。
- a11y：card action 使用独立控件；整卡可点时仍不得嵌套交互控件。

## Input / textarea

- 语义：`input` / `textarea` + `label` 或 `aria-label`。
- 变体：单行、多行、文件、compact 下拉。
- 几何：高度 32px、圆角 10px、水平 padding 10px；正文 14px；placeholder 使用 muted。
- 状态：focus 3px ring；invalid 用 destructive；disabled 禁止指针、降低不透明度；窄屏 / 粗指针下可编辑文本渲染 16px。
- a11y：错误文本用 `aria-describedby`；必填、禁用与只读语义不得只用视觉表达。

## Badge

- 语义：`span`；可包裹链接时保持链接语义。
- 变体：default、secondary、destructive、outline、ghost、link。
- 几何：高 20px、padding-block 2px、padding-inline 8px、胶囊 26px；文字 12px medium；图标 12px。
- 状态：focus-visible 用 3px ring；destructive 用 10% 底（暗色 20%）加 destructive 文本；链接徽章 hover 轻换底。
- a11y：计数徽章是状态而非唯一操作；操作必须仍由可达控件承载。

## Tabs

- 语义：`tablist` / `tab` / `tabpanel`。
- 变体：segmented、line、设置纵向导航。
- 几何：segmented 容器高 32px；设置导航项高 32px，左侧 224px；线式激活指示为 2px。
- 状态：默认 muted，hover foreground；激活用 selected surface 或 foreground 线；focus-visible 用 ring；disabled 降低不透明度。
- a11y：URL 可恢复页签；orientation 与键盘方向键一致；每个 panel 可见标题或由 tab 关联命名。

## Dialog / sheet / popover

- 语义：Dialog / Sheet 使用 dialog 语义；Popover / Menu 使用 popup / menu 语义。
- 几何：Dialog 默认水平 16px 边距、`sm+` 最大 384px、padding 16px、radius 14px；Sheet 右侧最多 384px 或 75%；Popover 常用 192–256px；Tooltip 12px 文本、padding 10px / 4px。
- 层级与阴影：全部用 `surface-raised`；菜单用 menu shadow；Dialog / Sheet 用 floating shadow；遮罩 10% 黑并启用轻度 blur。
- 状态：开合 100–200ms；关闭按钮为右上 icon button；菜单支持键盘、typeahead 与选中态。
- a11y：标题、描述、关闭按钮必须有 accessible name；焦点被困并在关闭后返回触发器；路由跳转后关闭 Sheet。

## Empty / error state

- 语义：空态可用 `status`；错误用 `role="alert"`。
- 变体：muted、warning、destructive。
- 几何：容器 padding 24px / 64px；图标圆 48px、图标 24px；标题 14px medium；描述最大 448px；动作横排居中。
- 状态：过滤空态必须提供“清除过滤”；错误提供重试；404 提供返回。
- a11y：不要用图片文字替代真实标题；按钮和链接语义清晰。

## Skeleton

- 语义：`aria-hidden` 的装饰块，外层加载区域用 `aria-busy="true"`。
- 变体：行、卡片、看板列、表格网格。
- 几何：复制真实行高、列宽、卡片 padding 与圆角；表格骨架在真实 grid 内。
- 状态：脉冲只表达加载，不改变布局；数据到达时不得跳版。
- a11y：提供文本加载状态或 `aria-live` 通知；不要只靠视觉脉冲。

## Floating chat / FAB

- 语义：`button` 打开浮层；浮层是 dialog。
- 几何：40px 圆形；距右下 8px；占用净空 56px；图标 20px。
- 状态：hover 换 surface hover；focus 2px ring + offset；运行中用 brand 脉冲；打开后隐藏 FAB。
- a11y：label 描述默认 / 未读 / 运行状态；快捷键可在 Tooltip 中展示；浮层可被键盘关闭。
