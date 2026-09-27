# Executable rules

`CONSTITUTION.md` 会被忽略。必须再写一份 Agent 运行时会加载的规则块，并配套扫描。

## 写入位置（默认都写，不覆盖根 AGENTS.md）

- 项目根 `AGENTS.design.md`
- `.cursor/rules/ui-design-system.mdc`（或项目已有的 Cursor rules 目录）

在 `.ui-template-design/05-rules-receipt.md` 提示用户可把片段合并进根 `AGENTS.md`。禁止把根 `AGENTS.md` 整文件换成设计规则。

## 规则块最小内容

```markdown
## Path Aliases (Mandatory)

- primitives → <ui-root>/*     （例：@/components/ui/button）
- patterns   → <pattern-root>/* （例：@/components/patterns/ListPage）
- domain     → <domain-root>/*  （例：@/components/domain/TaskCard）

## Import Rules

- Never import Button/Input/Dialog from domain.
- Never use a raw div as the page container; use Page / ListPage / MasterDetail.
- Never write inline style={{}} or unmapped palette/spacing classes.
- Never create a duplicate of an existing Pattern.
```

## Freeze gate

规则文件缺失、或 `scan_design_constraints.py` 对本次输出根报 error，不得把 freeze 标为 `frozen`。仅有 Constitution 而检查全绿、规则被违反，视为本 skill 失败。
