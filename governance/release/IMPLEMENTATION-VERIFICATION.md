# harden-template-lifecycle 实施验证

## 结论

`harden-template-lifecycle` 在 revision `c7849c55f17703b277e66cecfba303f3db93414f` 的工作树上完成 11.1–11.7 发布前验证。双 public skill、模板 schema v2、真实 `workbench-shell`、contract eval、bundle、installer、mirror 与 active/release 文档门禁均通过。此结论是本地 release-readiness 证据，不代表已 publish、tag、archive change 或 promotion 样例。

机器证据入口为 [`verification/summary.json`](verification/summary.json)，逐项原始输出保存在 [`verification/`](verification/)。

## 版本与兼容边界

| 项目 | 验证值 |
| --- | --- |
| bundle | `2.0.0` |
| `ui-template` | `2.0.0` |
| `ui-template-apply` | `2.0.0` |
| template schema | `2`（minimum = maximum = 2） |
| Python | `3.13.12` |
| OpenSpec CLI | `1.8.0` |
| governance dependencies | `attrs==26.1.0`、`jsonschema==4.25.1`、`jsonschema-specifications==2025.9.1`、`PyYAML==6.0.3`、`referencing==0.37.0`、`rpds-py==2026.6.3` |

兼容规则见 [`compatibility.yaml`](compatibility.yaml)。bundle 1.x / schema v1 不受 2.0.0 消费者支持，必须按 [`MIGRATION-v1-to-v2.md`](MIGRATION-v1-to-v2.md) 显式生成并解决候选；安装失败或主动恢复使用 [`ROLLBACK.md`](ROLLBACK.md) 中的同一 installer 流程。变更记录见 [`CHANGELOG.md`](CHANGELOG.md)。

## 执行命令与结果

### 11.1 干净治理环境与全量测试

```bash
rm -rf /tmp/ui-template-governance-venv
python3 -m venv /tmp/ui-template-governance-venv
/tmp/ui-template-governance-venv/bin/python -m pip install -r governance/requirements-governance.txt
/tmp/ui-template-governance-venv/bin/python -m unittest discover -s tests -v
```

结果：6 个治理依赖与精确版本完全一致；84/84 tests 通过，覆盖 schema、validator、migrator、checkpoint、feedback、eval、bundle、installer、mirror 与 active documents。证据：[`verification/11.1-summary.json`](verification/11.1-summary.json)、[`verification/11.1-unittest.txt`](verification/11.1-unittest.txt)。

### 11.2 OpenSpec strict 与镜像同步

```bash
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py mirror --check --target .agents/skills
openspec validate --all --strict
openspec validate harden-template-lifecycle --strict
```

结果：生产镜像 findings=0；全仓 strict 4/4；change strict valid。证据：[`verification/11.2-summary.json`](verification/11.2-summary.json)。

### 11.3 真实 workbench-shell

```bash
/tmp/ui-template-governance-venv/bin/python scripts/validate_templates.py templates
/tmp/ui-template-governance-venv/bin/python scripts/validate_templates.py templates --json
```

结果：schema/semantic/contrast 全部通过；`workbench-shell/light` 与 `workbench-shell/dark` 各 `checked=17`、`failed=0`、`skipped=0`、`waived=0`。证据：[`verification/11.3-summary.json`](verification/11.3-summary.json)、[`verification/11.3-workbench-validation.json`](verification/11.3-workbench-validation.json)。

### 11.4 可复现 bundle、portable smokes 与回滚

```bash
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py build --output-dir <output-a>
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py build --output-dir <output-b>
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py install <artifact> --target <empty-project>/.agents/skills
<empty-project>/.agents/skills/ui-template/runtime/run_contract_evals.py --no-baseline
<empty-project>/.agents/skills/ui-template/runtime/validate_templates.py <fixture> --index <INDEX.md> --json
```

结果：两个独立输出目录的 artifact bytes、SHA-256 sidecar 和 checksum 完全相同，artifact SHA-256 为 `d1a8da0a716cc406b85b585fafc3206c9bd0bdb90b1cc05c7b358b068a711d7a`；空项目安装同时得到两个 public skills，44 个 trigger/resource payload 文件验证通过；portable eval 为 declared=parsed=executed=17，portable validator exit=0。损坏 artifact checksum 与损坏 manifest 都在替换前被拒绝，已有双 skill tree digest 不变；`install_bundle(..., fail_after_skill="ui-template-apply")` 故障注入后两个 skill 均恢复原 digest。证据：[`verification/11.4-summary.json`](verification/11.4-summary.json)。

### 11.5 镜像、active/release 与 immutable history

```bash
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py mirror --check --target .agents/skills
/tmp/ui-template-governance-venv/bin/python scripts/check_active_release.py --json-out governance/release/verification/11.5-active-release.json
/tmp/ui-template-governance-venv/bin/python scripts/check_governance_scope.py
git status --porcelain=v1 --untracked-files=all -- openspec/changes/archive 'skills/*/patches' 'skills/*/experience'
```

结果：镜像 findings=0；active/release findings=0；5 个 pending overlays 被显式报告；29 个 immutable history 文件（OpenSpec archive 12、skill patches 9、skill experience 8）均可读，index/worktree 无变化，并按 `readability-only-no-semantic-rewrite` 独立分类。证据：[`verification/11.5-summary.json`](verification/11.5-summary.json)。

## 工作树归属说明

本次 apply 开始前 `.gitignore` 已处于用户修改状态（`M .gitignore`），同时已有未跟踪的 `docs/`、`example/workbench-shell/web-v3/` 与 `semantic-review/`。这些路径不作为本 change 的修改或验证证据；最终范围结论仅由 change 受管路径、明确的 immutable history 状态和 `web-v2` 基线证明。

### 11.6 web-v2 排除证明

```bash
/tmp/ui-template-governance-venv/bin/python scripts/check_governance_scope.py --guard-web-v2
git rev-parse HEAD:example/workbench-shell/web-v2
git diff --name-only -- example/workbench-shell/web-v2
git diff --cached --name-only -- example/workbench-shell/web-v2
git ls-files --others --exclude-standard -- example/workbench-shell/web-v2
```

结果：final HEAD tree 与 task 1.2 baseline 均为 `debc3e5e9f8f08bb87c0a62e17ab83e4a4f85f12`，worktree/index/untracked 均 clean。静态检查证明 Makefile、governance CI 与 root validator 不运行 package/browser sample tests；机器报告记录 `content_read=false`、`commands_executed=false`、`modified=false`。证据：[`verification/11.6-web-v2-exclusion.json`](verification/11.6-web-v2-exclusion.json)。

## 迁移、升级与回滚

- v1 模板迁移：[`MIGRATION-v1-to-v2.md`](MIGRATION-v1-to-v2.md)。迁移器只写候选目录；`unresolved` 未清零前不得替换、入索引或发布。
- 兼容矩阵：[`compatibility.yaml`](compatibility.yaml)。2.0.0 要求双 skill 2.x 与 schema v2，未知 schema/origin fail closed。
- 安装与升级：构建 bundle 后用根 `make install` 安装到 skills 父目录；installer 校验 checksum、manifest、逐文件 digest 与资源引用后替换两个受管目录。
- 回滚：[`ROLLBACK.md`](ROLLBACK.md)。安装先前已验证 artifact；任一 skill 替换失败恢复安装前双目录，其他 skills 与独立 history 不受影响。

## Accepted non-goals

- `example/workbench-shell/web-v2/**`：不读取样例内容、不执行其测试、不修改，也不把质量作为 root governance 通过条件。
- `example/workbench-shell/web-v3/**` 与 `docs/**`、`semantic-review/**`：保持治理排除/WIP，不修复、不 promotion，不用于发布能力声明。
- immutable history：`openspec/changes/archive/**`、`skills/**/patches/**`、`skills/**/experience/**` 不做当前术语重写，只按独立档案策略检查可读性。
- 本次不 publish、不创建 tag、不 archive `harden-template-lifecycle`、不运行 sample promotion；这些动作均需单独请求。
