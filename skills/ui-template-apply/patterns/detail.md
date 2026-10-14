---
name: detail
when: 单个资源的查看页
blocks: [blocks/page-header, blocks/format, blocks/status-badge, ui/tabs, blocks/state-boundary]
decisions:
  - key: detail.layout
    options: [header-tabs, single, aside]
    default: header-tabs
self_review:
  - 标题是资源名，状态 StatusBadge 紧跟标题区下方的属性行
  - 属性用 dl 两列（标签 muted、值 foreground），不是表格也不是卡片堆
  - tab 状态写进 URL（useUrlState("tab")），刷新不丢
  - 404 时渲染 NotFound，而不是空白或无限 loading
  - 属性区、tab 内容、相关列表之间用分割线或 ≥24px 间距分组；同底色的卡片相邻时必须有边框
---

# Detail

原型：`reference/src/pages/detail.tsx` —— `Page`（面包屑 + 主操作 + 溢出菜单）→ `Properties` → `Tabs`（`useUrlState("tab")`）→ `Section` 内 `Panel padding="none"` + `Rows`/`DisclosureRow`，或 DataTable。

规则
- 属性 ≤ 8 个直接展示；更多放「详情」tab。长文本（描述、配置）用 Markdown / CodeBlock，不要塞进 Properties。
- tab ≤ 5 个；每个 tab 自己处理加载状态（StateBoundary），切 tab 不让整页闪烁。
- aside 布局（右侧属性栏）只在内容主体是长文/对话时使用；容器 < 64rem 时属性栏移到上方。
- 编辑：字段少（≤3）用行内编辑或 Dialog；多则跳转编辑页（form pattern）。
