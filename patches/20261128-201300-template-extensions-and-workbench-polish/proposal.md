# 模板扩展层机制与 quiet-inset 首个工作台精修扩展

- target: templates/<pkg>/extensions, scripts/sync_catalog, validate_package, extract_theme, blocks/*, ui/sidebar, ui/dialog, patterns/*
- packages: quiet-inset 0.7.0, workbench-shell 5.0.31
- patch: 20261128-201300-template-extensions-and-workbench-polish

## Intent

1. **模板扩展层机制（不被再次对齐源覆盖）**：将 `templates/<pkg>/theme.css` 保持为纯参照源基线，新增 `templates/<pkg>/extensions/<id>.{yaml,css}` 作为项目实践演进的独立扩展层；通过 `compose_package.py` 在构建/同步期做 token 级合成进入 `skills/ui-template-apply/catalog/<pkg>/`；`extract_theme.py --update-base` 仅更新基线而完整保留扩展；`validate_package.py` 同时校验基线与合成产物及扩展结构（`P15–P17`）。
2. **首个扩展 `01-workbench-polish` 与配套共享库演进**：把实际工作台应用打磨出的通用设计沉淀为 `quiet-inset` 第一个扩展（主色 `color-mix` 自动联动菜单选中/悬停与左侧指示条、30px/600 侧栏节奏、inset 画布去叠影、Command 紧凑项、`shell.sidebar_rail: false` 与 9 色通用语义色板），并补齐共享组件 token fallback 与 bugfix（`ui/dialog` 防溢出、`Split` 满高、`useContainerWidth` 回调 ref、`AppShell` `rail`/`logo`、`SectionLayout` `keepSearch`）。

## Conflict check

- 共享组件差异全部使用带原默认值的 CSS 变量 fallback，`workbench-shell` 不声明新变量时行为与视觉保持 100% 不变。
- 合成器按唯一块（`:root` / `.dark` / `@theme inline` / `@theme`）原地覆写或追加 token，保证 `validate_package.py` 与 `install_registry.py` 的三方合并继续单块工作。
- 全仓与扩展文件严禁出现具体项目名（过 `make names`）。

## Files

- `skills/ui-template-apply/scripts/compose_package.py`（新增）
- `scripts/sync_catalog.py`
- `skills/ui-template-apply/scripts/validate_package.py`
- `skills/ui-template-author/scripts/extract_theme.py`
- `skills/ui-template-apply/library/shadcn/ui/sidebar.tsx`
- `skills/ui-template-apply/library/shadcn/ui/dialog.tsx`
- `skills/ui-template-apply/library/SOURCE.md`
- `skills/ui-template-apply/library/blocks/surfaces.tsx`
- `skills/ui-template-apply/library/blocks/router.tsx`
- `skills/ui-template-apply/library/blocks/section-nav.tsx`
- `skills/ui-template-apply/library/blocks/app-shell.tsx`
- `skills/ui-template-apply/library/blocks/use-container-width.ts`
- `skills/ui-template-apply/contract/components.json`
- `templates/quiet-inset/extensions/01-workbench-polish.{yaml,css}`（新增）
- `templates/quiet-inset/{meta.yaml,CHANGELOG.md}`、`templates/workbench-shell/{meta.yaml,CHANGELOG.md}`
- `skills/ui-template-apply/patterns/{shell,tree-nav,conversation}.md`
- `skills/ui-template-author/references/{package-format,calibration}.md`、`AGENTS.md`
- `tests/test_extensions.py`（新增）

## Validation

- `make preflight`（`sync` → `names` + `registry` + `catalog` + `unittest` → `validate` ×2）
- `python3 scripts/sync_catalog.py --inspect quiet-inset`
