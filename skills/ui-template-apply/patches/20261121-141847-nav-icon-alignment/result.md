# Result — nav-icon-alignment

## 交付

- `NavItem`：`icon` / `indent` / 28px 行高；`NavList` 去 p-1
- quiet-inset 0.6.4 / workbench-shell 5.0.16
- 消费项目：帮助目录（Panel→裸 NavList，11 章节语义图标）、文档大纲（Hash + 层级缩进）

## 验证

validate ×2 → 0 error；make check 48 OK（skip=1）；消费项目 tsc/eslint/build/vitest、fidelity 7/7；
线上复查通过（icon + 文字、无卡片、28px 行）。
