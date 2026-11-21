# Result — 20261121-133621-hover-step-gap

## 交付

- `ui/sidebar`：MenuButton hover 读 `--sidebar-hover`（默认回退 accent）；SidebarMenu gap 2px
- `blocks/surfaces`：NavList gap 2px
- `blocks/markdown`：正文链接 hover 变淡，取消常驻下划线
- `ui/button` / `ui/badge` link variant、`blocks/log-view`：去 hover 下划线
- quiet-inset 0.6.3（新增 --sidebar-hover light 0.935 / dark 0.21）/ workbench-shell 5.0.15

## 验证输出

- validate_package package ×2 → 0 error / 0 warning
- make check → Ran 48 tests … OK (skipped=1)
- 消费项目：tsc/eslint/build/vitest 全绿；fidelity 7/7；部署后线上复查通过

## 状态

未 commit，未 push（写入本 result 后即执行）。
