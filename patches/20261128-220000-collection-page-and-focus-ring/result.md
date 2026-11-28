# Result

- target: skills/ui-template-apply, templates/{quiet-inset,workbench-shell}
- packages: quiet-inset 0.7.1, workbench-shell 5.0.32
- patch: 20261128-220000-collection-page-and-focus-ring
- status: applied

## Validation

- `make preflight`：pass
  - `build_registry.py` & `sync_catalog.py`：已同步 `library/registry.json` 与 `catalog/{quiet-inset,workbench-shell}`
  - `check_no_project_names.py`：OK（扫描 `skills`, `tests`, `scripts`, `templates` 无项目名命中）
  - `python3 -m unittest discover -s tests -v`：Ran 52 tests in 3.136s，OK（skipped=11，playwright chromium 与 `UI_TEMPLATE_ESLINT_DIR` 未配置）
  - `validate_package.py`：`quiet-inset` 0 error(s), 0 warning(s)；`workbench-shell` 0 error(s), 0 warning(s)
