---
name: conversation
when: 对话、消息流、助手回复
blocks: [blocks/list-detail, blocks/markdown, blocks/code-block, blocks/format, ui/textarea]
decisions:
  - key: conversation.layout
    options: [bubbles, document]
    default: document
self_review:
  - 消息内容走 Markdown（GFM）；代码块可复制、可横向滚动，不撑破容器
  - 内容列宽 reading（~48rem）居中；输入框吸底且与内容同宽
  - 新消息到达时仅在用户位于底部时自动滚动
  - 输入框 Enter 发送、Shift+Enter 换行，发送中禁用并可停止
  - 对话页是主从布局（ListDetailLayout）：左侧会话列表与内容之间有竖线，列表独立滚动；窄容器下列表收进 Sheet，PageHeader leading 放 ListPaneTrigger
  - 会话列表：顶部「新对话」按钮 + 搜索；RecencyList 按今天/昨天/7 天内/更早分组；当前会话高亮；每项菜单含重命名（如支持）/归档/删除；无会话时有空态
  - 会话列表只出现在对话区；不在全局侧栏再列一遍「最近对话」
---

# Conversation

## 主从布局

对话区所有路由（`/chat`、`/chat/:id`）共用一个 layout 路由，列表常驻、内容区切换：

原型：`reference/src/pages/list-detail.tsx`。路由：`{ path: "chat", element: <ChatLayout />, children: [{ index: true, element: <NewChat /> }, { path: ":id", element: <Conversation /> }] }`。
列表面板 = `PaneHeader`（新对话，与页头同高同底线）+ `PaneSection`（搜索/筛选）+ `PaneSection grow`（`StateBoundary` 包 `RecencyList`）；内容页 `Page leading={<ListPaneTrigger />}`。

document 布局：每条消息是一段文档，角色用小标题区分，而不是左右气泡；适合长回复和代码。

`<Page layout="viewport">` → `<ScrollRegion follow>`（唯一滚动区，流式增长时贴底，用户上翻则不打扰）→ `<Body width="reading"><Transcript>` 每轮 `Turn` 内 `Message`（meta = 角色 + 时间）、`Steps`/`Step`（工具调用折叠）、`AttachmentChip`；
输入框放 `<ComposerDock>`（ScrollRegion 之后的固定区，不随内容滚动）。输入框用 InputGroup：发送按钮禁用不会让输入文字变灰（只有控件本身 disabled 才淡化）。全部来自 `blocks/conversation`。

规则
- 每轮顺序固定：用户消息 → 工具调用/中间步骤（`Steps`）→ 助手回复；步骤是回复的过程，放在回复之前（同原型）。
- 助手回复里的表格、代码块由 `Markdown` 渲染，与 panel 同圆角，不要自己包边框。
- 用户消息原样显示（pre-wrap），不渲染 markdown。
- 流式输出时末尾显示闪烁光标；工具调用/中间步骤折叠为一行摘要（Collapsible），可展开看详情。
- 失败的消息原位显示错误与「重试」，不弹 toast。
- 不渲染原始 HTML。
