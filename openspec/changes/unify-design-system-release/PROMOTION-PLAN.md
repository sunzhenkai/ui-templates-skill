# Production promotion plan

此计划在用户单独确认后才执行。candidate 保持只读，不会因本计划本身切换生产。

1. 备份当前 `templates/workbench-shell/`、`templates/INDEX.md`、`skills/ui-template-author/catalog/workbench-shell/` 与 `skills/ui-template-author/catalog/INDEX.md` 的字节清单。
2. 复制 `candidate/workbench-shell/` 到 `templates/workbench-shell/`，但排除 candidate 专用 staging 状态；migration receipt 随 package 保留为审计证据。
3. 用 `release-payload/templates/INDEX.md` 原子替换 production INDEX；替换前后记录 digest。
4. 同步 candidate package 到 `skills/ui-template-author/catalog/workbench-shell/`，并用 `release-payload/catalog/INDEX.md` 原子替换 catalog INDEX。
5. 复制 `release-payload/governance/release/{VERSION,CHANGELOG.md,compatibility.yaml,distribution-v1.yaml,MIGRATION-v2-to-design-system-v1.md,ROLLBACK.md}` 到生产位置；旧 `MIGRATION-v1-to-v2.md` 保留为历史迁移说明。
6. 复制 payload 中 README、AGENTS 与 FUNCTIONAL-LOOP 的已准备内容；不修改 `.agents/skills`。
7. 运行统一 validator、catalog drift、`make validate`、`make test`、`make eval`、两次 `make bundle`、`openspec validate --all --strict`。
8. 全部通过后回填 release tasks；publish/tag 仍需单独请求。
