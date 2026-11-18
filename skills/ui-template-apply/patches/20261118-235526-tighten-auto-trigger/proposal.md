# 收紧 apply 自动触发条件

- target: skills/ui-template-apply
- mode: update
- patch: 20261118-235526-tighten-auto-trigger
- risk: high
- status: proposed

## Intent

仅当用户明确指定 ui-template，或目标项目已有采用痕迹时，自动选择本 Skill 实现或重构 React 页面；普通 React/UI 开发不再仅凭“新建前端、整体改版、修页面”触发。不修改执行流程。

## Conflict check

与 design、author 的配套 patch 共同明确页面实现、视觉设计和来源提炼的边界；与正文职责一致，无流程冲突。

## Rationale

原描述中的通用页面开发词缺少 ui-template 前提，容易覆盖普通前端任务。新描述保留核心能力，同时给出正向条件和排除条件，可用核心、近似及交叉请求检查。

## Files

- skills/ui-template-apply/SKILL.md：仅修改 frontmatter description。

## Validation

- `git apply --check --recount` 检查补丁。
- 核对核心、近似和交叉路由案例。
- 运行 `make check`，覆盖 frontmatter、文档预算和仓库测试。
