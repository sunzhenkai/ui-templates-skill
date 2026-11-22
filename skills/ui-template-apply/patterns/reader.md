---
name: reader
when: 文档阅读页、知识库正文、长文阅读（正文 + 目录 + 可选列表栏）
blocks: [blocks/surfaces, blocks/section-nav]
decisions:
  - key: reader.width
    options: [bounded, full]
    default: full
  - key: reader.toc_visibility
    options: [persisted, session]
    default: persisted
self_review:
  - 整页只有一个 PageHeader；列表栏/正文栏/目录栏不再各自加 header 行
  - 正文不套卡片；宽度按产品决策（默认不限宽，配合右侧目录）
  - 目录条目从渲染后的 DOM 提取，代码块里的 # 不会成为条目
  - 目录跟踪当前章节（滚动到哪一节高亮哪一节，滚到底最后一节胜出）
  - 目录可隐藏，隐藏状态跨刷新保留（persisted）
  - 切换文档时页面壳不卸载、不整页骨架：文档与关联 query 使用 keepPreviousData
  - 元信息/引用/历史等低频区块进 header 图标弹窗，不常驻侧栏
---

# Reader

没有参考原型；实现从 `detail` 原型 + 本页规则组合。适用：正文阅读占主导、需要章节导航的页面。

布局
- `<Page title layout="fill">` 顶部一个 PageHeader（标题、面包屑、iconOnly 动作）。
- 三段式：`Split`（左：列表/树导航）→ 正文 → `Split sidePosition="end"`（右：目录）。
- 正文 `Body width="full"`（默认不限宽；产品要求定宽时用 `reading`，不要套卡片）。
- 右栏目录用 `NavList`/`NavItem`，点击平滑滚动；目录本身不产生第二个滚动条。

目录
- 条目来源：渲染后的 DOM（`h2/h3` 语义层级），不要用正则扫 markdown——代码块里的 `#` 会被误收。
- 生成 id：文本 slug + 重复后缀，点击按 id 滚动。
- 跟踪：rAF 节流的 scroll 监听；当前章节 = 容器顶边 + 一行偏移之上最后一个标题；滚到底部时最后一节胜出。
- 显隐：header 一个目录图标切换；宽屏切换右栏，窄屏（页面宽度 − 左栏 < 900）改为弹窗；
  隐藏状态写入本地存储（键名由项目定义），刷新/重访保持。

连续性
- 文档、反链、前向引用、历史等 query 全部 `placeholderData: keepPreviousData`：
  loading 时保留上一篇内容与整页壳，避免 early-return 把 header 与导航卸载重建。
- 页面级 early-return 只允许出现在「真·首屏未就绪」（无任何可保留数据）时。

反模式
- 正文塞 `Panel` 卡片；左侧常驻「信息」栏挤占阅读区；目录放在正文下方。
- 用正则从 markdown 抽标题（代码块污染）。
- 切换条目时整页骨架/白屏。
