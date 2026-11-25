---
name: tree-nav
when: 目录树/文件树形态的二级导航（多层路径、可折叠）
blocks: [blocks/surfaces]
decisions:
  - key: tree-nav.groups
    options: [fixed_groups, raw_directory]
    default: fixed_groups
adjust_after_second_consumer: true
self_review:
  - 一级分组固定（业务定义，如 分类甲 / 分类乙 / 其他），存储根目录不出现在导航里
  - 叶子是真链接（NavItem to），中键/新标签可用
  - 默认全折叠，仅当前项的祖先目录展开；用户手动展开/折叠覆盖默认值
  - 目录名随界面语言映射，未知目录保留原名；排序按显示名
  - 树内不重复行尾类型徽标（分组已经表达类型）；扁平搜索结果才保留
  - 定位按钮在搜索框外；全展开/全折叠合并为一个按钮（全开→折叠）
---

# Tree nav

没有参考原型。适用：文档站、知识库、文件管理器中「路径本身即信息架构」的二级菜单。

结构
- 数据 → 树：按路径段构建；命中的业务分组段上提为一级，其余全部并入「其他」，
  并剥掉存储根（`workspace/`、`raw/` 之类的实现目录对读者无意义）。
- 一级顺序固定（分组甲 → 分组乙 → 其他），层内目录优先、按显示名排序。
- 行渲染用 `NavItem depth={0..3}`（超过 3 级夹紧）：文件夹 `onSelect` 切换 + chevron 图标；
  文件 `to` 链接 + `active`；`trailing` 只用于扁平列表（计数/徽标），树内不放类型徽标。

折叠状态
- 默认值 = 仅当前项的祖先展开；用户操作记入覆盖 Map（`isOpen = overrides.get(key) ?? default`）。
- 不要在 effect 里 setState 同步折叠状态（`react-hooks/set-state-in-effect` 会拦，也易产生
  与用户操作竞争的状态）。
- 工具条：搜索框（可带尾随清空）→ 框外「定位当前项」→「展开/折叠」单按钮（全部已开时折叠，
  否则展开）；aria-label 随状态变化。顶部搜索与筛选控制区通过 `Split` 的 `sideHeader` 固定在滚动区上方，不用 `sticky` 塞进滚动列表。

搜索结果
- 搜索态退回扁平列表（保留类型徽标）；清空搜索恢复树。

候选 block
- 「路径 → 树」的构建与行渲染目前由页面组合实现。第二个消费端出现时再上提为 `TreeNav`
  block（不提前抽象）。
