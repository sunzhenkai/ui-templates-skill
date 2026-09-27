# Result

- target: skills/ui-template
- mode: update
- patch: 20260903-095441-deterministic-template-contract
- risk: medium
- status: applied
- applied-at: 2026-09-03T09:59:08+08:00

## Validation

- `git apply --check --recount`: pass
- `git diff --check`: pass
- target tests: not-available（仓库未配置测试框架；以 YAML 解析与确定性 grep 检查替代）
- privacy check: pass
- mode check: pass（update；未改 self-evolution 结构、未改历史 patches/、未改 templates/）

## Checks

- `evals/cases.yaml` 通过 PyYAML 解析：15 个 case，id 唯一。
- 生产正文（排除 patches/）已无具体模板名特例引用。
- `skills/ui-template/` 生产文件已无旧 `implementation/` 约定；新边界为 `apply/` + 根目录 `components.md`。
- `SKILL.md` frontmatter 合法且 `name: ui-template` 未变。
- 新增 `references/source-doc.md`；来源类型扩展为 web/repo/image/doc。
- Workflow A 新增「3. 归一与决策」，后续步骤已重新编号。

## Notes

- 协议偏差说明：本轮按 manager 自身「通用流程改动必须落在单一源码」的约定，先更新 `skills/ui-template/`（Patch A），manager 薄封装对齐由紧接着的独立 patch（Patch B）完成；两个 patch 各自只触及一个 skill 目录。
- 已知小缺口：frontmatter description 的来源枚举仍为 web/repo/image，未列 doc；请求触发词（做成模板/提取设计规范）已覆盖 doc 场景，正文为四选一。建议在下一次通用源码 patch（如新增校验脚本时）顺手补齐，不为单个词新开 patch 轮次。
- 现有 `templates/workbench-shell` 尚不符合新契约（含 implementation/、无 tokens.yaml），按 proposal 非目标保留原状，需后续单独迁移。
