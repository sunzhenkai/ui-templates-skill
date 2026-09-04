## ADDED Requirements

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
