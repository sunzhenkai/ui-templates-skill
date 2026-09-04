## Purpose

定义 `ui-template` skill 的模板创建/导入/更新与模板库管理职责：产出可被独立 `ui-template-apply` skill 消费的公开数据契约，并通过结构化反馈闭环持续维护模板质量。

## Requirements

### Requirement: Authoring 单一职责入口
`ui-template` skill SHALL 只响应模板创建、导入、更新、浏览与拆分意图。当用户请求使用已有模板实现页面时，skill SHALL 提示移交到 `ui-template-apply` skill，且不得在同一 SKILL.md 中加载 Apply 阶段流程。

#### Scenario: 用户要求从新来源创建模板
- **WHEN** 用户给定 URL、仓库、图片或设计文档并要求沉淀风格
- **THEN** skill 进入 Template Authoring 工作流，并按来源生成或更新模板

#### Scenario: 用户要求用已有模板实现页面
- **WHEN** 用户请求“用 workbench-shell 做页面”或“按模板实现 UI”
- **THEN** skill 告知该请求由 `ui-template-apply` 处理，且自身不展开 Apply 阶段流程

#### Scenario: 尚无合适模板
- **WHEN** 用户想按某种风格实现页面但模板库中没有可用模板
- **THEN** skill 先引导完成 Authoring，再提示使用 `ui-template-apply` 继续消费端流程

### Requirement: 模板格式契约唯一归属
`ui-template` skill SHALL 作为 `spec.md`、`tokens.yaml`、`meta.yaml` 与 `apply/` 格式定义的唯一所有者，并在 Authoring 时保证模板可被独立 Apply skill 消费。

#### Scenario: Apply 侧需要理解模板格式
- **WHEN** `ui-template-apply` 读取模板目录
- **THEN** 其只需依赖 `ui-template` 定义的公开数据契约，不需要加载 Authoring 流程文档

### Requirement: 模板反馈消费
`ui-template` skill SHALL 在更新模板前检查 `ui-template-apply` 产出的结构化反馈记录，并决定回写模板、记录为已知缺口或驳回；仅属消费项目的工程问题 SHALL 不进入模板。

#### Scenario: Apply 报告可复用规则缺口
- **WHEN** 反馈记录显示模板缺少 icon-only 控件命名规则
- **THEN** Authoring 将该规则写入对应模板文档并更新索引或元数据

#### Scenario: 反馈只涉及消费项目工程结构
- **WHEN** 反馈记录只描述当前项目目录结构问题
- **THEN** Authoring 驳回该反馈，不修改模板

### Requirement: Optional implementation playbook 元数据
模板格式 SHALL 允许在 `templates/<name>/implementation/` 中保存 optional implementation playbook。`spec.md` SHALL 继续作为设计规则入口；implementation playbook SHALL 引用而非复制模板规则，并可定义技术栈适配、组件映射、目录结构和分阶段验收。

#### Scenario: 模板带 implementation playbook
- **WHEN** 消费者打开包含 `implementation/` 的模板
- **THEN** skill 同时读取 `spec.md` 与 implementation playbook，并把 spec 视为视觉与布局约束来源

#### Scenario: implementation 与 spec 冲突
- **WHEN** implementation playbook 与 `spec.md` 冲突
- **THEN** skill 以 `spec.md` 为准，并要求更新或删除冲突的 implementation 内容

### Requirement: Session source 与 recorded provenance 分离
`ui-template` SHALL 把本次 Generate 的可读来源（session source）与已发布模板的 `meta.sources[]` provenance 当作不同对象。Provenance SHALL 只记录 id/type/ref/revision/captured_at 等出处身份，SHALL NOT 被解释为文件系统绑定或下次 Authoring 的必填 checkout。Authoring SHALL NOT 因 provenance 存在而向用户索要历史本地绝对路径、扫描 sibling checkout / `/tmp` / `example/**`，或按 `meta.sources[].ref` 自行 clone。

#### Scenario: 已发布模板没有 session source
- **WHEN** 用户要求校验、索引检查或非从源更新已发布的 repo 来源模板，且本会话未给出可读 source
- **THEN** Authoring 只执行 portable validation；replay 报告 `not-run`；无 sidecar 时标识 `legacy-baseline`；SHALL NOT 请求 source-001/source-002 或其他历史来源的本地路径

#### Scenario: 本会话从源导入
- **WHEN** 用户为本会话提供本地路径或授权读取的 Git 地址作为导入/从源更新输入
- **THEN** 该输入是 session source；Generate 可读取它并写入 provenance，structural 路径随后对该同一 source 做 replay

#### Scenario: 禁止把 provenance 当 checkout
- **WHEN** 已发布模板 `meta.sources[]` 声明了固定上游 revision，但磁盘上没有对应 checkout
- **THEN** 这不是 blocker，也不是「请提供本地绝对路径」的理由

### Requirement: Repo fidelity Intake
`ui-template` SHALL 仅在本次从源导入或从源更新时记录 session source、固定 source revision、结构 scope 和 fidelity conformance。新建或从源更新的 repo 来源模板 SHALL 默认使用 structural conformance；只有用户明确选择仅提取视觉语言时才能使用 style-only，并 SHALL 保留可审计理由。对已发布模板的非从源操作 SHALL 跳过 session-source Intake，不得阻塞。

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
本次 Generate-from-source SHALL 在候选模板与候选 INDEX 之外生成适用的 `fidelity.yaml`。Validate SHALL 始终执行 portable validation。仅当本会话使用 session source 做 structural Generate 时，Validate SHALL 对该同一 source 要求 replay。Eval SHALL 执行 repo/profile 相关 cases。任何 required record、**session** replay、semantic reproducibility 或 eval 失败 SHALL 保持生产 INDEX 不变并阻断“完成”汇报。已发布模板无 session source 时，portable 通过即为校验成功，SHALL NOT 用 `STRUCTURAL_REPLAY_REQUIRED` 向用户要路径。

#### Scenario: Structural repo 模板通过
- **WHEN** 本会话从 session source 生成 candidate，且 profile schema、对该 source 的 replay、cross-file semantics、repo eval 和模板 validator 全部通过
- **THEN** Authoring 才能进入 Index，并在 Report 附 profile/version、scope、canonical digest、replay identity 与 unresolved 摘要

#### Scenario: 本次从源 Generate 但 replay 不可执行
- **WHEN** 本会话声称 structural Generate-from-source，但 session source 不存在、revision 不匹配或 runner 能力不足
- **THEN** Authoring 停在 Validate，生产 INDEX 不变，不以 portable internal validation 替代这次 replay

#### Scenario: 已发布模板 portable 校验
- **WHEN** 对已发布 repo 来源模板做 Validate 且用户未提供 session source
- **THEN** portable checks 通过即可；replay 为 `not-run`；不得把该模板标为需要补 checkout 的失败 Authoring

#### Scenario: Style-only repo 模板
- **WHEN**用户已明确 style-only 且 core schema/validator/eval 通过
- **THEN** Authoring 可完成 baseline 模板，但 Report 必须说明未提供 structural fidelity，不得报告 layout/geometry/state replay 通过
