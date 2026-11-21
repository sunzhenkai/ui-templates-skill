# Proposal — 列表项 hover/选中分档 + 行间隔 + 下划线清理

## Intent

消费项目反馈「padding/margin 是机制问题」的两类表现：

1. 侧栏列表项 hover 与选中态共用 `--sidebar-accent`（同色），且 `SidebarMenu` 行间 `gap-0`——
   相邻高亮块粘连、状态不可区分。参照实测：侧栏底 lch(94.44)、hover #e4e4e5、选中 #e1e1e2，
   本就存在一档浓度差。
2. 链接仍以下划线表达可点击：markdown 正文链接常驻 `underline`；7 处 `hover:underline`
   （button/badge link variant、log-view 展开、消费项目列表行）。

## 改动

- `ui/sidebar`：MenuButton hover 改读 `--sidebar-hover`（默认回退 `--sidebar-accent`）；
  `SidebarMenu` 行间隔 `gap-0` → `gap-0.5`（2px）。
- `blocks/surfaces`：`NavList` 行间隔 `gap-px` → `gap-0.5`；NavItem hover(muted) 与 active(accent)
  本就分档，间隔加大后区分更清晰。
- `blocks/markdown`：正文链接默认 primary、hover 变淡（去常驻下划线）。
- `ui/button` / `ui/badge`：link variant `hover:underline` → `hover:text-primary/75`。
- `blocks/log-view`：展开按钮 `hover:underline` → `hover:text-foreground`。
- `templates/quiet-inset`：新增 `--sidebar-hover`（light 0.935 = muted 档 / dark 0.21）；
  quiet-inset 0.6.3、workbench-shell 5.0.15。

## Conflict check

- `ui/sidebar` 共享 → 双包升版；hover 走新 token 且默认回退旧值，workbench-shell 渲染不变。
- 无 token 契约/对比度影响（sidebar-hover 只作背景面）。

## Validation

- validate ×2 → 0 error / 0 warning；make check 48 OK（skip=1）
- 消费项目：重锁 0.6.3 → tsc/eslint/build/vitest 全绿；fidelity 重建基线后 7/7；
  部署后线上复查 hover/选中浓度差与行间隔、正文链接无下划线。
