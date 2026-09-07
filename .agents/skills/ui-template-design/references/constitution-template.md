# Constitution template

写入输出根 `design-system/CONSTITUTION.md`（或等价）。这是给人读的散文；强制执行靠 [executable-rules.md](executable-rules.md) 的独立规则文件。

不要把精确值复制第二份：引用 token 名。禁止默默覆盖项目根 `AGENTS.md`。

```markdown
# Frontend Design Constitution

## General
- Prefer information density over decorative UI.
- Never invent a new visual style if a Pattern exists.
- Generated UI is not the fix surface: change tokens, primitives, or patterns, then regenerate.

## Tokens
- Never use raw palette classes or hex in components or pages.
- Use semantic roles: foreground, muted-foreground, border, primary, destructive, success, warning.

## Layout
- Spacing comes from the spacing scale only.
- Page chrome comes from registered Patterns only.

## Components
- Primitives live in the ui root.
- Patterns live in the pattern root.
- Domain components must not re-export Button/Input/Dialog.

## Motion and breakpoints
- Only the motion whitelist.
- Only registered layout presets (Page, TwoColumn, MasterDetail). Do not invent per-page breakpoints.
```
