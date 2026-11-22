# Proposal — SectionNav 分区导航支持图标

## Intent

多分区设置页用 `SectionLayout` 做二级导航时，导航项只有纯文字，与侧栏 NavItem（16px icon + 文字）的
视觉语言不一致；消费端希望设置分区导航带图标（如模型/存储/访问/集成/文件），用户扫读更快。

## 改动

- `blocks/section-nav`：`SectionNavItem` 新增可选 `icon?: React.ReactNode`；`Entry` 改为
  `flex items-center gap-2`，图标按 `[&_svg]:size-4` 渲染（16px，与侧栏一致）；无图标的条目保持纯文字，
  既有消费端不受影响。
- 参考原型 `reference/src/pages/settings.tsx`：分区导航补 Settings/Bell/TriangleAlert 图标作为示例。
- `patterns/settings.md`：规则补一行——分区导航项可带 16px 图标，图标只做辅助、标签必须保留。
- quiet-inset 0.6.9 / workbench-shell 5.0.21。

## Conflict check

- `SectionNavItem` 新增字段为可选，纯文字用法逐字不变；`description` 字段语义不动。
- 无 token / 对比度 / 布局影响（图标 16px 与 NavItem 同档）。

## Validation

- `make sync` + `make check`（names/registry/catalog/unittest）。
- `validate_package.py package` ×2：quiet-inset / workbench-shell 均 0 error。
- 消费端（重锁 0.6.9）：tsc/eslint/build/vitest、fidelity 7/7；设置页 5 分区导航带图标，
  宽屏竖排/窄屏横排、active 高亮、深链直达全部逐态验收；线上部署后复核。
