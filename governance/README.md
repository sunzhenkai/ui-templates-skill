# 模板治理命令（schema v2）

## 环境

先按固定清单创建隔离环境，许可与用途见 [`DEPENDENCIES.md`](DEPENDENCIES.md)：

```bash
python3 -m venv /tmp/ui-template-governance-venv
/tmp/ui-template-governance-venv/bin/python -m pip install -r governance/requirements-governance.txt
```

## Validator

唯一兼容 CLI 入口：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/validate_templates.py [模板目录或 templates 集合目录]
/tmp/ui-template-governance-venv/bin/python scripts/validate_templates.py [路径] --json
```

不传路径时验证根 `templates/`。集合目录中的 `INDEX.md` 会自动参与验证；也可用 `--index PATH` 显式指定。human 与 JSON 模式使用同一排序后的 findings；任一 error 均返回 `1`，依赖缺失返回 `2`。Python 调用方可导入 `scripts/template_validation` 中的 `validate_paths` 或 `TemplateValidator`。

当前 validator 只接受 `schema_version: 2`。v1 不会被静默解释，须使用显式迁移入口。

## 非破坏迁移

```bash
/tmp/ui-template-governance-venv/bin/python scripts/migrate_template.py SOURCE CANDIDATE
```

命令只写 `CANDIDATE`，保留 `SOURCE`，并生成 `migration-report.json` 的 `converted`、`inferred`、`unresolved`、`breaking` 四类记录。重复执行仅允许覆盖带 `.migration-candidate.json` marker 的候选目录；相同输入与决定产生相同文件。

## Scope guard

```bash
/tmp/ui-template-governance-venv/bin/python scripts/check_governance_scope.py --guard-web-v2
```

该命令验证治理三域不交叠，并比较 web-v2 的 HEAD tree 和工作区状态；不会读取其业务文件内容或运行其测试。

## Active/release consistency 与 root gate

```bash
/tmp/ui-template-governance-venv/bin/python scripts/check_active_release.py --json-out governance-reports/active-release.json
make validate REPORT_DIR=governance-reports
```

checker 的路径域来自 `governance/scope.yaml`：active/release 检查本地链接和当前语义，OpenSpec 使用 base + `harden-template-lifecycle` delta 的 effective view 并显式报告 pending overlay；immutable history 只检查可读性，不改写术语；`web-v2`/`web-v3` exclusion 不遍历、不读取内容。root gate 另运行 tests、真实模板 validator、eval JSON/JUnit、OpenSpec strict、bundle 双构建/安装 smoke 与生产 mirror drift，并输出 `exclusions.json`、manifest 和 summary。

## 样例 promotion（默认不执行命令）

先准备含 `frozen_install`、`build`、`static`、`test`、`multi_viewport`、`feedback`、`localization` 七类 gate 的 YAML；每项声明 status、命令和至少一个位于同一 tracked revision 的 evidence。然后运行：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/promote_sample.py \
  --sample example/<sample> \
  --change <change-name> \
  --revision <40-char-commit> \
  --gates /path/to/gates.yaml \
  --output governance-reports/sample-promotion.json
```

该命令只验证声明并生成符合 `schemas/governance/sample-promotion-report.schema.json` 的 evidence-only report，`commands_executed` 固定为 false；它不编辑样例、README 或发布元数据。scope exclusions（包括 web-v2/web-v3）会在任何样例 Git lookup 前被拒绝。
