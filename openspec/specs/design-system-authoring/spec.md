## Purpose

定义 `ui-template-author` 创建、更新、验证、发布与退役 portable Design System Package 的可观察行为。

## Requirements

### Requirement: Package-only Authoring 边界
Author SHALL 产出不含 project binding 的 `design-system/v1` package；SHALL NOT 生成依赖清单、stack adapter、output root、runnable starter 或业务实现。

#### Scenario: 从 source 创建 package
- **WHEN** Author 从 session source 抽取完成
- **THEN** 候选产物包含 portable core 与 provenance，且不包含 `binding.yaml`

#### Scenario: 请求项目实现
- **WHEN** 用户要求 Author 初始化页面或选择消费项目技术栈
- **THEN** Author 停止并移交 Design 或 Apply，不写应用源码

### Requirement: Declared change set 与 candidate-only
Generate-from-source SHALL 在 Intake 冻结 session source、source identity、change set 和 capability；未声明路径 SHALL 保持原字节，部分失败 SHALL 不进入生产 INDEX。生产写入 SHALL 只发生在用户显式完成验证后的 publish/index 步骤。

#### Scenario: 局部更新
- **WHEN** 变更集合只允许 tokens 与 primitives
- **THEN** candidate 中未声明的 layout、patterns、page-types 与 evidence 保持原字节

#### Scenario: validation 失败
- **WHEN** candidate 的统一 validator 或 eval 失败
- **THEN** Author 不修改生产 `templates/INDEX.md`，并保留失败原因

### Requirement: L0–L6 映射与诚实覆盖
Author SHALL 将 L0 身份、L1 chrome、L2 token、L3 scene/route、L4 primitive、L5 pattern 和 L6 apply mapping 映射到统一 package 对应层；coverage SHALL 以 observed、defaulted、unsupported 闭集记录，且 defaulted 证据不得支撑 high confidence。coverage SHALL 是 `declared` 的完备互斥分划：每个声明项恰属一个分类数组，不得遗漏或跨数组重复。维度 confidence SHALL NOT 高于覆盖事实所能支撑的程度，`overall` SHALL NOT 高于必需维度中的最弱值。写入 evidence 的每条 source 证据 SHALL 引用 `meta.sources[]` 中声明的 source id 与 revision；本次未声明来源 SHALL NOT 出现在 evidence 中。

#### Scenario: source 出现 chrome 与 components
- **WHEN** session source 包含 shell、token 和原子/复合组件
- **THEN** Author 分别写入 layout、tokens、primitives、patterns 的 stable IDs 与 source evidence

#### Scenario: 大量默认补全
- **WHEN** 多个组件只有默认值而缺少 source evidence
- **THEN** Author 标记 defaulted，并把相关 confidence 限制在非 high

#### Scenario: coverage 分划不完整
- **WHEN** 某声明项未出现在 observed、defaulted、unsupported 任一数组，或同时出现在两个数组
- **THEN** Author 在 Index 前修正分划，不得提交至 production INDEX

#### Scenario: evidence 混入未声明来源
- **WHEN** evidence 条目引用的 source revision 不在本次 `meta.sources[]` 声明集合内
- **THEN** Author 补齐来源声明或重新采集该条目，不得保留无出处的 provenance

#### Scenario: 维度 confidence 与实际覆盖冲突
- **WHEN** 某维度存在 defaulted 项而 confidence 声明为 high，或 `overall` 高于最弱必需维度
- **THEN** Author 下调 confidence 或补齐 source 证据后再校验

### Requirement: Published package 生命周期
Author SHALL 通过项目根 `templates/INDEX.md` 维护 package 的 `published | retired` 状态；INDEX 声明列 SHALL 与 package metadata 一致，retired package SHALL 不可被新消费领养。

#### Scenario: 发布 candidate
- **WHEN** candidate 通过 validator、eval 和用户确认
- **THEN** Author 写入或更新唯一 INDEX 行，并保持 catalog/项目库所有权边界

#### Scenario: retire package
- **WHEN** 用户请求退役 package
- **THEN** INDEX 状态变为 retired，后续新 Apply 领养被拒绝

### Requirement: Package feedback 闭环
Author SHALL 消费 Apply 提出的 `package` ownership feedback；每条 feedback SHALL 绑定 package identity、Stable Entity ID、evidence refs 和 normalized fingerprint，并可合并去重而不覆盖原 ID。

#### Scenario: 接收 package 缺口
- **WHEN** Apply 报告缺少 primitive 或 rule
- **THEN** Author 读取稳定 ID、package version 和 evidence refs，形成可审查 candidate change

#### Scenario: 修复后重生
- **WHEN** package 修复影响 Apply 已实现页面
- **THEN** Author 记录 package identity 变化，消费端必须通过新重生验收，不得原地修生成物

### Requirement: Author validator 发现协议
Author Validate gate SHALL 按有序候选发现统一 package validator：显式 `UI_DESIGN_SYSTEM_VALIDATOR`（必须是共享实现）、本 skill 安装树内的共享实现、仅当仓库根同时含 `schemas/design-system/v1/` 时的该根 `scripts/validate_design_system.py`。discovery wrapper SHALL 不是 validator 候选，也 SHALL NOT 被写入 `UI_DESIGN_SYSTEM_VALIDATOR`。候选缺失、能力不足或目标为 wrapper SHALL fail closed，不得从任意 `PATH` 猜测，不得继续尝试未知同名程序。

#### Scenario: 安装态 package validate
- **WHEN** 消费项目只安装 Author/Apply，无本仓库 checkout
- **THEN** Author 使用本 skill 内共享实现对 candidate package 执行 `validate ... --kind package --json` 并得到稳定排序输出

#### Scenario: 禁止把 wrapper 当作实现
- **WHEN** Agent 或环境把 `UI_DESIGN_SYSTEM_VALIDATOR` 设为 Author discovery wrapper
- **THEN** Validate 以 `VALIDATOR_SELF_INVOCATION` 失败，不把任务标为校验通过，也不繁殖进程

#### Scenario: 共享实现缺失
- **WHEN** 安装树缺少共享 validator 或 `design-system/v1` schema
- **THEN** Author 以 `DESIGN_SYSTEM_VALIDATOR_MISSING` 失败并停止 Index，不改生产 INDEX

### Requirement: Source gate applies to design-system packages
Generate-from-source staging SHALL execute deterministic capture, reproducibility comparison, source replay when structural conformance is claimed, and validation for every candidate, including a candidate that already has a `design-system/v1` manifest. Candidate format SHALL NOT change the staging gate from a source gate into a portable-only shortcut.

#### Scenario: Package candidate without source graph
- **WHEN** a structural Generate-from-source request is run against a `design-system/v1` candidate and its required source graph cannot produce complete capture
- **THEN** the gate fails with capture findings, replay is not reported as passed, and production INDEX remains unchanged

#### Scenario: Portable-looking shortcut
- **WHEN** a Generate-from-source request supplies a valid package candidate, session source, and request, but the candidate lacks structural evidence required by the request
- **THEN** the gate reports that capture or structural closure was not completed and SHALL NOT return `capture: not-run` as success

### Requirement: Page-system structural placement publication
Authoring SHALL publish a page-system package from source only when its included scene closure has complete structural placement evidence, stable reusable identities, resolvable evidence, and a passing source replay. If placement evidence cannot be closed, Author SHALL either leave the candidate unpublished or change the candidate to an explicitly declared lower capability with the degradation recorded.

#### Scenario: Complete page-system candidate
- **WHEN** captured scenes include topology, reusable placement identities, evidence, and replay passes
- **THEN** the candidate may proceed to portable validation and the normal publication gates

#### Scenario: Missing placement closure
- **WHEN** an observed arrangement cannot be represented by stable topology, Pattern/Page Type identity, or evidence
- **THEN** the candidate cannot be published as page-system and the unresolved placement is returned for review or explicit capability downgrade

#### Scenario: Silent capability retention
- **WHEN** a candidate lacks structural placement evidence but its manifest remains page-system
- **THEN** publication fails closed rather than inheriting placement behavior from prose or implementation defaults

### Requirement: Claim evidence admission

Author SHALL 只把通过三证准入的声明提升进 package 层。每条提升的声明 SHALL 同时具备：

- Observation：来自 `meta.sources[]` 已声明 source 的可观测证据（locator）；
- Basis：可复核依据（method、可解析的 source revision，或带 `basis`/`decision_id` 的 default）；
- Consequence：该声明的 `target` 解析到 package 已声明的 token 路径或 stable entity/rule id，说明它会进入 Apply 消费的层。

任一证缺失时 Author SHALL 在写 package 前 omit 该声明，SHALL NOT 以更低 confidence、改 `origin` 或填默认值的形式绕过准入写入任意层。该纪律独立于 source 采集方式（web/repo/image/doc），四种来源 SHALL 共用同一准入与记录管道。

#### Scenario: 缺少依据的候选

- **WHEN** 候选只有一次视觉观察，既无 `method`/可解析 revision，也无带 `basis`/`decision_id` 的 default
- **THEN** Author 在写 package 前 omit 该候选，不得具名为 token、rule 或 pattern

#### Scenario: 缺少 Consequence 的候选

- **WHEN** 候选具备 observation 与 basis，但 `target` 不解析到任何已声明 token 路径或 stable entity/rule id
- **THEN** Author 不把它作为 package 声明写入，或者把 `target` 指向已声明产物后再写

#### Scenario: 三证齐备

- **WHEN** 候选的 observation、basis、consequence 均可解析
- **THEN** Author 提升该声明，并在 evidence 记录对应字段与 confidence

#### Scenario: 不得降级绕过

- **WHEN** 候选缺任一证而被尝试以 `origin: default` 或更低 confidence 写入
- **THEN** 该写入被拒绝，而不是以弱化形式发布

### Requirement: Recurrence-gated scope promotion

Author SHALL 为每条声明区分 `surface` scope 与 `product` scope。声明为 `product` scope 的视觉或结构规则 SHALL 由同一 role 上跨至少两个 distinct sampled surface（页面、scene 或视口）的 recurrence 证据支撑；不足两个 distinct surface 时 Author SHALL 将 scope 收窄到已观测 surface，SHALL NOT 以单 surface 证据声明 `product` scope。evidence 的 `scope` 缺省视为 `surface`。

#### Scenario: 单表面声称为产品级

- **WHEN** 一条声明带 `scope: product` 但 recurrence 证据少于两个 distinct surface，或全部指向同一 surface
- **THEN** Author 收窄 scope 到已观测 surface，或将声明退回未发布状态，不得保留 `product` scope

#### Scenario: 满足 recurrence

- **WHEN** 同一 role 的声明在两个或以上 distinct sampled surface 上复现，且 recurrence 证据均可解析
- **THEN** Author 可发布 `product` scope 声明

#### Scenario: 单表面证据的合法发布

- **WHEN** 声明只有单 surface 证据但 observation/basis/consequence 齐备
- **THEN** Author 以 `surface` scope 发布，不报错，也不得标为 `product`

### Requirement: Consequence-bearing prose and no-op pass

package 层的 prose、rule `statement` 与 `description` SHALL 只陈述会改变 Apply 实现选择的内容。Author SHALL 在 Index 前执行一次 no-op pass，删除不改变产物的句子、组件清单式罗列、对 YAML 具名值的重复散文，以及「保持精致」「注意一致性」一类泛泛建议。保留的每条 statement SHALL 能指出其约束的具体 token、pattern、state 或 choice。

#### Scenario: 泛泛建议

- **WHEN** rules 或 prose 含不指向任何具体实现选择的泛泛建议
- **THEN** Author 在 Index 前删除该句子，不写入 package

#### Scenario: 重复 YAML

- **WHEN** prose 仅复述 tokens、primitives 或 patterns 中的具名值
- **THEN** Author 删除该 prose，精确值继续只由 YAML 层权威承载

#### Scenario: 有意义的约束

- **WHEN** 一条 statement 约束具体的 token、pattern、state 或 choice
- **THEN** Author 保留该 statement，因为它改变 Apply 的实现选择

### Requirement: Non-silent decision removal

一次 update SHALL NOT 静默移除既有的 active stable entity 或 rule ID。移除 SHALL 显式表达为 `retired` 或 `superseded` 并携带替代 ID 或理由；authoring report SHALL 列出本次移除集。change-set gate SHALL 在未声明 removed 集合时拒绝丢失既有 active ID，并保持 production `templates/INDEX.md` 原字节。

#### Scenario: 静默删除

- **WHEN** update 后某个既有 active rule、primitive、pattern 或 page-type ID 消失且未记录 `retired`/`superseded`
- **THEN** change-set gate 以 `SILENT_DECISION_REMOVAL` fail closed，且不 promotion

#### Scenario: 声明式移除

- **WHEN** update 将旧 ID 标为 `retired` 并指向新 ID 或给出理由
- **THEN** gate 放行，且 authoring report 的移除集列出该 ID 与其处置

#### Scenario: 纯新增或修改

- **WHEN** update 仅新增或修改声明、未移除任何既有 active ID
- **THEN** 移除守卫不触发，流程与其他校验保持不变
