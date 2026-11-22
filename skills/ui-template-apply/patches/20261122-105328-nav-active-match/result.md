# Result — 侧栏 active 匹配：最长前缀胜出

## 落点

- `blocks/router.tsx`：新增 `isActivePath`（原 `useIsActive` 判定逻辑原样迁出）+ `pickActive`
  （最长匹配胜出）；`useIsActive` 改为 `isActivePath(useAppPathname(), to)`。
- `blocks/app-shell.tsx`：`NavEntry` 改收 `active`；`AppShell` 用
  `pickActive(useAppPathname(), nav.flatMap(...))` 求唯一 best match。
- quiet-inset `0.6.7 → 0.6.8`、workbench-shell `5.0.19 → 5.0.20`（CHANGELOG 同步）。

## 验证

- `make sync`：registry.json + catalog 重新生成。
- `make check`：48 tests OK（skip=1，eslint 目录用例按设计跳过）。
- `validate_package.py package` ×2：quiet-inset / workbench-shell 均 0 error / 0 warning。
- 消费端（重锁 0.6.8）：tsc / eslint / build / vitest 全绿；fidelity 7/7；`/wiki/graph` 仅「图谱」高亮、
  `/wiki` 本身及深层子路由点亮「Wiki」，其它页面选中行为不变；线上部署后实测通过。
