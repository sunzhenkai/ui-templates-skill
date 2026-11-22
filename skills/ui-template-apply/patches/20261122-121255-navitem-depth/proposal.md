# Proposal — NavItem 树形缩进 depth

## Intent

文档菜单要改成目录树（文件夹可折叠 + 文件叶子），行缩进需要多级；`NavItem.indent` 只有单级
（pl-7），页面不能自写 padding 类（no-layout-classes），树形菜单因此缺一个共享能力。

## 改动

- `blocks/surfaces`：`NavItem` 新增 `depth?: number`（0 根级、1–3 逐级缩进，超过 3 夹紧）；
  `indent` 保留为 depth=1 的快捷方式，两参同时给时 `depth` 优先。
- quiet-inset 0.6.14 / workbench-shell 5.0.26。

## Conflict check

- 既有消费端只用 `indent` 或不用缩进，输出不变。
- 缩进用静态类（`pl-7/pl-11/pl-14`，Tailwind 4 动态间距），无内联样式、无 token 影响。

## Validation

- `make sync` + `make check`；validate ×2 0 error。
- 消费端：目录树文件夹/文件按层级缩进，折叠展开时层级稳定。
