---
name: ui-template-manager
description: 管理本仓库(ui-templates-skill)templates/ 目录下的 UI 设计规范模板:创建、导入、更新与索引维护。当在本仓库中把某个网站、仓库、图片的风格"做成模板"、或浏览/复用/更新已有模板时使用;提取流程遵循通用 skill 源码 skills/ui-template/。
---

# ui-template-manager — 本仓库模板管理

本仓库是可共享 skill `ui-template` 的源码仓,通用流程与格式定义在 `skills/ui-template/` 下。
执行模板的创建/导入/更新时,**先阅读并遵循**:

- `skills/ui-template/SKILL.md` — 工作流程(定位来源 → 按来源提取 → 生成规范 → 更新索引)
- `skills/ui-template/references/spec-format.md` — spec.md / meta.yaml 格式
- `skills/ui-template/references/source-{web,repo,image}.md` — 三类来源的提取指南

本文件只补充本仓库的特有约定,不重复通用流程。

## 本仓库约定

- 模板统一存放于 `templates/<name>/`;每次新增/更新模板必须同步 `templates/INDEX.md` 索引行。
- 大型规范允许拆分(如 `workbench-shell` 的 `platforms/` 子规格),`spec.md` 为共享核心与入口。
- 语言:文档与注释一律简体中文,色值、字体名、CSS 属性等技术内容保留原文。
- **改动通用流程或格式时,改 `skills/ui-template/`(单一源码),不要只改本文件**;保持 manager 为薄封装。
- 模板自包含、不含密钥与特定环境路径;skill 文件会被 AI 助手直接消费,不写入不希望被逐字执行的内容。

## 复用已有模板

用户说"用某个模板做页面"时:阅读 `templates/<name>/spec.md`(及其拆分子文件),把 token 与规则作为设计约束交给实现方。本 skill 不负责页面实现。
