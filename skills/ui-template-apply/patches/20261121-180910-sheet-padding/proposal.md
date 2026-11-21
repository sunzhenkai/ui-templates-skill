# Proposal — Sheet 弹层 padding 契约统一（Dialog 对齐）

## Intent

详情抽屉内容与边框紧贴：根因是 `DialogContent` 有 `p-4` 而 `SheetContent` 没有——Sheet 靠
`SheetHeader`/`SheetFooter` 各自的 p-4 撑着，内容区（自建滚动容器 + Panel）没有任何内边距，
带边框 Panel 直接贴抽屉边缘。两个消费端 Sheet（timeline 详情、jobs 详情）均中招。

## 改动

- `ui/sheet`：`SheetContent` 补 `p-4`（与 DialogContent 一致）；`SheetHeader`/`SheetFooter`
  去掉各自 `p-4`（避免双 padding）。特殊用法（pane sheet 用 `className="p-0"`）由 tw-merge 覆盖，不受影响。
- 文件头补「弹层 padding 契约」注释：容器负责内边距，内容块不写 padding。
- quiet-inset 0.6.6 / workbench-shell 5.0.18。

## Conflict check

- 共享 `ui/sheet` → 双包升版；`p-4` 与既有 `p-0` 覆盖共存（tw-merge 后者胜出）。
- 无 token/对比度影响。

## Validation

- validate ×2 0 error；make check 48 OK（skip=1）
- 消费端：重锁 0.6.6 → tsc/eslint/build/vitest、fidelity 7/7；打开 timeline/jobs 详情抽屉实测
  内容与边框间距 16px；确认对话框（Dialog）不受影响。
