## Why

`skills/ui-template` 的 SKILL.md body 常驻加载了 Template Authoring 与 Template Apply 两条互不重叠的流程：做 Authoring 时加载了 Apply 的 10 个阶段与验收门禁，做 Apply 时加载了 4 种来源提取指南；8 个 reference 也已天然分裂为 Authoring 专用（5 个）与 Apply 专用（3 个），真正共享的只有模板目录数据契约。拆分可以显著降低每次触发的无关上下文，并让两侧流程独立演进。

## What Changes

- 新建独立 skill `skills/ui-template-apply/`，承接 Template Apply 全部流程：阶段化实施、toolchain adapter、真实浏览器验证、design review、模板反馈闭环。
- `skills/ui-template/` 收窄为 Template Authoring + 模板库管理：保留 4 个 source guide 与 `spec-format.md`（模板格式唯一归属），移除 Apply 专属正文与 reference。
- 新增精简消费方契约文档 `ui-template-apply/references/template-contract.md`：只定义 Apply 读取模板时的不变量（`spec.md` 优先级、`tokens.yaml` 唯一性、`origin` 语义、coverage 驱动的验收严格度），不复制 Authoring 的格式生成规则。
- 两个 skill 通过 `templates/` 数据目录松耦合通信：Apply 产出结构化模板反馈记录，由 Authoring 在下次更新模板时消费；不共享流程文档。
- 调整 `.agents/skills/ui-template-manager/`：按意图路由到两个 skill，或拆成对应 manager 薄封装。
- 将 `evals/`、`experience/` 中 Apply 专属条目迁移到新 skill；历史 `patches/` 留在原 skill 作为演进档案。
- 更新 `AGENTS.md` 的仓库现状、skill 结构与修改约定说明。
- **BREAKING**：`ui-template` 的触发面收窄，不再响应"用模板实现页面"类请求；这类请求改由 `ui-template-apply` 响应。

## Capabilities

### New Capabilities
- `ui-template-apply-workflow`: 使用已有 UI 模板实现真实 UI 的独立 skill 工作流，覆盖阶段化实施、模板消费契约、toolchain adapter、真实浏览器验证、design review 与模板反馈闭环。

### Modified Capabilities
- `ui-template-workflow`: 从"双工作流单 skill"收窄为"Authoring + 模板库管理 + 模板格式契约所有权"；Apply 相关 Requirements 移出到新 capability，并在 Authoring 与 Apply 之间定义基于模板数据契约的移交与反馈边界。

## Impact

- `skills/ui-template/SKILL.md`：删除 Apply 正文，重写触发 description，保留 Authoring、契约所有权与反馈消费。
- `skills/ui-template/references/`：保留 `spec-format.md` 与 4 个 `source-*.md`；迁出 `apply-workflow.md`、`toolchain.md`、`quality-gates.md`。
- 新建 `skills/ui-template-apply/`（SKILL.md + 4 个 reference + 归属调整后的 evals/experience）。
- `.agents/skills/ui-template-manager/`：更新路由或拆分。
- `AGENTS.md`：同步 skill 结构与修改约定。
- `scripts/validate_templates.py` 与 `templates/`：无行为变更；validator 继续作为 Authoring 侧写入门禁。
- 使用方：安装旧版单 skill 的项目需要同时安装两个 skill 才能覆盖原有全部触发面。
