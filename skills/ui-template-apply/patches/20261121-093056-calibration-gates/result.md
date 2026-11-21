# Result — 20261121-093056-calibration-gates

## 交付

- `validate_package.py` 新增两项常设检查：
  - P12：meta.yaml density 数值声明 ↔ theme token / library 默认值 / 组件读取链一致性
  - P13：浮层组件阴影接线（必须 shadow-lg → --floating-shadow）
- `library/fidelity/playwright.fidelity.config.ts` webServer 加 `--host 127.0.0.1`（macOS ::1 坑根治）
- make sync 重生成 registry/catalog

## 验证输出

- `validate_package.py package` ×2 → 0 error / 0 warning
- 反向测试：
  - theme `--control-height: 32px` → `warn P12 … declares controls 28px but --control-height resolves to 32px`
  - popover `shadow-md` → `warn P13 ui/popover.tsx uses shadow-md …`
  - 两项均还原，复跑 0 warning
- `make check` → Ran 48 tests … OK (skipped=1)

## 状态

未 commit，未 push（写入本 result 后即执行）。
