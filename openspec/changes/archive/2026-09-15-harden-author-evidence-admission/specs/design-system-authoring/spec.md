## ADDED Requirements

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
