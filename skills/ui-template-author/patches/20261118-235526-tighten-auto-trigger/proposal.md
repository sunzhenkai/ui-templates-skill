# 消除 author 的模板触发歧义

- target: skills/ui-template-author
- mode: update
- patch: 20261118-235526-tighten-auto-trigger
- risk: high
- status: proposed

## Intent

仅在目标是 ui-template 风格包时触发来源提炼、维护和发布；网页仿建、通用模板制作及从零品牌设计不再因“模板”或“风格包”字样误入。不修改提炼和发布流程。

## Conflict check

与 apply、design 的配套 patch 共同明确页面实现、从零设计和来源提炼的边界；与正文职责一致，无流程冲突。

## Rationale

原描述首句准确，但示例中的“做一套模板”和未限定的“升级/发布风格包”仍可能匹配其他产物。将触发条件统一到 ui-template 风格包可减少歧义。

## Files

- skills/ui-template-author/SKILL.md：仅修改 frontmatter description。

## Validation

- `git apply --check --recount` 检查补丁。
- 核对核心、近似和交叉路由案例。
- 运行 `make check`，覆盖 frontmatter、文档预算和仓库测试。
