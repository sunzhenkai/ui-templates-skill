# Result — component-contract-gate

## 交付

- `contract/components.json` + validate P14
- ESLint `no-raw-scroll-containers`（lint 5.3.3）
- calibration.md「组件形态也要采」
- quiet-inset 0.6.7 / workbench-shell 5.0.19

## 验证

- validate ×2 → 0 error；P14 反向测试（input h-8）正确报警
- make check → 48 OK（skip=1）
- 消费端：eslint 新规则 0 error（timeline 自建滚动容器已改 ScrollRegion）；tsc/build/vitest、
  fidelity 7/7；线上抽查通过。
