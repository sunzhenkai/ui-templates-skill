# Proposal — 侧栏 active 匹配：最长前缀胜出（父/子路径不再同时选中）

## Intent

消费端侧栏导航同时存在父项 `/wiki`（Wiki）与子项 `/wiki/graph`（图谱）。`blocks/router` 的
`useIsActive` 用前缀匹配（`pathname === to || pathname.startsWith(to + "/")`），在 `/wiki/graph` 上
两个候选都命中——Wiki 与图谱两项同时高亮。任何「父级入口 + 子级入口并列」的侧栏都有同样缺陷。

## 改动

- `blocks/router`：拆出纯函数 `isActivePath(pathname, to)`（原判定逻辑不变）；`useIsActive` 改为
  调用它；新增 `pickActive(pathname, candidates)`——候选中最长匹配胜出（返回命中的 `to` 或 `undefined`）。
- `blocks/app-shell`：`AppShell` 先对整组导航（跨分组展平）求唯一最佳匹配，`NavEntry` 改为接收
  `active` 布尔值（不再各自调 `useIsActive`）。
- quiet-inset 0.6.8 / workbench-shell 5.0.20。

## Conflict check

- `useIsActive` 签名与语义不变（list-detail、section-nav 等既有消费端无需改动）。
- `pickActive` 为新增导出，无命名冲突；`isActivePath` 与 `useIsActive` 行为逐字等价。
- 无 token / 对比度影响。

## Validation

- `make sync` + `make check`（names/registry/catalog/unittest）。
- `validate_package.py --package quiet-inset` / `--package workbench-shell` ×2 0 error。
- 消费端项目：重锁 0.6.8 → tsc/eslint/build/vitest、fidelity 7/7；`/wiki/graph` 仅「图谱」高亮，
  `/wiki/...` 深层路由点亮「Wiki」，其它页面行为不变。
