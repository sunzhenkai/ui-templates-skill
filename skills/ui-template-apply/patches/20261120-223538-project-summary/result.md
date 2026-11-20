# Result

- target: skills/ui-template-apply
- mode: update
- patch: 20261120-223538-project-summary
- risk: medium
- status: applied
- applied-at: 2026-11-20T22:40:47+08:00

## Validation

- `git apply --check --recount`: pass
- `git diff --check`: pass
- target tests: `python3 -m unittest discover -s tests -p 'test_install.py' -v`，11 tests OK；`make check`，48 tests OK；设置 `UI_TEMPLATE_ESLINT_DIR` 后复跑 `make check`，48 tests OK、无跳过，names / registry / catalog 均通过
- 实际安装冒烟：生成 `.ui-template.md`，包含 workbench-shell 5.0.9、解析后的安装项及两个项目状态文件入口
- privacy check: pass
- mode check: pass

## Notes

生产改动与 `change.patch` 一致；另在仓库既有 `tests/test_install.py` 增加首次安装、追加安装项和 dry-run 的行为断言。未 sync、commit 或 push。
