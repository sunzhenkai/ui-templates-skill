# 限定 manager 仅处理路由歧义

- target: .agents/skills/ui-template-manager
- mode: update
- patch: 20261118-235526-tighten-auto-trigger
- risk: high
- status: proposed

## Intent

只在本仓库内需要选择 apply、design、author、cleanroom 工作流时触发；目标 Skill 已明确时直接进入目标，仓库外任务不触发。不修改路由表。

## Conflict check

与 apply、design、author 的配套 patch 互指同一组职责边界；保留正文全部路由规则，无流程冲突。

## Rationale

原描述以宽泛的“实现/修页面”开头，可能与实际执行 Skill 同时命中。把“需要路由”设为必要条件可减少重复拦截，同时保留歧义请求的内部导航能力。

## Files

- .agents/skills/ui-template-manager/SKILL.md：仅修改 frontmatter description。

## Validation

- `git apply --check --recount` 检查补丁。
- 核对目标明确、目标有歧义及仓库外请求案例。
- 运行 `make check`，覆盖仓库门禁和测试。
