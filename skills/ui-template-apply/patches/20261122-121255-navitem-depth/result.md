# Result — NavItem depth

## 落点

- `blocks/surfaces.tsx`：`NavItem` 新增 `depth`（0–3，夹紧）；`indent` 保留。
- quiet-inset `0.6.13 → 0.6.14`、workbench-shell `5.0.25 → 5.0.26`。

## 验证

- `make sync` + `make check` 48 tests OK；validate ×2 0 error。
- 消费端：Wiki 目录树行缩进按层级正确（根 0 / 目录 1–2 / 文件 2–3）。
