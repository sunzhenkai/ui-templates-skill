# Result — 文档阅读壳三件套

## 落点

- `blocks/list-detail.tsx`：`PaneHeader` → `sticky top-0 z-10 ... bg-background`。
- `blocks/surfaces.tsx`：`Split` 新增 `sidePosition`；`end` 用反向列模板 + `order` + 侧栏 `border-l`。
- `blocks/page-header.tsx`：新增 `inlineMax`（默认 2，注释限定 iconOnly 场景）。
- quiet-inset `0.6.10 → 0.6.11`、workbench-shell `5.0.22 → 5.0.23`。

## 验证

- `make sync` + `make check`：48 tests OK（skip=1）。
- `validate_package.py package` ×2：0 error / 0 warning。
- 消费端（重锁 0.6.11）：tsc/eslint/build/vitest、fidelity 7/7；wiki 列表长滚动时 pane header 固定；
  文档页右侧目录栏 + header 5 图标（窄屏 5 个含目录）正常；四个弹窗与滚动跟踪复核通过。
