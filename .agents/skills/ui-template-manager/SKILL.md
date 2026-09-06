---
name: ui-template-manager
description: 本仓库 templates/ 的项目级薄路由。创建/导入/更新 schema v2 模板时转到 skills/ui-template-author；使用已有模板实现页面时转到 skills/ui-template-apply。仅用于 ui-templates-skill 仓库，不属于公开 bundle。
metadata:
  internal: true
---

# ui-template-manager

本文件只负责路由和仓库位置约定，不拥有 Authoring/Apply 流程或格式定义。

## 路由

- “做成模板 / 提取风格 / 导入、更新、浏览、退役或删除模板” → 读取并执行 `skills/ui-template-author/SKILL.md`；格式权威是其 `references/spec-format.md`，库动词见其 `references/template-lifecycle.md`。
- “用已有模板做页面 / 按模板实现 UI / 搭后台” → 读取并执行 `skills/ui-template-apply/SKILL.md`。catalog 已有 published 官方模板时先播种再 Apply；都没有才先 Authoring。
- 本仓库生产库是根 `templates/`；公开安装带走只读 `ui-template-author/catalog/`。

## 本仓库补充约定

- 模板位于 `templates/<name>/`，生产索引为 `templates/INDEX.md`。
- Authoring 必须执行 Generate → Validate → Eval → Index → Report；任一 gate 失败时 INDEX 保持不变，不得宣称完成。
- Apply 只接受 schema v2 和 `source | computed | estimated | default`，标准状态写入消费项目 `.ui-template-apply/`。
- `skills/` 是生产正文唯一源码。本 manager 仅为 repository-only wrapper，不进入公开双-skill bundle。
- 改 Authoring/格式只改 `skills/ui-template-author/`；改 Apply/工具链只改 `skills/ui-template-apply/`。不得在本文件复制通用阶段、schema 字段或 checker 实现。
