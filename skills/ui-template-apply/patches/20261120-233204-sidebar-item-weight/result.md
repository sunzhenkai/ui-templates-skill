# Result — 20261120-233204-sidebar-item-weight

## 交付

共享库 MenuButton 基础类补 `[font-weight:var(--sidebar-item-weight,400)]`，quiet-inset 置 500
（默认 400 保 workbench-shell/multica 语义）。0.5.0 落地后消费项目线上复核发现普通项仍 400
（`--sidebar-active-weight` 只管选中态），本 patch 补齐。

## 验证输出

- `validate_package.py package` ×2 → 0 error / 0 warning
- `make check` → Ran 48 tests … OK (skipped=1)
- 消费项目重锁 0.5.1 后线上实测普通项 font-weight = 500（见消费仓部署验证）

## 状态

未 commit，未 push（写入本 result 后即执行）。
