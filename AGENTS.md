# AGENTS.md

面向在本仓库工作的 AI 编码助手的指南。

## 语言约定

- **默认使用简体中文**：与用户的对话、文档、说明文字一律使用简体中文。
- 代码、命令、标识符、文件路径等技术内容保留原文。
- 写入仓库的文档与注释默认使用简体中文（除非文件本身已有其他语言约定）。

## 项目概述

`ui-templates-skill` 是可共享 skill **`ui-template`** 的源码仓：从 Web 站点、代码仓库、图片中提取 UI 设计风格，沉淀为可复用的设计规范文档；同时定义使用已有模板分阶段落地页面的 Template Apply 工作流。仓库还维护一个 `templates/` 模板库（既是非平凡示例，也是实际可用的模板集合）。

## 仓库现状

- 单一 git 分支历史，起始于 `001fb8c Initial commit`。
- 无任何配置文件：没有 `package.json`、`pyproject.toml`、`Cargo.toml`、`Makefile`、CI 配置或任何锁文件。
- `skills/ui-template/` — **通用 skill 的单一源码**，可安装/共享到其他项目（安装方式：把该目录拷贝到目标项目的 `.agents/skills/` 或等效 skill 目录）。其结构：
  - `SKILL.md` — 触发条件与双工作流入口（Template Authoring / Template Apply）。
  - `references/spec-format.md` — `spec.md` 章节骨架、`meta.yaml` 字段定义、大型规范拆分约定。
  - `references/source-web.md` / `source-repo.md` / `source-image.md` — 三类来源的提取指南。
  - `references/apply-workflow.md` — 使用已有模板实现 UI 的阶段、产物、gate、中断恢复和反馈闭环。
  - `references/toolchain.md` — Template Apply 的默认工具链（`ui-ux-pro-max`、`frontend-design`、shadcn、浏览器工具、design review）与缺失回退。
  - `references/quality-gates.md` — 路由语义、可访问性、响应式、URL 状态、computed style 和浏览器验收门禁。
- `.agents/skills/ui-template-manager/` — 本仓库的项目级 skill（薄封装）：指向 `skills/ui-template/` 的通用流程，只补充本仓库约定。**改流程/格式时改 `skills/ui-template/`，不要只改 manager。**
- `templates/` — 模板存放目录，按 `skills/ui-template/references/spec-format.md` 的约定维护（含 `templates/INDEX.md` 索引）。现有模板：
  - `workbench-shell/` — 工作台/后台型 App Shell 布局规范（用户提供的设计文档导入，业务实体已泛化）；`spec.md` 为共享核心，平台外壳差异在 `platforms/{web,mobile,desktop}.md`，消费端完整实施顺序、页面模式、组件 inventory、React/Tailwind/shadcn adapter 和验收矩阵在 `implementation/`。

## 构建与测试命令

未定义。不要臆造或假设工具链。如果任务需要构建或测试步骤，先检查仓库中是否已新增相关配置（例如新的清单文件或 scripts 目录）；如果没有，就如实说明，而不是编造命令。

## 代码风格指南

目前还没有代码，因此没有既定风格约定。添加第一批代码时：

- 保持最小化、自包含；skill 类仓库通常只需要一个带 YAML frontmatter 的 `SKILL.md`，加上其引用的模板/资源文件。
- 文档与注释使用简体中文（README 亦为简体中文）。
- 遵守仓库 MIT 许可证的版权声明要求（见 `LICENSE`）。

## 测试说明

目前不存在测试框架或测试文件。如果之后添加了测试，请在此处记录运行它们的确切命令。

## 安全注意事项

- 仓库当前不包含任何密钥、依赖或可执行代码，攻击面为零。
- 添加模板文件或脚本时，不要提交凭据、API 密钥或特定环境的路径。Skill 文件可能被 AI 助手直接消费——`SKILL.md` 中的指令不应包含任何你不希望被助手逐字执行的内容。

## 在本仓库工作

由于项目处于最初期，在假设预期架构之前，优先询问用户（或查看最近的提交）。每当引入真实结构——清单文件、源码目录、构建/测试命令、约定——时，请更新本 `AGENTS.md`。
