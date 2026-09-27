# feedback-checkpoint fixtures

本目录保留给后续生命周期任务；schema 正反样例当前位于 `../schema/`。运行时 fixture 在 `tests/test_template_apply_state.py` 中创建：当前模板显式声明 `name: demo` 与 `template_version: 2.0.0`，checkpoint 绑定同一 name/version；正常 feedback merge 引用 `.ui-template-apply/evidence/a.json`、`b.json` 真实文件并提供 known rule IDs。
