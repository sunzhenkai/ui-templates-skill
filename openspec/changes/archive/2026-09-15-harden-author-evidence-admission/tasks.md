## 1. Evidence schema 与契约

- [x] 1.1 在 `schemas/design-system/v1/evidence.schema.json` 增补可选 `scope`（`surface | product`）与 `recurrence_refs`（string 数组），写清缺省语义为 `surface`，跨字段约束由统一 validator 承担
- [x] 1.2 更新 `schemas/design-system/v1/README` 或等价字段说明（若存在），同步 `scope`/`recurrence_refs` 语义
- [x] 1.3 确认 `common.schema.json` 无需新增 `$defs`；若引入枚举，集中定义并复用

## 2. 统一 validator 交叉校验

- [x] 2.1 `scripts/validate_design_system.py` 增补 `CLAIM_ADMISSION_INCOMPLETE`：`origin: source|computed` 且 `kind` 不属于 `basis`/`default` 的 evidence 必须齐备 `locator` 与非空 `method`/`basis`，且被至少一个消费层引用（Consequence）
- [x] 2.2 实现 Consequence 判定：evidence `target` 解析到已声明 token 路径（含 group/leaf 与 `token/` 前缀）或 stable entity/rule id
- [x] 2.3 增补 `RECURRENCE_UNSUPPORTED`：`scope: product` 时 `recurrence_refs` 必须解析到 active evidence 且覆盖 ≥2 distinct sampled surface
- [x] 2.4 定义 surface 归一化（复用 evidence `locator`/`target`），annotate 每个 recurrence_ref 归属的 surface；无法归一化时按未闭合处理
- [x] 2.5 `origin: default` 条目豁免 Consequence，但强制 `basis` 或 `decision_id`；缺失报 `CLAIM_ADMISSION_INCOMPLETE`
- [x] 2.6 确认 `scope` 缺省为 `surface`：既有 package 省略 `scope` 时不新增失败

## 3. 移除守卫（change-set gate）

- [x] 3.1 `scripts/manage_template_index.py check-changeset` 增补 before/after active stable ID 集合对比
- [x] 3.2 丢失既有 active ID 且 after 未记 `retired`/`superseded` 时报 `SILENT_DECISION_REMOVAL`，并保持 production INDEX 原字节
- [x] 3.3 `scripts/run_authoring_gate.py` 接入同一移除守卫，保证 staging 与 portable 路径行为一致
- [x] 3.4 在 authoring report 契约（`references/authoring-report.md`）增补 `removal_set` 字段与语义

## 4. Skill 与 reference 文档

- [x] 4.1 `skills/ui-template-author/SKILL.md` 不变量补「声明必须过三证准入」与「update 不得静默移除」两句
- [x] 4.2 `references/extraction-layers.md` 新增「声明准入」小节：三证定义、no-op pass、degrade 禁令
- [x] 4.3 `references/source-web.md`：把三证与 recurrence 收成统一准入清单，明确「来源不可得时 omit 或收窄 scope，不得降级写入」
- [x] 4.4 `references/source-repo.md`、`source-image.md`、`source-doc.md` 对齐同一准入清单措辞
- [x] 4.5 `references/authoring-report.md` 增补 removal_set 与准入摘要的报告示例
- [x] 4.6 复核未把 `create-design-md` 的单文件产物模型或「产物内无 citation」绝对禁令带入

## 5. Fixtures 与 eval

- [x] 5.1 `tests/fixtures/design-system/` 增补正例（三证齐备 product scope recurrence 闭合）与反例（悬空 evidence、缺 basis、单 surface 声明 product）
- [x] 5.2 `scripts/run_design_system_evals.py` 注册 `CLAIM_ADMISSION_INCOMPLETE` 与 `RECURRENCE_UNSUPPORTED` 的正反例
- [x] 5.3 增补「历史 package 缺 scope 字段不失败」的回归 case
- [x] 5.4 `skills/ui-template-author/runtime/evals/cases.yaml` 增补移除守卫与准入纪律的 script judge case（`SILENT_DECISION_REMOVAL`）
- [x] 5.5 确认 `declared = parsed = executed > 0` 且所有阻断 judge 通过

## 6. 数据修复与闭环验证

- [x] 6.1 复核 `templates/workbench-shell` 是否存在 `scope: product` 但单 surface 的 evidence；据实收窄 scope 或补齐 recurrence
- [x] 6.2 重算受影响 layer digest 与 `contract_digest`，`validate ... --kind package` 零 error
- [x] 6.3 同步安装态共享 validator 副本（`scripts/sync_design_system_validator.py`），确认无漂移
- [ ] 6.4 `make validate`、`make test`、`make eval` 全绿
- [x] 6.5 在 `openspec validate --all --strict` 下确认本 change 通过

## 7. 说明与阻塞项（harden-author-evidence-admission）

- [x] 7.1 记录本次未纳入的借鉴项（多来源优先级、安装 spec 版本探测、校验输出类别措辞），说明其由现有契约覆盖或另开 change
- [x] 7.2 据实记录 6.4 的阻塞来源（与本 change 无关的既有 catalog/certification 漂移），不伪造补齐

## 8. 阻塞项与说明（harden-author-evidence-admission）

- **6.4（make validate / test / eval 全绿）**：`make eval` 与 `openspec validate --all --strict` 通过；`make test` 只剩 3 条既有 catalog/certification 失败（`test_current_certification_allows_catalog_promotion`、`test_catalog_matches_published_production_library`、`test_promotion_requires_measured_expectations`），`make validate` 只因 catalog package validator 失败。已用 `git worktree` 在 HEAD 复现同一组失败，确认属于既有 `workbench-shell@1.3.2` catalog 与 `@2.0.0` 生产库/certification 漂移，与本 change 无关；catalog promotion/sync 属发布动作，需用户单独确认，故不在本 change 修复。
- **6.1**：`templates/workbench-shell` 无任何 `scope: product` evidence，`CLAIM_ADMISSION_INCOMPLETE` / `RECURRENCE_UNSUPPORTED` 对既有 published 数据零新增失败，无需数据修复。
- **本 change 引入的失败**：仅 `tests/test_contract_eval.py` 与 `tests/test_skill_distribution.py` 的 case 计数随新增 2 条 script case 更新，已同步。
