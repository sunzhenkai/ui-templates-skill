# 收紧 design 自动触发条件

- target: skills/ui-template-design
- mode: update
- patch: 20261118-235526-tighten-auto-trigger
- risk: high
- status: proposed

## Intent

仅当目标明确是 ui-template 主题、风格包或已有包的项目级覆盖时自动选择本 Skill；通用 UI 设计和普通 shadcn/Tailwind 换色不再仅凭关键词触发。不修改设计流程。

## Conflict check

与 apply、author 的配套 patch 共同明确页面实现、视觉设计和来源提炼的边界；与正文「何时用」一致，无流程冲突。

## Rationale

原描述中的“定一套 UI 风格、换主题色、做深色模式”没有限定产物和体系。新描述将 ui-template 作为必要条件，并保留两个相邻 Skill 的路由。

## Files

- skills/ui-template-design/SKILL.md：仅修改 frontmatter description。

## Validation

- `git apply --check --recount` 检查补丁。
- 核对核心、近似和交叉路由案例。
- 运行 `make check`，覆盖 frontmatter、文档预算和仓库测试。
