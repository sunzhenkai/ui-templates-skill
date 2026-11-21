# Proposal — 把本轮全部 UI 返工教训变成机器闸门

## Intent

2026-11-21 一轮逐页整改累计 20+ 个观感问题，归因全部落在五类机制缺口：规格传递断链、模板默认值
未校准、能力缺口用近似物顶替、容器 padding 责任无归属、交互语汇无标准。其中「可机械判断」的部分
必须变成闸门，而不是依赖人肉复查。

## 改动

- `contract/components.json`（新）：组件实现契约——登记 11 个 library 文件各自必须保留的 token/类
  （control-height、button-radius、select p-1、sheet p-4、sidebar 四 token + gap、command 尺寸、
  markdown 链接样式…）。
- `validate_package.py`：新增 P14 扫描上述契约（缺失 token/回退 shadow-md/padding 丢失 → error）。
- `library/lint/ui-template.mjs`：新增 `no-raw-scroll-containers`——原生元素禁用 overflow 滚动类，
  滚动区域必须用 ScrollRegion/Body/Split/Sheet；版本 5.3.3。
- `ui-template-author/references/calibration.md`：新增「组件形态也要采」清单（控件/按钮/开关/
  菜单/命令面板/弹层/链接）。
- quiet-inset 0.6.7 / workbench-shell 5.0.19。

## Validation

- validate ×2 → 0 error（新闸门不误报）；P14 反向测试：input 改回 h-8 → 正确报 error 后还原。
- make check 48 OK（skip=1）。
- 消费端：重锁后 eslint（新规则）0 error、tsc/build/vitest、fidelity 7/7；部署线上抽查。
