# Template Certification Gate v1

官方 Template Package 的 publish、version upgrade 或 catalog replacement 必须附带通过的 Template Certification Gate 结果。gate 未通过或证据缺失时，生产 `templates/INDEX.md` 与 `skills/ui-template-author/catalog/` 保持原状。

## Gate 输入（全部固定）

| 输入 | 约束 |
| --- | --- |
| Visual Oracle | 固定 git revision；出处只留在 `meta.sources[]` 与 AGENTS 出处段 |
| Candidate package | `governance/candidates/<name>/`；digest 为 canonical contract digest |
| 固定 prompts | prompts 文件或目录 tree digest；不写入 package |
| Output root | 显式声明；必须干净（不存在或为空），禁止复用已修补的上一轮生成物 |
| Build identity | 每次重生取 fresh 值；`latest` 无效 |

## 执行流程

```bash
# 1. 前置：source-blind gate identity + clean output root
python3 scripts/run_template_certification.py prepare \
  --oracle-revision <fixed-revision> \
  --package governance/candidates/<name> \
  --prompts governance/candidates/<name>/prompts \
  --output-root <explicit-clean-root> \
  --build-identity <fresh-build-id>

# 2. 通过普通 Apply（bootstrap | increment）在 output root 干净生成；
#    Apply 不接收原版 checkout、meta.sources[] 路径或历史生成物。

# 3. 生成 certification inventory（oracle 侧 source facts，replayable provenance）
python3 scripts/run_template_certification.py validate-inventory \
  governance/candidates/<name>/certification/inventory.yaml

# 4. 验收：Pattern Equivalence Records + inventory 对照 + source-blind 扫描
python3 scripts/run_template_certification.py verify \
  --report governance/candidates/<name>/certification/report.yaml \
  --inventory governance/candidates/<name>/certification/inventory.yaml \
  --package-root governance/candidates/<name> \
  --output-root <explicit-clean-root> \
  --oracle-revision <fixed-revision>
```

## 失败回写边界

- `package`：Pattern/token/evidence 契约缺口 → 更新 candidate 后重新认证。
- `apply-skill`：阶段、取证或 source-blind 执行不稳 → 修 Apply skill 后重新认证。
- `certification-prompt`：build/oracle 身份失配或 assertion 设计不足 → 修固定 prompts 后重新认证。

禁止通过修改上一轮生成物并复用旧 identity 来闭合失败；output root 不干净或 identity 复用时 gate 拒绝。

## Promotion request（release check）

`governance/candidates/<name>/promotion-request.yaml` 声明 `target: production-catalog`、`oracle_revision` 与 `prompts_digest` 后，`check_active_release.py` 会要求同目录 `certification/report.yaml` 为 accepted 且绑定当前 candidate digest、同一 oracle revision 与 prompts digest；candidate、prompts 或 oracle 任一变化都会使报告过期并阻止 promotion。生产 catalog 切换本身仍需用户单独确认，不随 gate 自动执行。
