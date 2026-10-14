---
name: empty
when: 整页还没有任何数据的集合（首次使用），或只为展示空态而存在的路由
blocks: [blocks/surfaces, blocks/state-boundary]
decisions: []
self_review:
  - 空态在 Panel 内，标题说明“没有什么”，描述说明“有了之后会出现什么”
  - 有且只有一个创建入口（EmptyState action），与页头主操作不重复
  - 筛选无结果不是这个 pattern：用 collection 的 noResults + 清除筛选
---

# Empty

原型：`reference/src/pages/empty.tsx` —— `<Page title><Panel><EmptyState title description action /></Panel></Page>`。

规则
- 真实应用里空态是 collection 页的一种状态（StateBoundary `isEmpty`），不要为它单独加导航项或演示路由；
  只有确实存在“空页”路由时才在 `pages:` 里写 `empty`。
- 视觉验收时 `empty`（或 `state`）映射到 empty 原型。
