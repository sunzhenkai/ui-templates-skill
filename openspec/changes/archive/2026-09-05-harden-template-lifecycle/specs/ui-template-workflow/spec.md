## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Optional implementation playbook 元数据
**Reason**: `implementation/` 允许技术栈、目录和项目工程决定进入模板，与现行设计规则/消费项目解耦边界冲突，并已被 `apply/` 顺序与验收指南取代。

**Migration**: 将设计规则迁移到 `spec.md` 或其拆分文档，将组件设计契约迁移到根 `components.md`，将阶段与取证迁移到 `apply/`；技术栈 adapter、代码目录、API/data 和依赖决定迁移到消费项目的 `.ui-template-apply/` 产物。
