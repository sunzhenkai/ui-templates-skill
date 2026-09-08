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
