# Proposal — NavItem 支持链接与尾随元素

## Intent

把列表型入口（文档列表、图谱节点）改成二级菜单样式时，`NavItem` 只能渲染 button/静态行：
既不能是真链接（中键/新标签），也没有行尾位置放类型徽标或计数，只能在页面里重写一套行样式
（违反「几何归 surface、页面组合 blocks」的约束）。

## 改动

- `blocks/surfaces`：`NavItem` 新增可选 `to`（渲染 `AppLink`，优先于 `onSelect`）与
  `trailing`（`ml-auto` 的右侧尾随元素，可放 `StatusBadge`/`Num`）；交互态 hover/active 判定改为
  `to || onSelect`。`indent`/`icon` 语义不变。
- quiet-inset 0.6.13 / workbench-shell 5.0.25。

## Conflict check

- 现有消费端只用 `onSelect`/静态行，输出不变；新增字段可选。
- `surfaces` 引入 `blocks/router` 的 `AppLink`，router 不反向依赖 blocks，无循环引用。
- 无 token / 对比度影响；行高维持 28px。

## Validation

- `make sync` + `make check`；validate ×2 0 error。
- 消费端：文档列表与图谱节点列表改为 NavItem（链接 + 尾随徽标/计数），active 高亮与导航行为正确。
