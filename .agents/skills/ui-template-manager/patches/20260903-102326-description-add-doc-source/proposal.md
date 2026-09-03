# manager description 补设计文档来源

- target: .agents/skills/ui-template-manager
- mode: update
- patch: 20260903-102326-description-add-doc-source
- risk: low
- status: proposed

## Intent

与通用 skill Patch C 对齐：frontmatter description 的来源枚举补“设计文档”，使 manager 触发描述与新阅读清单（source-doc.md）一致。非目标：不改其他行为。

## Conflict check

none（与 Patch B 的阅读清单及通用源码 doc 类型一致）。

## Rationale

description 是 manager 路由入口；枚举缺口可能导致设计文档导入请求不被路由。属用户已批准的收尾项。

## Files

- `.agents/skills/ui-template-manager/SKILL.md` — 仅 frontmatter description 一处。

## Validation

- `git apply --check --recount` 通过；应用后 frontmatter 仍可被 YAML 解析、name 不变。

