# apply/playbook

本文件只规定实施顺序与 gate；数值以 [`../tokens.yaml`](../tokens.yaml) 为准，规则以 [`../spec.md`](../spec.md) 为准。

## Phase 1 — Tokens 与双主题

1. 建立 [`../tokens.yaml`](../tokens.yaml) 的主题角色、字体阶梯、间距白名单、圆角与阴影；禁止组件内新增散落值。
2. 实现 light / dark 切换，保持角色键一致。
3. Gate：正文与 muted 文本对比达到 AA；faint 只用于非文本；所有页面读取 token。

## Phase 2 — Shell 与导航

1. 按目标平台实现 Web、Desktop 或 Mobile 壳；至少一个平台必须满足整页不滚动、面板滚动。
2. 实现侧栏宽度、折叠、覆盖 Sheet、focus、激活态与 `aria-current`。
3. 实现 48px PageHeader / Toolbar 与 16px 共同 gutter。
4. Gate：切换路由时壳几何不变；导航可键盘到达；无重复触发器。

## Phase 3 — 页面模式

1. 按 [`../routes-and-layouts.md`](../routes-and-layouts.md) 把路由映射到 A–E。
2. 实现 URL 恢复、面包屑、集合页头、工具栏和底部浮层净空。
3. Gate：每个路由有明确模式；刷新后可恢复状态；标题 / 工具栏 / 内容左线对齐。

## Phase 4 — 核心组件

1. 实现 Button、Input、Card、Badge、Sidebar menu、Tabs、Tooltip / Popover。
2. 实现 Dialog / Sheet、焦点管理和关闭返回。
3. Gate：每个交互组件有 hover、focus-visible、active、disabled、selected 或对应状态；icon-only 有 accessible name。

## Phase 5 — 数据表面

1. 实现列表网格、表格、看板 / 泳道或聚合网格中目标项目需要的模式。
2. 实现空态、错误态、骨架屏和批量操作净空。
3. Gate：骨架形状等于最终形状；过滤空态可清除；交互单元格不嵌套在行链接内。

## Phase 6 — 浏览与平台验收

1. Web / Desktop：在桌面、1024–1279px、窄视口验证滚动、导航和弹层。
2. Mobile：验证安全区、底部页签、sheet、触控目标与键盘。
3. 双主题、减少动效、键盘路径与屏幕 reader 名称全部通过 [`quality.md`](quality.md)。
