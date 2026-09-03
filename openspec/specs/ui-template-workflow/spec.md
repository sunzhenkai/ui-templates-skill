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
