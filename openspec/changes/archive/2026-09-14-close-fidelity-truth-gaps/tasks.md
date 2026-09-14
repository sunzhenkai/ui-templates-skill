## 1. Contract 与 validator 交叉校验

- [x] 1.1 在 `schemas/design-system/v1/evidence.schema.json`、`meta.schema.json` 补齐 source/revision/coverage/confidence 字段结构，并注明跨字段约束由统一 validator 承担
- [x] 1.2 `scripts/validate_design_system.py` 增补 `EVIDENCE_REVISION_UNDECLARED`：evidence 的 source id/revision 必须解析到 `meta.sources[]`
- [x] 1.3 增补 `COVERAGE_PARTITION_INVALID`：`declared` 每个项恰属 observed/defaulted/unsupported 之一且三者互斥
- [x] 1.4 增补 `CONFIDENCE_INCONSISTENT`：`overall` 不高于最弱必需维度；存在 defaulted 的维度不得为 high
- [x] 1.5 同步共享 validator 副本（含 `skills/ui-template-design/runtime/` 漂移副本），确认 `scripts/sync_design_system_validator.py` 覆盖全部安装态副本
- [x] 1.6 fixtures/eval：三条校验各补正例与反例并注册到 `scripts/run_design_system_evals.py`
- [ ] 1.7 `make test` 与 `make eval` 通过

## 2. workbench-shell provenance 与 coverage 数据修复

- [x] 2.1 核实 26 条 `879d0de9…` evidence 的真实归属（历史来源 vs 误标），产出判定依据记录
- [x] 2.2 按判定修正 `meta.sources[]`（增补显式 source 条目并修正 evidence 指向）或按当前 session source 重新采集
- [x] 2.3 `coverage.components` 补齐为 `declared` 的完备互斥分划（未观察项记 defaulted 或 unsupported，不得重叠）
- [x] 2.4 修正 `confidence`：`overall` 不高于最弱必需维度，存在 defaulted 的维度非 high
- [x] 2.5 重算 `layer_digests` 与 `contract_digest`，package validator 与 `--require-component-family` 通过
- [x] 2.6 authoring report 记录本次 revision 判定、修复范围与未声明变更保持原字节的证明

## 3. Oracle 证据与 measured expectation set（认证侧）

- [x] 3.1 为 workbench-shell 建立可复现 oracle 部署前置检查（固定 revision + 固定启动命令），产出可复算的 oracle 部署声明
- [x] 3.2 扩展 `fidelity-certification.schema.json`：oracle 证据结构（截图 / 测量）、expectation set 引用、独立 accepted 标记
- [x] 3.3 `validate_design_system.py` 增补 `CERT_ORACLE_EVIDENCE_PLACEHOLDER`、`CERT_ASSERTION_UNANCHORED`、测量结构校验与截图内容校验
- [ ] 3.4 `scripts/run_template_certification.py` 采集 oracle 侧截图或测量并写入 report，替换全部 `.provenance.json` 占位证据
- [x] 3.5 新增 `measured-expectations` 产物（schema `design-system-measured-expectations/v1`），绑定 package contract digest、oracle revision 与 prompts digest
- [x] 3.6 校验 `EXPECTATION_SET_MISSING` / `EXPECTATION_DIGEST_MISMATCH` / oracle 或 prompts 变化导致的过期
- [x] 3.7 实现 `self-consistency` 降级路径与措辞禁令（`CERT_SELF_CONSISTENCY_ONLY`）
- [ ] 3.8 按新证据要求重新认证 workbench-shell candidate，产出新的 report 与 expectation set
- [x] 3.9 fixtures/eval：占位证据被拒、自报数值被拒、测量齐备通过、降级阻断 promotion

## 4. Apply 消费与 fidelity 降级（消费侧）

- [x] 4.1 `skills/ui-template-apply/references/apply-workflow.md` 的 Phase 8 增补 expectation 比对、身份绑定与 `fidelity-unverified` 语义
- [x] 4.2 scenario 派生入口（`scripts/derive_apply_scenarios.py` 或等价）纳入 expectation 条目，与模板派生 scenario 取并集
- [x] 4.3 apply checkpoint / verification schema 增加 expectation digest、逐条比对记录与降级状态字段
- [x] 4.4 扩展 source-blind 扫描：expectation set 之外的 oracle 侧数据进入 checkpoint 即判违规
- [x] 4.5 fixtures/eval：比对通过、超差失败、缺 expectation 降级、expectation/build 身份漂移四类
- [x] 4.6 Author skill 与 catalog 分发同步，确保 expectation set 随 package 安装可用

## 5. Release 与 catalog guard 修正

- [x] 5.1 修正 `scripts/skill_distribution/catalog.py` 的 `_certification_accepted` 状态判定与 accepted 标记来源，使其与认证 schema 一致
- [x] 5.2 promotion guard 绑定被提升 package 的 id/version/contract digest，失配报 `CERTIFICATION_PACKAGE_MISMATCH`
- [x] 5.3 `build` 打包前校验 catalog 与生产模板库一致，漂移报 `CATALOG_STALE` 并拒绝发布
- [x] 5.4 测试 `CERTIFICATION_STATUS_INVALID`：guard 以 schema 不可能取到的状态值作为通过条件时必须阻断
- [x] 5.5 清理 `check_active_release` 现红项：`.agents/skills/ui-template-test` 越界判定、shared validator 与 schema 副本漂移
- [ ] 5.6 `make bundle` 产物中的 catalog 与 `templates/` published 版本一致（当前 1.2.0 vs 1.3.2 漂移消除）

## 6. 闭环验证

- [ ] 6.1 `make validate`、`make test`、`make eval` 全绿
- [ ] 6.2 workbench-shell 全链重跑：source gate → validator → oracle 锚定认证 → expectation 发布 → promotion 前置检查
- [ ] 6.3 失败回写演练：注入一条超差 expectation，确认归属为 `package | apply-skill` 且无法通过修改生成物闭合
- [x] 6.4 确认 archive 顺序（两个 pending change 先于本 change），核对与 `Current-build verification` 标题无冲突

## 7. 阻塞项与说明（close-fidelity-truth-gaps）

以下任务在本会话不可完成，原因是 oracle 不可部署与随之而来的 promotion 阻断；它们 SHALL 保持未勾选，不得用降级手段伪造完成。

- **3.4 / 3.8（oracle 采集与重新认证）**：3.1 的 harness 已交付并通过 stub oracle 端到端验证（`scripts/oracle_capture.py` + `tests/test_oracle_capture.py`，真实 PNG + computed-style 测量）。但 `879d0de…` 是完整可自托管产品：Next.js 前端 + Go 后端 + Postgres，且 dashboard/board/settings 等 Pattern 路由需要登录与真实数据，本会话无法建立可复现部署并采集这些路由的 oracle 证据。gate 因此按设计走诚实降级：现有 candidate 重新验证结果为 `outcome: self-consistency`（17 条 `CERT_ORACLE_EVIDENCE_PLACEHOLDER` + 17 条 `CERT_ASSERTION_UNANCHORED`），`governance/candidates/workbench-shell/certification/verify-result.json` 已据实更新。解锁条件：提供 `oracle-deployment.yaml`（固定 revision + install/serve 命令 + 路由/视口/主题/测量矩阵）与可访问的 oracle 部署，然后运行 `scripts/oracle_capture.py capture` 并重新执行认证。
- **5.6（catalog 与生产库一致）**：catalog 同步被 promotion guard 正确阻断（`CATALOG_STALE` / `CERTIFICATION_PACKAGE_MISMATCH` / `EXPECTATION_SET_MISSING`），在 workbench-shell 通过 oracle 锚定认证前不得同步。`make bundle` 现以 `CATALOG_STALE` 明确失败，不再静默打包旧 catalog。
- **6.1（三条命令全绿）与 1.7（make test / make eval）**：`make validate` 与 `make eval` 已通过；`make test` 仅剩 `test_catalog_matches_published_production_library` 一条失败，根因即 5.6 的阻断。
- **6.2 / 6.3（全链重跑与失败回写演练）**：依赖 3.1/3.4/3.8 的真实 oracle，当前不可执行。

### 已实现的降级与防伪机制

- gate 只接受真实图像 oracle 证据或结构化 inline oracle 测量；占位文本一律 `CERT_ORACLE_EVIDENCE_PLACEHOLDER`。
- 无 oracle 锚定的 passed record 一律 `CERT_ASSERTION_UNANCHORED`。
- 结论为 `self-consistency` 时 promotion 以 `CERT_SELF_CONSISTENCY_ONLY` 阻断，输出中不得出现 Visual Equivalence 措辞。
