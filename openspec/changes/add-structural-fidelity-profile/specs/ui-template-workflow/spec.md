## ADDED Requirements

### Requirement: Repo fidelity Intake
`ui-template` SHALL 在 repo Authoring 开始时记录固定 source revision、授权范围、结构 scope 和 fidelity conformance。新建或更新 repo 来源模板 SHALL 默认使用 structural conformance；只有用户明确选择仅提取视觉语言时才能使用 style-only，并 SHALL 保留可审计理由。

#### Scenario: 用户未指定 fidelity
- **WHEN** 用户要求从代码仓库导入 UI 模板且未声明只要视觉风格
- **THEN** Authoring 选择 structural conformance，并在生成前确定 scenes、components、interaction contexts 与平台 scope

#### Scenario: 用户只要配色和设计语言
- **WHEN** 用户明确要求 style-only
- **THEN** Authoring 不伪造 layout/geometry/state coverage，记录选择理由并在 Report 说明下游结构自由度

### Requirement: Scope-relative usage closure
Repo Authoring SHALL 以声明 scope 为边界定位 canonical definitions、exports/imports 和相关 usages，并 SHALL 对 layout scene、component slot 与 interaction context 形成可重复的 closure。流程 SHALL 不使用任意“3–5 个代表组件”作为完成标准；超出可处理上限时 SHALL 要求收窄 scope 或明确 unsupported，不得静默抽样。

#### Scenario: 大型 monorepo 有多个 UI package
- **WHEN** scope 同时命中多个 theme、入口或 canonical component definitions
- **THEN** Authoring 按稳定优先级和 locator 列出候选，未能唯一裁决时停止为 unresolved

#### Scenario: Included scene 的 usage 可闭合
- **WHEN** Authoring 找到 scene 使用的 layout、component slots 和 state contexts
- **THEN** capture receipt 列出排序后的 definitions/usages/exclusions/摘要，并由同一输入重复得到语义等价结果

#### Scenario: 达到扫描上限
- **WHEN** usage closure 超过声明资源上限或包含不可静态解析分支
- **THEN** Authoring 报告 blocker 或请求用户缩小 scope，不将部分抽样结果描述为完整 observed coverage

### Requirement: Context preservation 与 negative facts
Repo Authoring SHALL 在归一前保留来源 context，并 SHALL 只在全局定义、scope 内完整一致 usage 或明确设计文档支持时推广规则。`none`、不换行、不收缩、无根滚动、无 underline、无 shadow 等 negative facts SHALL 被显式提取，不得由 Apply 的常见默认值覆盖。

#### Scenario: Link contexts 行为不同
- **WHEN** button-link 使用 underline，而 navigation/entity-row link 使用背景 hover
- **THEN** Authoring 生成分 context state records，不创建“所有 link hover 均 underline”的全局规则

#### Scenario: 来源明确没有某种效果
- **WHEN**来源代码或 computed evidence 显示某 context 没有 decoration、shadow 或根滚动
- **THEN** profile 将该 negative fact 记录为 expected，并关联直接 locator

### Requirement: Structural profile Authoring gate
Generate SHALL 在候选模板与候选 INDEX 之外生成适用的 `fidelity.yaml`；Validate SHALL 对 structural profile 执行 portable validation 和 required source replay；Eval SHALL 执行 repo/profile 相关 cases。任何 required record、replay、semantic reproducibility 或 eval 失败 SHALL 保持生产 INDEX 不变并阻断“完成”汇报。

#### Scenario: Structural repo 模板通过
- **WHEN** candidate profile schema、source replay、cross-file semantics、repo eval 和模板 validator 全部通过
- **THEN** Authoring 才能进入 Index，并在 Report 附 profile/version、scope、canonical digest、replay identity 与 unresolved 摘要

#### Scenario: Source replay 不可执行
- **WHEN** structural conformance 要求 source replay 但固定 checkout 不存在、revision 不匹配或 runner 能力不足
- **THEN** Authoring 停在 Validate，生产 INDEX 不变，不以 portable internal validation 替代 source replay

#### Scenario: Style-only repo 模板
- **WHEN**用户已明确 style-only 且 core schema/validator/eval 通过
- **THEN** Authoring 可完成 baseline 模板，但 Report 必须说明未提供 structural fidelity，不得报告 layout/geometry/state replay 通过
