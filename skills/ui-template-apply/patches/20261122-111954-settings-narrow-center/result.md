# Result — 设置内容列 ≤42rem 居中

## 落点

- `blocks/surfaces.tsx`：`Width` 增加 `narrow: "max-w-2xl"`（42rem）。
- `blocks/section-nav.tsx`：`SectionLayout` 新增 `align`（默认 `start`），`<Body width align>` 透传；
  设置标准形态 `width="narrow" align="center"`。
- `reference/src/pages/settings.tsx`：`SectionLayout ... width="narrow" align="center"`。
- `patterns/settings.md`：规则改为「分区内容宽度 ≤ 42rem 且居中」。
- quiet-inset `0.6.9 → 0.6.10`、workbench-shell `5.0.21 → 5.0.22`。

## 验证

- `make sync` + `make check`：48 tests OK（skip=1）。
- `validate_package.py package` ×2：0 error / 0 warning。
- 消费端（重锁 0.6.10）：tsc/eslint/build/vitest、fidelity 7/7；宽屏内容列 672px 居中、导航列在左；
  窄屏横排导航 + 全宽内容；深链与 active 复核通过；线上部署后复核。
