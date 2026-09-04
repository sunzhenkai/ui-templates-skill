---
name: ui-template-manager
description: 本仓库 templates/ 的项目级薄路由。创建/导入/更新 schema v2 模板时转到 skills/ui-template；使用已有模板实现页面时转到 skills/ui-template-apply。仅用于 ui-templates-skill 仓库，不属于公开 bundle。
---

# ui-template-manager

本文件只负责路由和仓库位置约定，不拥有 Authoring/Apply 流程或格式定义。

## 路由

- “做成模板 / 提取风格 / 导入或更新模板 / 浏览模板” → 读取并执行 `skills/ui-template/SKILL.md`；格式权威是其 `references/spec-format.md`，feedback 生命周期见其 `references/feedback-lifecycle.md`。
- “用已有模板做页面 / 按模板实现 UI / 搭后台” → 读取并执行 `skills/ui-template-apply/SKILL.md`。
- 尚无模板却要求实现 → 先由 Authoring 完成 schema v2 模板全部 gate，再移交 Apply。

## 本仓库补充约定

- 模板位于 `templates/<name>/`，生产索引为 `templates/INDEX.md`。
- Authoring 必须执行 Generate → Validate → Eval → Index → Report；任一 gate 失败时 INDEX 保持不变，不得宣称完成。
- Apply 只接受 schema v2 和 `source | computed | estimated | default`，标准状态写入消费项目 `.ui-template-apply/`。
- `skills/` 是生产正文唯一源码。本 manager 仅为 repository-only wrapper，不进入公开双-skill bundle。
- 改 Authoring/格式只改 `skills/ui-template/`；改 Apply/工具链只改 `skills/ui-template-apply/`。不得在本文件复制通用阶段、schema 字段或 checker 实现。
