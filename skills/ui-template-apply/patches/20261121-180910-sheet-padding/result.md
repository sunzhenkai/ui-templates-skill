# Result — sheet-padding

## 交付

- `SheetContent` 内建 `p-4`（Dialog 对齐）；`SheetHeader`/`SheetFooter` 移除自带 p-4；弹层 padding 契约注释。
- quiet-inset 0.6.6 / workbench-shell 5.0.18。

## 验证

- validate ×2 → 0 error；make check 48 OK（skip=1）
- 消费端：tsc/eslint/build/vitest、fidelity 7/7；线上打开详情抽屉实测内容距抽屉边缘 16px。
