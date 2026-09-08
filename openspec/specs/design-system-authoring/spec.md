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
Author SHALL 将 L0 身份、L1 chrome、L2 token、L3 scene/route、L4 primitive、L5 pattern 和 L6 apply mapping 映射到统一 package 对应层；coverage SHALL 以 observed、defaulted、unsupported 闭集记录，且 defaulted 证据不得支撑 high confidence。

#### Scenario: source 出现 chrome 与 components
- **WHEN** session source 包含 shell、token 和原子/复合组件
- **THEN** Author 分别写入 layout、tokens、primitives、patterns 的 stable IDs 与 source evidence

#### Scenario: 大量默认补全
- **WHEN** 多个组件只有默认值而缺少 source evidence
- **THEN** Author 标记 defaulted，并把相关 confidence 限制在非 high

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
