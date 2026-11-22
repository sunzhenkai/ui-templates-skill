# Result — NavItem 链接 + 尾随元素

## 落点

- `blocks/surfaces.tsx`：`NavItem` 新增 `to`/`trailing`；`interactive` 统一 hover/active 判定；
  `AppLink` 由 `blocks/router` 引入。
- quiet-inset `0.6.12 → 0.6.13`、workbench-shell `5.0.24 → 5.0.25`。

## 验证

- `make sync` + `make check` 48 tests OK；validate ×2 0 error。
- 消费端：Wiki 文档列表、图谱节点列表均为链接式菜单行（中键可开新标签），尾随类型/计数显示正常。
