---
name: canvas
when: 节点连线图、关系图，以及其他不是表格或文档的自定义画布
blocks: [blocks/surfaces]
decisions: []
self_review:
  - 标签不压在节点上，标签之间不重叠
  - 默认只画最重要的一批标签，而不是每个节点都出字
  - 标签有底，深色下连线和文字仍能分开
  - 画布在 Page 内，不给 html/body 加滚动
---

# Canvas

没有参考原型。07 对 `dense` 和 `dark` 只拍产品页，不和 collection 原型左右对照。

规则
- 页面只提供数据：节点、边、要显示的标签。碰撞避让、标签底色、标签上限写在这一处画布组件里。
- 深色连线用主题里能与背景分开的颜色，不写死灰色。
- 画布区域声明 `data-scroll-region`；画布边框仍留在视口内。
