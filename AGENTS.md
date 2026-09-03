# AGENTS.md

面向在本仓库工作的 AI 编码助手的指南。

## 语言约定

- **默认使用简体中文**：与用户的对话、文档、说明文字一律使用简体中文。
- 代码、命令、标识符、文件路径等技术内容保留原文。
- 写入仓库的文档与注释默认使用简体中文（除非文件本身已有其他语言约定）。

## 项目概述

`ui-templates-skill` 是两个可共享 skill 的源码仓：**`ui-template`** 负责从 Web 站点、代码仓库、图片、设计文档中提取 UI 设计风格，沉淀为可复用的设计规范文档并维护模板库；**`ui-template-apply`** 负责使用已有模板分阶段落地真实页面。两者通过 `templates/` 目录的公开数据契约解耦。仓库还维护一个 `templates/` 模板库（既是非平凡示例，也是实际可用的模板集合）。

## 仓库现状

- 单一 git 分支历史，起始于 `001fb8c Initial commit`。
- 无任何配置文件：没有 `package.json`、`pyproject.toml`、`Cargo.toml`、`Makefile`、CI 配置或任何锁文件。
- `skills/ui-template/` — **Template Authoring + 模板库管理 skill 的单一源码**，可安装/共享到其他项目（安装方式：把该目录拷贝到目标项目的 `.agents/skills/` 或等效 skill 目录）。其结构：
  - `SKILL.md` — 触发条件、Authoring 流程、格式契约所有权、模板反馈消费；检测到 Apply 意图时提示移交 `ui-template-apply`。
  - `references/spec-format.md` — `spec.md`（Non-negotiables）、`tokens.yaml`、`meta.yaml`（coverage）字段定义、大型规范拆分与 `apply/` 边界约定。
  - `references/source-web.md` / `source-repo.md` / `source-image.md` / `source-doc.md` — 四类来源的提取指南（doc 为设计文档来源：布局规则精确转写、视觉缺口回填 `origin: default` 默认值）。
- `skills/ui-template-apply/` — **Template Apply skill 的单一源码**，同样可安装/共享。其结构：
  - `SKILL.md` — Apply 触发条件、阶段列表（0-9，一行一阶段 + gate）、消费契约摘要、工具路由、反馈产出与汇报要求。
  - `references/template-contract.md` — 消费方不变量（`spec.md` 优先级、`tokens.yaml` 唯一性、`origin` 读取语义、coverage 驱动验收严格度）；格式权威来源仍是 `ui-template/references/spec-format.md`。
  - `references/apply-workflow.md` — 使用已有模板实现 UI 的阶段、产物、gate、中断恢复和反馈闭环。
  - `references/toolchain.md` — Template Apply 的默认工具链（`ui-ux-pro-max`、`frontend-design`、shadcn、浏览器工具、design review）与缺失回退。
  - `references/quality-gates.md` — 路由语义、可访问性、响应式、URL 状态、computed style 和浏览器验收门禁。
- **完整能力需同时安装两个 skill 目录**：只装 `ui-template` 无法覆盖"用模板实现页面"类请求，只装 `ui-template-apply` 无法覆盖"做成模板/提取风格"类请求。
- `.agents/skills/ui-template-manager/` — 本仓库的项目级 skill（路由薄封装）：按意图分别指向 `skills/ui-template/` 与 `skills/ui-template-apply/`，只补充本仓库约定。**改 Authoring 流程或模板格式时改 `skills/ui-template/`；改 Apply 流程或工具链时改 `skills/ui-template-apply/`；不要只改 manager。**
- `templates/` — 模板存放目录，按 `skills/ui-template/references/spec-format.md` 的约定维护（含 `templates/INDEX.md` 索引）。现有模板：
  - `workbench-shell/` — 工作台/后台型 App Shell 布局规范（用户提供的设计文档导入，业务实体已泛化）；`spec.md` 为共享核心（开篇 Non-negotiables），精确值在 `tokens.yaml`（颜色/字体为 `origin: default` 默认值，字号/间距/圆角来自来源），平台外壳差异在 `platforms/{web,mobile,desktop}.md`，页面模式在 `routes-and-layouts.md`，组件契约在 `components.md`，实施顺序与验收在 `apply/`。模板不携带目录契约、API/data 分层或 stack adapter。

## 构建与测试命令

- 模板契约校验：`python3 scripts/validate_templates.py`（需要 Python 3 与 PyYAML）。新增/修改 `templates/` 后必须运行并通过。
- 其余构建/测试步骤未定义。不要臆造或假设工具链；如果任务需要其他构建或测试步骤，先检查仓库中是否已新增相关配置；如果没有，就如实说明，而不是编造命令。

## 代码风格指南

目前还没有代码，因此没有既定风格约定。添加第一批代码时：

- 保持最小化、自包含；skill 类仓库通常只需要一个带 YAML frontmatter 的 `SKILL.md`，加上其引用的模板/资源文件。
- 文档与注释使用简体中文（README 亦为简体中文）。
- 遵守仓库 MIT 许可证的版权声明要求（见 `LICENSE`）。

## 测试说明

现有确定性检查：`python3 scripts/validate_templates.py`（模板必备文件、tokens origin/主题一致性/对比度、meta coverage、INDEX 行、禁入工程结构）。如果之后添加了其他测试，请在此处记录运行它们的确切命令。

## 安全注意事项

- 仓库当前不包含任何密钥、依赖或可执行代码，攻击面为零。
- 添加模板文件或脚本时，不要提交凭据、API 密钥或特定环境的路径。Skill 文件可能被 AI 助手直接消费——`SKILL.md` 中的指令不应包含任何你不希望被助手逐字执行的内容。

## 在本仓库工作

由于项目处于最初期，在假设预期架构之前，优先询问用户（或查看最近的提交）。每当引入真实结构——清单文件、源码目录、构建/测试命令、约定——时，请更新本 `AGENTS.md`。
