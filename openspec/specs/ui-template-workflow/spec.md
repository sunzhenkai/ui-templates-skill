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
`ui-template` skill SHALL 作为版本化模板 schema、`spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml` 与 optional `apply/` 格式定义的唯一所有者，并 SHALL 在 Authoring 时保证模板可被独立 Apply skill 确定性消费。模板 SHALL 不包含 `implementation/`、技术栈 adapter、消费项目目录契约、API/data 分层或状态库选型。

#### Scenario: Apply 侧需要理解模板格式
- **WHEN** `ui-template-apply` 读取模板目录
- **THEN** 其只依赖 `ui-template` 定义的版本化公开数据契约，不加载 Authoring 流程，也不从 prose 猜测缺失字段

#### Scenario: 模板包含工程实施内容
- **WHEN** Authoring 产物包含 `implementation/`、stack adapter、代码目录或消费项目业务结构
- **THEN** 模板验证失败，且该模板不得进入索引或被汇报为完成

#### Scenario: 消费者遇到不支持的 schema
- **WHEN** 模板声明的 schema version 不在消费者支持范围内
- **THEN** 消费者明确拒绝继续并报告所需迁移，不得静默按其他版本解释

### Requirement: 模板反馈消费
`ui-template` skill SHALL 在更新模板前发现或读取结构化反馈记录，并 SHALL 按唯一 ID 幂等地将每条反馈处置为 `accepted`、`known-gap` 或 `rejected`；已接受反馈 SHALL 继续记录 `applied` 与 `verified` 状态。仅属消费项目的工程问题 SHALL 不进入模板，所有终态 SHALL 保留理由和目标引用。

#### Scenario: Apply 报告可复用规则缺口
- **WHEN** 反馈记录显示模板缺少可复用的 icon-only 控件命名规则且证据完整
- **THEN** Authoring 将反馈标记为 `accepted`，记录目标规则，应用后标记为 `applied`，验证通过后标记为 `verified`

#### Scenario: 可复用问题暂不修复
- **WHEN** 反馈有效但当前版本无法安全纳入
- **THEN** Authoring 将其标记为 `known-gap`，记录理由、影响和后续条件，不得静默丢弃

#### Scenario: 反馈只涉及消费项目工程结构
- **WHEN** 反馈记录只描述当前项目目录、API/mock 或技术栈问题
- **THEN** Authoring 将其标记为 `rejected` 并记录项目专属理由，不修改模板

#### Scenario: 重复消费同一反馈
- **WHEN** Authoring 再次读取已处置的 feedback ID
- **THEN** 系统保留既有处置且不重复写入相同规则或生成第二次变更

### Requirement: 可追踪的模板规则与来源
Authoring SHALL 为 Non-negotiables 和其他被跨文档引用的关键规则分配稳定唯一 ID，并 SHALL 为 token、来源资产和默认决策产出可解析证据。规则或证据被替代时 SHALL 保留可追踪的 superseded 关系。

#### Scenario: 创建来源 token
- **WHEN** token origin 为 `source`、`computed` 或 `estimated`
- **THEN** `evidence.yaml` 包含可解析的 token path、来源 ref、定位信息、采集时间、置信度和状态

#### Scenario: 回填默认 token
- **WHEN** 来源未体现某值且 Authoring 使用 `origin: default`
- **THEN** evidence 记录默认依据或 decision ID，不把默认值描述为来源观察

#### Scenario: 规则引用失效
- **WHEN** `apply/`、quality matrix 或反馈引用不存在或重复的规则 ID
- **THEN** 验证失败并报告所有悬空或冲突引用

### Requirement: Authoring 完成门禁
`ui-template` skill SHALL 按 Generate → Validate → Eval → Index → Report 顺序完成模板创建或更新。schema、语义、对比度、证据、链接或相关 contract eval 任一失败时，skill SHALL 不更新 `templates/INDEX.md`，也不得宣称模板完成。

#### Scenario: 新模板验证通过
- **WHEN** 新模板通过全部必需 validator 和相关 contract eval
- **THEN** Authoring 更新索引并在汇报中附上执行命令、结果摘要和模板 schema version

#### Scenario: 验证失败
- **WHEN** 模板缺少必备文件、origin 非法、required contrast pair 不通过或存在悬空引用
- **THEN** Authoring 停止在验证阶段，保留失败详情且不更新索引

#### Scenario: 外部安装环境执行 Authoring
- **WHEN** `ui-template` 在没有本仓 `AGENTS.md` 的项目中创建模板
- **THEN** skill 仍调用 bundle 内可发现的 portable contract checker，并执行同等完成门禁

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

### Requirement: Structural 导入必须提交 chrome-complete literal graph
本次 structural Generate-from-source SHALL 在 session source 内提供符合 `repo-literal-graph-v1` 的 closed graph，并由 capture 产出含 included shell chrome composition 的 receipt。Authoring SHALL NOT 解析或执行来源 TSX/JS，SHALL NOT 用散文 `spec.md`/`tokens.yaml` 代替 graph。缺 graph、graph `unsupported`、shell chrome 不完整或 capture 有 unresolved blocker 时 SHALL 停在 Generate/Validate，生产 INDEX 不变，也不得宣称 structural 完成。style-only 路径不受本条约束，但 SHALL NOT 报告 layout replay 通过。

#### Scenario: 无 graph 的 repo 导入
- **WHEN** 用户要求从仓库 structural 导入，且 session source 中没有 closed literal graph
- **THEN** Authoring 失败并报告稳定 issue code；不得写入生产 INDEX，也不得用抽样阅读源码生成的散文布局冒充 observed

#### Scenario: graph 有 shell 但缺槽位顺序
- **WHEN** capture 得到 shell scene 但缺少 `shell_variant`、有序 slots 或 header-trigger/chat-fab 锚点
- **THEN** receipt 不得标 closure complete；Generate-from-source 停止

#### Scenario: 用户明确 style-only
- **WHEN** 用户选择 style-only 且给出理由
- **THEN** Authoring 可在无 chrome records 时完成 baseline，Report 必须说明未提供 shell chrome fidelity

### Requirement: 来源 IA 不得被页面模式分类学替换
Repo Authoring SHALL 将来源导航分组、scene 名称和 chrome 槽位作为一等 observed 结构写入 profile 与设计文档。`meta.coverage.page_modes` 的 A–E 取值 SHALL 只作为 Apply 验收映射，SHALL NOT 在导入时替换来源 IA 或壳配方。每个 included 来源 scene SHALL 能追溯到唯一 page-mode 映射或显式 excluded，映射失败时 unresolved，不得发明第六种模式，也不得把来源分组改名为通用「个人区/运维区/配置区」一类分类学标签后当作 observed。

#### Scenario: 来源有具名导航分组
- **WHEN** session source 声明 Inbox/Chat/Issues 等具名目的地与分组
- **THEN** 模板保留这些 scene/slot 身份，并另写 A–E 映射；不得只留下 A 常驻集合之类的抽象壳

#### Scenario: 只用 A–E 描述壳
- **WHEN** 候选 `routes-and-layouts.md` 或 profile 把 App Shell 写成仅有 A–E 槽位、没有来源 chrome 顺序
- **THEN** structural Generate-from-source 失败，不得 Index

### Requirement: 双源时 repo 壳拓扑优先
当同一模板同时声明 repo 与设计文档来源时，shell variant、槽位顺序、trigger/FAB 锚点和导航分组 SHALL 以 repo session source 的 observed chrome 为准。设计文档只可贡献文档中明确给出的 token 或规则；文档泛化或业务脱敏 SHALL NOT 覆盖 repo 已观察的壳拓扑。冲突未裁决时 SHALL unresolved，不得静默采用更通用的文档描述。

#### Scenario: 文档泛化了侧栏分组
- **WHEN** 仓库源展示具名分组与 inset 壳，而并列 Markdown 将其写成通用工作区导航
- **THEN** Authoring 发布仓库 chrome records，文档差异留在 evidence/unresolved，不得把泛化 IA 标为 source-direct

#### Scenario: 文档写了仓库未出现的颜色
- **WHEN** 设计文档给出仓库未声明的色值
- **THEN** 该 token 按文档 origin 记录，不改变 repo chrome composition

### Requirement: 高 layout 置信度需要 chrome sidecar
本次 Generate-from-source 的候选 `meta.confidence.layout` 为 `high` 时，SHALL 存在 `fidelity.yaml`，且每个 included shell scene 的 chrome composition 均为 observed 或显式 unresolved（不得缺记录）。无 sidecar 或 shell chrome 不完整时 layout 置信度 SHALL 不高于 `medium`。已发布模板的 portable 校验 SHALL 强制同一关系：`layout: high` 且无 chrome-complete sidecar 是错误，不是可忽略警告。

#### Scenario: 无 sidecar 写 layout high
- **WHEN** 候选或已发布模板 `confidence.layout` 为 high 且没有 chrome-complete `fidelity.yaml`
- **THEN** validator 报告稳定 finding 并失败

#### Scenario: legacy-baseline 诚实降级
- **WHEN** 已发布模板保持无 sidecar 的 baseline
- **THEN** `confidence.layout` 必须为 medium 或更低，portable 校验可通过
