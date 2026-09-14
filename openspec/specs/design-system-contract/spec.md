## Purpose

定义当前发布模板契约的兼容范围，明确历史 schema 与 freeze 格式只能作为显式迁移输入，并约束未知或不受支持契约的 fail-closed 识别行为，避免发布、校验和消费路径混用不同模板契约代际。

## Requirements

### Requirement: Current release compatibility range
Release `3.0.0` SHALL 声明 `design-system/v1` 为当前 contract family，`schema/v2 template` 与 `design-freeze/v1` 为 migration-only source；两者 SHALL 不作为当前发布格式被默认消费。

#### Scenario: 当前 package 校验
- **WHEN** bundle `3.0.0` 校验 published package
- **THEN** 当前路径使用 `design-system/v1`，并记录 capability 与 contract digest

#### Scenario: 旧格式输入
- **WHEN** runtime 遇到 schema v2 template 或 design-freeze v1
- **THEN** 默认消费停止，并提供显式 migration source 入口

#### Scenario: 未知 family
- **WHEN** 输入声明其他 schema family
- **THEN** fail closed 并报告当前支持范围
### Requirement: 统一契约 manifest
Design System Contract SHALL 使用 `design-system/v1` manifest 声明 identity、version、status、capability 和 layer 引用；package SHALL 不包含 project binding，active instance SHALL 包含 binding。

#### Scenario: 读取 page-system package
- **WHEN** package manifest 声明 `design-system/v1` 与 `page-system`
- **THEN** validator 能读取 identity、version、status、七个 core layer 引用和 package digest，且确认不存在 binding

#### Scenario: 读取 active instance
- **WHEN** active instance manifest 携带兼容的 contract body 与 binding
- **THEN** validator 能分别报告 contract digest、binding digest 和 projection digests

#### Scenario: 未知契约版本
- **WHEN** manifest 声明不受支持的 schema version
- **THEN** validator 与所有消费 runtime fail closed，并报告支持的版本范围

### Requirement: Portable core 七层闭包
Portable core SHALL 固定提供 tokens、primitives、patterns、page-types、layout、rules 与 evidence 七类语义；`tokens-only | ui-kit | page-system` capability SHALL 决定实际必填层，缺层 SHALL 是显式 capability 边界而非隐式缺口。

#### Scenario: tokens-only package
- **WHEN** package capability 为 `tokens-only` 且只提供 tokens、rules、evidence
- **THEN** validator 通过，并把其余层标记为 declared-absent

#### Scenario: ui-kit 缺少 primitives
- **WHEN** package capability 为 `ui-kit` 但 primitives layer 缺失
- **THEN** validator 失败并报告 capability 必填层缺口

#### Scenario: page-system 完整消费
- **WHEN** page-system package 七层完整且引用闭合
- **THEN** Apply 可据此判定完整页面实施能力

### Requirement: 精确值唯一权威
`core/tokens.yaml` SHALL 是 token 精确值的唯一权威；原生 theming 文件 SHALL 只能作为 project binding 声明的 Token Projection，且 binding SHALL 记录目标、映射与 digest。

#### Scenario: 合法 token projection
- **WHEN** binding 将 core token 路径映射到原生主题键并记录 projection digest
- **THEN** validator 可核对原生文件与 core authority 一致

#### Scenario: projection 漂移
- **WHEN** 原生 theming 文件内容与其 projection digest 不一致
- **THEN** validator 与消费 runtime fail closed，不得静默同步或手改绕过

### Requirement: Stable Entity 身份与引用闭合
Primitive、Pattern、Page Type、token 和 rule SHALL 使用跨文件稳定 ID；跨层引用 SHALL 只引用已声明 ID，published ID SHALL 不复用。human-readable 名称 SHALL 不作为身份。

#### Scenario: 跨层引用合法
- **WHEN** pattern 引用 primitive、page-type 或 rule 的稳定 ID
- **THEN** validator 解析目标并保留引用路径

#### Scenario: 悬空或重复 ID
- **WHEN** 引用目标不存在或同一 contract 内出现重复 stable ID
- **THEN** validator 失败并报告引用位置与目标 ID

### Requirement: Canonical digest 与 freeze 状态
Contract SHALL 使用 `sha256-canonical-json-v1` 计算 manifest、layer、binding 和 projection digest；status 与 digest SHALL 共同决定 draft、frozen 或 retired 语义。任一必需 digest 缺失或不匹配 SHALL fail closed。

#### Scenario: 冻结契约重复校验
- **WHEN** frozen contract 的全部文件与 manifest digest 一致
- **THEN** validator 输出相同 contract digest

#### Scenario: layer 被篡改
- **WHEN** core 文件在 freeze 后变化
- **THEN** validator 定位失效 layer 并拒绝消费

### Requirement: Migration receipt fail closed
schema v2 template 或 design-freeze v1 的迁移 SHALL 生成独立 migration receipt，记录 source/target identity 与 digest、逐项映射、defaulted/dropped 项、unresolved 和 errors；存在 unresolved 或 errors 的候选 SHALL 不得进入 INDEX 或成为 active instance。

#### Scenario: 可审计迁移
- **WHEN** 旧 template 成功迁移为新 package candidate
- **THEN** receipt 记录 source digest、target digest、mapped/defaulted/dropped 项且 unresolved 为空

#### Scenario: 迁移有未解决项
- **WHEN** receipt 存在 unresolved 或 errors
- **THEN** validator 拒绝候选并阻止其发布或激活

### Requirement: Vendor manifest 治理
Vendor Reference SHALL 由独立 manifest 声明 source、fixed revision、license、files、SHA-256 digests 和 allowed triggers；缺失授权、来源、license、digest 或触发器声明 SHALL fail closed。

#### Scenario: 合法 vendor 快照
- **WHEN** vendor 文件与 manifest 的 revision、license 和 digests 一致
- **THEN** validator 报告其可用于声明的触发场景

#### Scenario: 未声明或被篡改 vendor 文件
- **WHEN** vendor 文件缺少 manifest 记录或 digest 不匹配
- **THEN** validator 与 bundle 治理失败

### Requirement: Component Family derivation and closure
`page-system` 和 `ui-kit` package SHALL 能从 `Page Type → Pattern → Primitive` 的 Stable Entity ID 引用关系与 evidence 推导 Component Family 闭集；validator SHALL 校验引用存在、ID 唯一、evidence 可解析，并报告悬空、重复、缺证据或 capability 不足。Component Family SHALL 不引入手工第八层清单。

#### Scenario: derive family closure
- **WHEN** validator 读取一个引用闭合且 evidence 完整的 page-system package
- **THEN** 它输出每个 page type 依赖的 Pattern 与 Primitive 闭集，并保持 Stable Entity ID 不变

#### Scenario: dangling pattern reference
- **WHEN** page type 引用未声明的 pattern
- **THEN** validator fail closed 并报告引用位置与目标 ID

#### Scenario: family member lacks evidence
- **WHEN** candidate 的 family 成员没有可解析 evidence 或 provenance 身份
- **THEN** validator 拒绝将其纳入 published Component Family

### Requirement: Machine-readable portable placement topology
The portable layout layer SHALL be able to declare stable scene, region, slot, semantic role, relation, sibling order, nesting, scroll ownership, and responsive mode fields for capabilities that claim page placement. It SHALL also be able to bind a placement arrangement to stable Page Type and Pattern identities. Human-readable labels and breakpoints SHALL remain supplementary and SHALL NOT be the sole authority for these semantics.

#### Scenario: Topology declaration
- **WHEN** a page-system layout declares a content-local navigation arrangement
- **THEN** stable IDs resolve across layout, Page Type, Pattern, and evidence, and the relation identifies containment or peer order without a product-specific name

#### Scenario: Quantitative placement geometry
- **WHEN** placement requires an inset, gutter, width, or other quantitative value
- **THEN** the topology references a token path or structural profile value and does not introduce a second exact-value authority

#### Scenario: Stable identity preservation
- **WHEN** a published package is adopted into an Active Instance
- **THEN** placement scene, region, slot, Page Type, Pattern, and Primitive stable IDs are preserved and validated against the same digest-consistent contract

### Requirement: Primitive variant styling contracts
primitives 层的交互控件 SHALL 携带逐变体样式契约：每个声明 variant SHALL 表达呈现类别（filled、outline、ghost 等闭集）、radius token、控件高度 token、hover/active 语义 token 引用与 focus 处理引用（指向状态呈现事实或等价 rule）；变体不得只以名字存在。携带可标识条目内容的 primitives（如导航条目）SHALL 声明解剖槽（icon、label）及其次序；同一 primitive 在不同表面上下文（sidebar 与 page-surface）状态绑定不同时 SHALL 按上下文分别声明 token 引用。Apply SHALL NOT 在契约之外发明变体样式、控件圆角/高度或解剖结构；契约沉默项按 Apply 侧「沉默即停止」处理，不得回退组件库默认值。

#### Scenario: 按钮变体契约完整
- **WHEN** 模板声明 button 的 default/outline/brand 变体
- **THEN** 每个变体携带呈现类别、radius token、高度 token 与 focus 引用；validator 对缺项报错

#### Scenario: 契约外发明样式
- **WHEN** Apply 以组件库默认圆角或自造 hover 实现某变体而契约已声明对应 token
- **THEN** Phase 4/8 校验失败并指向被偏离的契约字段

#### Scenario: 导航条目上下文区分
- **WHEN** nav-item 同时用于 sidebar 与页面卡内左列
- **THEN** 两类上下文的 selected/hover token 引用分别声明；sidebar token 出现在页面上下文实现中被判偏离

#### Scenario: 解剖槽声明
- **WHEN** 导航条目契约声明 icon+label 槽
- **WHEN** 实现渲染纯文字条目
- **THEN** Phase 8 存在性场景失败，证据指向缺失的 icon 槽

### Requirement: Provenance, coverage and confidence consistency
统一 validator SHALL 在 package 与 active 校验中对 provenance、coverage 与 confidence 实施交叉校验，任一不一致 SHALL fail closed 并输出稳定错误码：evidence 的 `source_id` 与 `source_revision` MUST 解析到 `meta.sources[]` 中声明的来源；coverage 的每个 `declared` 项 MUST 恰属 `observed`、`defaulted`、`unsupported` 之一，三者两两互斥；`overall` confidence MUST NOT 高于必需维度中的最弱值，且某维度存在 `defaulted` 项时该维度 MUST NOT 为 `high`。

#### Scenario: evidence 指向未声明 revision
- **WHEN** evidence 条目的 `source_revision` 不在 `meta.sources[]` 任何声明的 revision 集合内
- **THEN** 校验以 `EVIDENCE_REVISION_UNDECLARED` 失败并指出该 evidence id

#### Scenario: coverage 未分类或重叠
- **WHEN** 某 `declared` 项未出现在任一分类数组，或同时出现在两个分类数组中
- **THEN** 校验以 `COVERAGE_PARTITION_INVALID` 失败并列出受影响项

#### Scenario: confidence 与 coverage 冲突
- **WHEN** `overall` 高于最弱必需维度，或某维度存在 `defaulted` 项却声明 `high`
- **THEN** 校验以 `CONFIDENCE_INCONSISTENT` 失败并指出维度

#### Scenario: 合法 package 不受影响
- **WHEN** evidence 来源可解析、coverage 为完备互斥分划且 confidence 与 coverage 一致
- **THEN** 校验通过，既有 digest 与 stable identity 语义不变

### Requirement: Oracle evidence structural validation
统一 validator SHALL 对认证报告中的 oracle 侧证据实施结构校验：证据引用 MUST 解析到存在且非占位的 artifact；声明为测量的证据 MUST 携带 measurement id、方法、数值或闭集语义、单位与 oracle revision；声明为截图的证据 MUST 通过图像内容校验。占位或结构不合规的证据 SHALL 使相关 Pattern Equivalence Record 失败。

#### Scenario: 占位文件伪装 oracle 证据
- **WHEN** oracle 证据引用解析到内容是复现说明的文本或 JSON 文件
- **THEN** 校验以 `CERT_ORACLE_EVIDENCE_PLACEHOLDER` 失败

#### Scenario: 测量结构不完整
- **WHEN** 测量证据缺少 measurement id、方法或 oracle revision 之一
- **THEN** 校验失败并指明缺失字段

#### Scenario: 截图为真实图像
- **WHEN** 截图证据通过图像内容校验并绑定同一 oracle revision
- **THEN** 该证据可用于 equivalence 判定
