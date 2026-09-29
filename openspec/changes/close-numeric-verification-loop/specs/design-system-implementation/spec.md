## ADDED Requirements

### Requirement: Numeric Phase 8 verification
Apply Phase 8 MAY 声明 `verification_contract: numeric-v1`；声明后每个 `scenario_id` SHALL 携带结构化 measurement（method、expected、observed、passed、evidence_ref）。缺失、重复、身份漂移、passed/observed 矛盾或 measured expectation 漂移 SHALL fail closed。

#### Scenario: prose verification 被拒绝
- **WHEN** numeric Phase 8 record 只有 prose actual，没有覆盖全部 scenario 的 measurement
- **THEN** checkpoint 报 `VERIFICATION_MEASUREMENT_MISSING`

#### Scenario: observed 与 expected 冲突
- **WHEN** record 状态为 passed，但 measurement observed 为 `16px`、expected 为 `14px` 且无 tolerance
- **THEN** checkpoint 报 `VERIFICATION_MEASUREMENT_GATE_FAILED`

#### Scenario: measured expectation 漂移
- **WHEN** measurement 的 expected 与 `measured-expectations.yaml` 对应 entry 不一致
- **THEN** checkpoint 报 `VERIFICATION_MEASUREMENT_EXPECTATION_DRIFT`

### Requirement: Full scenario gate inputs
Apply checkpoint scenario coverage SHALL 使用 fidelity、core layout、measured expectations 和 primitive contracts 共同派生全集；漏传 layout 或 expectations SHALL 使相关 scenario 判定为 missing。

#### Scenario: layout geometry 进入 checkpoint
- **WHEN** core layout 声明 placement geometry token
- **THEN** checkpoint 覆盖集包含对应 `phase8:placement-geometry:*`

#### Scenario: measured expectation 进入 checkpoint
- **WHEN** package 携带 measured expectations
- **THEN** checkpoint 覆盖集包含对应 `phase8:expectation:*`

### Requirement: Tailwind v4 runtime token retention
Tailwind v4 Token Projection SHALL 使用 `@theme static` 或等价保留层输出 checkpoint token map 中的全部变量；Phase 8 numeric measurement SHALL 证明 built CSS 的 computed 值仍等于 core token。

#### Scenario: token map 默认 theme 被拒绝
- **WHEN** Tailwind v4 numeric token map 声明 `theme_mode: default` 或 mappings 未覆盖 template token
- **THEN** checkpoint 报 `TOKEN_PROJECTION_TAILWIND_STATIC_REQUIRED` 或 `TOKEN_MAP_INCOMPLETE`

#### Scenario: 默认 theme tree-shaking 被抓住
- **WHEN** `--text-body` 因默认 `@theme` 未输出且正文 computed 为 `16px`
- **THEN** 对应 typography measurement 不能 passed

#### Scenario: static projection 通过
- **WHEN** built CSS 保留映射变量且 observed 为 `14px`
- **THEN** typography measurement passed

### Requirement: Structural checkpoint numeric input binding
structural fidelity 的新 Apply checkpoint SHALL 声明 `verification_contract: numeric-v1`，并绑定 layout、measured expectations 与 primitive contracts 的 canonical digests。缺失、CLI 漏传或 digest 漂移 SHALL fail closed。

#### Scenario: numeric input drift
- **WHEN** checkpoint 创建后 `core/layout.yaml` 语义变化
- **THEN** checkpoint 校验报 `CHECKPOINT_NUMERIC_INPUT_DRIFT`

#### Scenario: structural checkpoint 缺 input
- **WHEN** structural fidelity checkpoint 未绑定三类 numeric input
- **THEN** checkpoint 初始化或校验失败

### Requirement: Read-only source graph gate
Authoring staging gate MAY 接受 external graph artifact root；capture 与 structural replay SHALL 使用同一 graph root，source checkout SHALL 保持原字节。

#### Scenario: external graph artifact replay
- **WHEN** request graph 保存在 candidate graph root 且 source checkout 无该文件
- **THEN** capture、reproducibility replay 和 structural replay 均通过，source checkout status 不变
