# Proposal — 设置内容列 ≤42rem 居中（Body.narrow + SectionLayout.align）

## Intent

按 pattern 要求「分区内容宽度 ≤ 42rem」，参考原型 settings 应为居中窄列；落地时 `SectionLayout` 只有
`width="form"`（max-w-4xl = 56rem）且 `Body` 固定 `align="start"`，内容被拉宽并左贴导航，观感像普通列表页。
页面代码又不能自写 `mx-auto`/`max-w-*`（no-layout-classes），几何必须由 surface 提供。

## 改动

- `blocks/surfaces`：`Body` 的 `Width` 增加 `narrow`（max-w-2xl，42rem）。
- `blocks/section-nav`：`SectionLayout` 新增 `align`（默认 `start`，向后兼容），透传给 `Body`；
  设置页标准形态 = `width="narrow" align="center"`（导航列固定，内容列居中）。
- 参考原型 settings 切到 `narrow + center`；`patterns/settings.md` 规则改为「≤ 42rem 且居中」。
- quiet-inset 0.6.10 / workbench-shell 5.0.22。

## Conflict check

- `Body` 新增宽度键不改变既有 `reading/form/full`；`SectionLayout` 默认 `align="start"`，既有消费端输出不变。
- 无 token / 对比度影响。

## Validation

- `make sync` + `make check`（48 tests）；validate ×2 0 error。
- 消费端：tsc/eslint/build/vitest、fidelity 7/7、validate project 0 error；宽屏下导航列在左、内容列 42rem 居中；
  窄屏（<720px）横排导航 + 全宽内容；线上部署后复核。
