# schema v2 → design-system/v1 migration source

1. 冻结 session source（如可用）和变更集合，选择 `tokens-only | ui-kit | page-system` capability。
2. 使用迁移器生成 candidate；不得直接写 `templates/` 或 Author catalog。
3. 检查 `migration.yaml`：`unresolved` / `errors` 必须为空；`mapped/defaulted/dropped` 必须可审计。
4. `page-system` candidate 必须补齐结构化 placement topology、Page Type/Pattern closure、evidence 和 source replay；无法闭合时显式降级 capability 或停止，不得用 prose/实现默认补齐。
5. 运行 `python3 scripts/validate_design_system.py validate <candidate> --kind package --migration <receipt> --json`。
6. 通过后按用户单独 publish 确认更新 production `templates/`、INDEX 与 Author catalog；失败保持原字节。
7. 旧 `design-freeze/v1` 必须先生成 active-instance migration receipt；unresolved 未清零不得 freeze。
