# Proposal: Design decision gates

## Mode

`update`

## Problem

`ui-template-design` 目前只在任务类歧义和 greenfield 栈确认处明确停止询问；视觉方向、inventory 范围、Primitive 领养方式、Pattern/Page Type、规则位置、Gallery/验证与 freeze 前汇总都可能被 Agent 用默认值推进，用户选择权不足。

## Change

- 新增 `references/decision-gates.md`，定义 blocking 决策必须展示至少 2 个合法候选、影响和授权来源；用户可授权 Agent 决定，但不得静默默认。
- 将该 reference 纳入三类任务必读，并在 SKILL 主流程与完成定义中声明“未回答 gate 不得完成”。
- 为 greenfield、existing refactor 和 iterate 增加各自的架构、范围与 inventory 选择说明。
- `00-intake.md` artifact 增加 `decision_gates` 账本形状。
- 增加 deterministic contract eval 覆盖决策账本、候选数量、授权记录和 freeze 汇总要求。

## Risk

`medium`：改变工作流门禁与完成定义，但保留既有阶段、runtime schema、扫描器和 freeze digest 契约。

## Validation plan

1. `git apply --check --recount`
2. Design contract eval（不带 baseline）
3. 应用后 `git diff --check`
4. 后续同步 active OpenSpec delta 并运行 `openspec validate --all --strict`

## Files

- `skills/ui-template-design/SKILL.md`
- `skills/ui-template-design/evals/cases.yaml`
- `skills/ui-template-design/evals/contracts.yaml`
- `skills/ui-template-design/references/artifact-templates.md`
- `skills/ui-template-design/references/decision-gates.md`
- `skills/ui-template-design/references/existing-refactor.md`
- `skills/ui-template-design/references/greenfield.md`
- `skills/ui-template-design/references/iterate.md`
- `skills/ui-template-design/references/task-classes.md`
