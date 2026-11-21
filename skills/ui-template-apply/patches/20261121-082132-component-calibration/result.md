# Result — 20261121-082132-component-calibration

## 交付

按 proposal 落地六项组件校准（quiet-inset 0.6.0 / workbench-shell 5.0.12）：
`--floating-shadow` 实测值；`--control-height`(28px)/`--button-radius`(pill) 控件档位；
input/select 圆角 `min(--radius-md,12px)`；switch 30×20；command 项 46px/15px；
button/input/select/switch/command 全部 token 化、workbench-shell 默认值渲染不变。

## 验证输出

- `validate_package.py package` ×2 → 0 error / 0 warning
- `make check` → Ran 48 tests … OK (skipped=1)
- `make sync` → registry.json 重生成、2 包 catalog 同步

## 状态

未 commit，未 push（写入本 result 后即执行）。

## 采样证据（linear.app，登录态，2026-11-21）

- command 面板：720×450、radius 12px、border 0.5px、shadow `lch(0 0 0/.08) 0 9px 48px, lch(0 0 0/.1) 0 6px …`、
  项 46px/15px/px12、面板内 kbd 快捷键标记
- settings：search input 28px/8px radius/0.5px 边框/surface-shadow；combobox 30px/8px/13px；
  switch 30×20 全圆、选中 `lch(53 52.26 286.91)`；Customize pill 32px/13px
- documents：filter pill 28px/全圆/12px/500，主按钮 pill `lch(53 52.26 286.91)` + surface-shadow
- agent：ask 卡 10px radius + surface-shadow；示例卡 0.5px 边框/8px radius；描述 12px/450
- 未采到：dropdown 面板（两次交互均未打开，记录待补）、tooltip、tabs 选中态、checkbox/radio
