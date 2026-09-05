# frontmatter description 补设计文档来源

- target: skills/ui-template
- mode: update
- patch: 20260903-102314-description-add-doc-source
- risk: low
- status: proposed

## Intent

上一轮已新增 `doc` 来源类型与 `source-doc.md`，但 frontmatter description 的来源枚举仍只列 web/repo/image。补齐“设计文档(Markdown/PDF)”使触发描述与正文一致。非目标：不改其他行为。

## Conflict check

none（与正文“来源四选一”和 Patch A 的 doc 指南一致）。

## Rationale

description 是触发入口；枚举缺口可能导致 doc 来源请求不被路由。属用户已批准的收尾项。

## Files

- `skills/ui-template/SKILL.md` — 仅 frontmatter description 一处。

## Validation

- `git apply --check --recount` 通过；应用后 frontmatter 仍可被 YAML 解析、name 不变。

