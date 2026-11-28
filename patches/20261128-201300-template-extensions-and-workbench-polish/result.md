# Result — 模板扩展层机制与 quiet-inset 首个工作台精修扩展

- patch: `20261128-201300-template-extensions-and-workbench-polish`
- packages: `quiet-inset 0.7.0`, `workbench-shell 5.0.31`
- branch: `task/quiet-inset-extensions`（已提交任务分支，未合入 main，未 push，未同步安装副本）

## 验证结果

1. `make preflight`：退出码 0
   - `build_registry.py` / `--check`：up to date
   - `sync_catalog.py` / `--check`：2 packages in sync
   - `check_no_project_names.py`：OK（11 个词，扫描 `skills, tests, scripts, templates` 零命中）
   - `python3 -m unittest discover -s tests -v`：52 项运行，**41 passed，11 skipped**（`test_tooling.CheckRendered` 10 项因环境无 playwright chromium 跳过、`test_tooling.LintRules` 1 项因未设 `UI_TEMPLATE_ESLINT_DIR` 跳过；`test_extensions.py` 4 项全过）
   - `validate_package.py package skills/ui-template-apply/catalog/quiet-inset`：0 error(s), 0 warning(s)
   - `validate_package.py package skills/ui-template-apply/catalog/workbench-shell`：0 error(s), 0 warning(s)
2. `python3 scripts/sync_catalog.py --inspect quiet-inset`：准确输出 `01-workbench-polish` 对基线的覆写（`--sidebar-row-height: 28px -> 30px`、`--sidebar-active-weight: 500 -> 600`）、移除（`--command-item-height`、`--command-item-font-size`）及新增菜单/9 色语义 token。
