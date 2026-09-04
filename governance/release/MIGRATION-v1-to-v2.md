# v1 → v2 迁移

bundle 2.0.0 只消费模板 schema v2，不会静默读取 v1。

1. 对 v1 模板运行 `python3 scripts/migrate_template.py <source> <candidate>`，只生成候选目录与迁移报告。
2. 逐项解决报告中的 `unresolved`，确认 token leaf 的 `value`、适用 `unit` 和四值 origin。
3. 补齐 `evidence.yaml`、coverage、稳定 rule ID 与 `apply/`；不得保留 `implementation/` 或 stack/project 工程内容。
4. 用 portable validator 或仓库 validator 校验候选；相关 contract eval 通过后才原子替换并更新 INDEX。
5. 保留原 v1 输入和迁移报告作为回滚证据。
