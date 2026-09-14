# Proposal: close-fidelity-truth-gaps

## Why

闭环复核实证：当前提取 → 应用链路只保证**自洽**，不保证**保真**。唯一的 oracle 对照点 Template Certification Gate 接受 `oracle-*.provenance.json` 占位文本作为 oracle 侧证据、断言值为自报数值（validator 仅检查文件存在），而 Apply 的 Phase 8 required scenario 由模板自身派生——「包盲区 = 验证盲区」，所以会出现 17/17 通过却与原版形态不符的结果（1.3.1 复审实证四类走样）。同一时间，provenance / coverage / confidence 三条声明约束在 `design-system/v1` 契约里没有 validator 实现，包内已出现 26 条 evidence 指向未声明的 `879d0de9…` revision、coverage 未完备互斥（35 declared / 12 classified）、`confidence.components: high` 与 `defaulted` 并存。必须在「生成物不是修复面」与「Apply 零原版依赖」两条不变量不变的前提下，把保真证据从自报改为 oracle 锚定，并把锚定结果冻结成 Apply 可 source-blind 消费的期望值。

## What Changes

- **Certification 改为 oracle 锚定（BREAKING）**：每条 Pattern Equivalence Record SHALL 引用 oracle 侧可复核证据——真实截图，或 oracle 侧 DOM / computed-style 测量（含方法、采集时间、oracle revision 与内容摘要）；占位文件、纯文本说明、无 oracle 引用的自报数值 SHALL fail closed。oracle 不可部署时 gate 只能产出 `self-consistency` 结论并阻止 promotion，SHALL NOT 宣称 Visual Equivalence。
- **冻结 measured expectations 并随包发布**：gate SHALL 从 oracle 测量产出绑定 package digest 的期望值集合（dimension、method、tolerance、oracle evidence ref），覆盖 certification inventory 的全部 Pattern 与声明维度；catalog 条目 SHALL 同时携带 package 与该集合，缺失即拒绝 promotion。
- **Apply 增补 oracle 锚定比对**：Phase 8 在模板派生 scenario 之外 SHALL 消费随包发布的 expectation 集合做 current-build 比对（不读取 oracle）；绑定 package 无 expectation 集合时 SHALL 显式降级为 `fidelity-unverified`，SHALL NOT 声称保真通过。
- **validator 补齐三条交叉校验（BREAKING）**：evidence 的 `source_id`/`source_revision` 必须解析到 `meta.sources[]`；coverage 的每个 `declared` 项恰属 `observed | defaulted | unsupported` 之一且三者互斥；confidence 与 coverage 一致（`overall` 不高于最弱必需维度，`defaulted` 存在时该维度不得 `high`）。
- **release / catalog 绑定修正**：promotion guard SHALL 绑定**被提升** package 的 id / version / contract digest（当前只检查报告存在与状态，且 `status == "accepted"` 与 schema 的 `passed | failed` 互斥导致永远为假）；`build` / bundle SHALL 校验 catalog 与生产库一致，否则拒绝打包。
- **workbench-shell 数据修复**：26 条 evidence 的 revision 对齐声明来源或补声明显式来源；coverage 补齐为互斥完备分划；confidence 与 defaulted 一致。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `template-fidelity-certification`: 新增「Oracle-measured certification evidence」与「Measured expectation set」；修改「Visual assertions support equivalence」要求 assertion 引用 oracle 侧测量而非自报数值。
- `design-system-implementation`: 新增「Oracle-anchored expectation comparison」，规定 Phase 8 对 expectation 集合的比对与 `fidelity-unverified` 降级语义。
- `design-system-contract`: 新增「Provenance, coverage and confidence consistency」，规定 validator 的三条交叉校验与稳定错误码。
- `design-system-release`: 修改「Official package certification evidence」，绑定被提升 package identity/digest、修正状态字段与 catalog 新鲜度校验。
- `design-system-authoring`: 修改「L0–L6 映射与诚实覆盖」，要求 coverage 互斥完备与 confidence 一致。

## Impact

- **代码面**：`scripts/run_template_certification.py`（oracle 证据采集与内容校验、expectation 生成）、`scripts/validate_design_system.py`（三条交叉校验 + oracle 证据结构校验 + `fidelity-unexpected`/`COVERAGE_*`/`CONFIDENCE_*` 错误码）、`scripts/check_active_release.py` 与 `scripts/skill_distribution/catalog.py`（promotion 绑定与新鲜度）、`schemas/design-system/v1/{evidence,meta,fidelity-certification}.schema.json`、`skills/ui-template-author/`（expectation 发布契约与 reference）、`skills/ui-template-apply/`（Phase 8 消费与降级）、fixtures / eval / baseline 同步；`templates/workbench-shell` 数据修复与重新取证。
- **兼容性**：新增校验均为 fail-closed 前向收紧；已发布 package 若 provenance/coverage/confidence 不合规将在下次校验时失败，需按本 change 的数据修复项对齐。oracle 锚定要求使既有 `accepted` 认证结论失效，必须重新认证后才能 promotion。
- **非目标**：不改 `.agents/skills`、不改 public skill 镜像；不重写 `openspec/changes/archive/**`、`skills/**/patches/**`、`skills/**/experience/**` 等 immutable history；不自动 publish / tag / promote / archive；**不含 review 结论中的 P2 减仪式项**（逐轮必答矩阵收敛、digest 合并、skill 拆分评估等），P2 应另开 change。
- **依赖关系**：与 pending 的 `close-layout-fidelity-blind-spots`、`close-state-presentation-blind-spots` 在 `design-system-implementation` 与 `structural-fidelity-profile` 邻近；本 change 用新增 requirement 而非改写 `Current-build verification` 标题，避免与两者在 archive 时冲突。expectation 集合的覆盖面依赖两者定义的必答事实矩阵先收敛。
