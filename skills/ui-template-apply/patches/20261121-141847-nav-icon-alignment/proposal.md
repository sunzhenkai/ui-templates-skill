# Proposal — 二级导航对齐一级：icon + 文字、无卡片

## Intent

消费项目反馈二级菜单（帮助目录、文档大纲）应为「一级菜单同款」：icon + 文字，且不放在卡片
（Panel）里。现状 NavItem 只有文字、行高 32px，且页面用 Panel 包裹造成「卡片里的表格」观感。

## 改动

- `blocks/surfaces`：NavItem 支持 `icon`（16px 前导）与 `indent`（大纲层级）；行高 32 → **28px**
  （与 sidebar 一致）；NavList 去掉自带 `p-1`（边距交给容器，Split side 已有 p-3）。
- quiet-inset 0.6.4 / workbench-shell 5.0.16。
- 设计原则：同一层级一种导航外观（icon + 文字、28px、hover/active 面）。

## Validation

- validate ×2 0 error；make check 48 OK（skip=1）
- 消费项目：help 去 Panel + 11 个章节语义图标；wiki 大纲去 Panel + Hash 图标 + 层级缩进；
  fidelity 7/7；部署后线上复查
