# 集合页骨架、控件交互态与按钮焦点环重落

- target: skills/ui-template-apply, templates/{quiet-inset,workbench-shell}
- packages: quiet-inset 0.7.1, workbench-shell 5.0.32
- patch: 20261128-220000-collection-page-and-focus-ring

## Intent

基于最新 `main`（`quiet-inset 0.7.0` / `workbench-shell 5.0.31`）择优重落 `task/ui-kit-p2` 中尚未合入的 4 项通用改进，同时保留 `reference/src/pages/collection.tsx` 的大列表窗口化验证：

1. `ui/button` 键盘焦点环修复：改为 `focus-visible:[outline:2px_solid_var(--color-ring)] focus-visible:[outline-offset:2px]`，确保在 primary / destructive 实底上可见，并纳入 `SOURCE.md` 与 `components.json`（P14）。
2. `stories/primitives` 新增 `States` story 与 `patterns/state` 交互态说明，并在 `fidelity.spec.ts` 增加键盘 `:focus-visible` 行为断言。
3. `page-templates/collection-page`、`stories/collection-page` 与 `blocks/router` 的 `useUrlParams` / `useSearchWriter`，沉淀通用集合页骨架与批量 URL 查询状态管理。
4. `patterns/collection` 指向 `page-templates/collection-page`，`steps/06-iterate` 补充 `--package <name>` 安装新增条目的说明。

## Conflict check

- `ui/button.tsx` 保留 `h-[var(--control-height,2rem)]` 与 `rounded-[var(--button-radius,var(--radius-lg))]` 等既有 token 契约。
- `blocks/router.tsx` 保留 `useAppSearch`、`isActivePath`、`useIsActive`、`pickActive` 等全部既有导出。
- 不改动 `reference/src/pages/collection.tsx`，保留 500 行窗口化原型用于 `DataTable` 虚拟化验收。
- 两包同步升版（`quiet-inset 0.7.1`、`workbench-shell 5.0.32`），全仓不出现具体项目名。

## Files

- `skills/ui-template-apply/library/shadcn/ui/button.tsx`
- `skills/ui-template-apply/library/SOURCE.md`
- `skills/ui-template-apply/contract/components.json`
- `skills/ui-template-apply/library/blocks/router.tsx`
- `skills/ui-template-apply/library/page-templates/collection-page.tsx`（新增）
- `skills/ui-template-apply/library/stories/collection-page.stories.tsx`（新增）
- `skills/ui-template-apply/library/stories/primitives.stories.tsx`
- `skills/ui-template-apply/library/fidelity/fidelity.spec.ts`
- `skills/ui-template-apply/patterns/{collection,state}.md`
- `skills/ui-template-apply/steps/06-iterate.md`
- `templates/quiet-inset/{meta.yaml,CHANGELOG.md}`、`templates/workbench-shell/{meta.yaml,CHANGELOG.md}`
- `skills/ui-template-apply/library/registry.json`、`skills/ui-template-apply/catalog/**`（`make sync` 派生物）

## Validation

- `make preflight`（`sync` → `names` + `registry` + `catalog` + `unittest` → `validate` ×2）
