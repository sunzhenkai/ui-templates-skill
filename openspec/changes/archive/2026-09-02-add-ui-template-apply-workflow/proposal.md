## Why

`ui-template` 目前主要回答“模板从哪里来、规范长什么样”，缺少一个可执行的消费端流程：Agent 经常在选定配色前就开始写页面，或在组件写完后才补 layout、路由与目录结构。同时，`workbench-shell` 是一个高约束的 App Shell 模板，需要一份完整实施 playbook 把模板规则转成按阶段推进、可验收的工程路径。

## What Changes

- 为 `ui-template` skill 增加 **Template Apply** 工作流，与既有 Template Authoring 工作流并列。
- 定义从模板选择、设计方向、设计 tokens、IA/layout、代码结构、基础组件、页面模式、全局浮层、浏览器验证到 design review 的阶段化流程。
- 为每个阶段定义输入、产物、工具配合、回退策略和阶段门禁，避免一次生成不可审查的大页面。
- 引入默认 toolchain adapter：`ui-ux-pro-max` 提供知识检索，`frontend-design` 强制美学承诺，shadcn 提供组件来源，Playwright MCP / chrome-devtools MCP / browser-use 提供浏览器反馈，design review 提供 7 阶段审查。
- 新增 `templates/workbench-shell/implementation/` 完整落地 playbook，覆盖 App Shell、五种页面模式、全部核心组件、响应式状态、URL 状态、可访问性、代码目录与验收清单。
- 修正 `workbench-shell` 响应式矩阵中 web 路径在 compact 与 mobile 宽度下的侧栏行为歧义。
- 建立模板反馈闭环：实现阶段发现的规则缺口和浏览器问题必须评估是否回写到 `workbench-shell` 或通用 skill。

## Capabilities

### New Capabilities

- `ui-template-workflow`: 定义 `ui-template` 的 authoring 与 apply 双工作流、phase gates、toolchain adapter、质量门禁和模板反馈要求。
- `workbench-shell-implementation`: 定义 `workbench-shell` 模板的完整分阶段实施 playbook，覆盖所有页面模式、Shell、组件、目录结构、响应式状态、可访问性与验收。

### Modified Capabilities

## Impact

- 修改 `skills/ui-template/SKILL.md` 的适用范围与工作流入口。
- 新增 `skills/ui-template/references/apply-workflow.md`、`toolchain.md`、`quality-gates.md`。
- 扩展 `skills/ui-template/references/spec-format.md`，允许模板携带 optional `implementation/` playbook。
- 更新 `templates/workbench-shell/spec.md` 的响应式矩阵，使平台路径与断点行为不再有多重解释。
- 新增 `templates/workbench-shell/implementation/` 下的 playbook、stack adapter、组件清单、layout/route 清单、代码结构与质量验收文档。
- 更新 `templates/workbench-shell/meta.yaml` 或索引说明时保持模板仍以规范文档为主体，不把模板变成完整 runnable starter。
- 示例应用 `example/workbench-shell/` 不在本次 proposal 的直接修改范围内；该 change 只沉淀 skill 与模板规则，后续修复示例时按新 workflow 另行执行。
