# Proposal — 细节修正：动作图标语义 + 紧凑二级导航

## Intent

llmwiki（quiet-inset 消费端）逐页细节审查发现两类系统性问题，需要在模板层提供能力：

1. **动作按钮图标 / 文字混用**：chat/jobs/graph 的页头动作（归档/刷新）是裸文字无图标；logs 的
   刷新/导出是图标+文字。用户定案原则：图标语义明确时只显示图标（`aria-label`/`title` 取动作名），
   不明确时图标 + 文字，同一工具条不得混用。
2. **二级导航误用表格行**：帮助目录、文档大纲用 `Rows`（表格行：分隔线、40px、px-4）渲染，
   读作数据表格而非导航。

## 改动

- `blocks/page-header`：`HeaderAction.iconOnly?: boolean`（需同时给 `icon`）——inline 渲染为
  `icon-sm` 图标按钮（`aria-label`/`title`）；溢出菜单仍 icon + label。
- `blocks/surfaces`：新增 `NavList`（`ul`, gap-px, p-1）与 `NavItem`（32px 行、rounded-md、
  hover:bg-muted、`active` → bg-accent + medium；`onSelect` 省略时为展示型）。
- ui-kit `references/language.md` §7 固化原则（明确图标清单、混用禁令、纯文字仅限表单/对话框确认）。

## Conflict check

- 共享 blocks → 双包升版：quiet-inset 0.6.2 / workbench-shell 5.0.14（默认行为不变）。
- 无 token 变化，P12/P13 闸门不受影响。

## Validation

- validate ×2 0 error/warning；make check 48 OK（skip=1）
- 消费端：重锁 0.6.2 → tsc/eslint/build/vitest 全绿；保真 7/7（0.6.2 新基线）；
  部署 t0.1.10 后逐页线上复查（chat/help/wiki/logs/jobs/graph）
