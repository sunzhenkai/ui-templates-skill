## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 双工作流入口
**Reason**: 单 skill 同时常驻加载两条互不重叠的流程，导致每次触发都携带约一半无关上下文；Apply 流程已迁出为独立 `ui-template-apply` skill。
**Migration**: Authoring 意图继续由 `ui-template` 处理；Apply 意图改由 `ui-template-apply` 处理，见新 capability `ui-template-apply-workflow`。

### Requirement: 阶段化 Apply 工作流
**Reason**: Apply 阶段流程与 Authoring 无共享步骤，属于消费端专属行为。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“阶段化 Apply 工作流”。

### Requirement: 美学方向先行
**Reason**: 美学承诺与 token 冻结只发生在消费端实现阶段。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“美学方向先行”。

### Requirement: Layout 与路由先于组件组装
**Reason**: route inventory 与 App Shell 决策属于消费端实现阶段。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“Layout 与路由先于组件组装”。

### Requirement: 代码目录结构先于组件组装
**Reason**: 消费项目目录契约不属于模板 Authoring 职责。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“代码目录结构先于组件组装”。

### Requirement: 组件 inventory
**Reason**: 组件 inventory 属于消费端实现阶段。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“组件 inventory”。

### Requirement: Toolchain adapter
**Reason**: Apply 工具链（知识检索、美学承诺、组件检索、浏览器、review）与 Authoring 采集工具互不重叠。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“Toolchain adapter”。

### Requirement: 真实浏览器验证
**Reason**: 浏览器验收门禁属于消费端实现完成条件。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“真实浏览器验证”。

### Requirement: Design review 门禁
**Reason**: design review 属于消费端实现完成条件。
**Migration**: 该 requirement 迁移至 `ui-template-apply-workflow` 的“Design review 门禁”。

### Requirement: 模板反馈闭环
**Reason**: 反馈产出与回写决策分别属于两个 skill；原 requirement 混合了两侧行为。
**Migration**: 产出侧行为迁移至 `ui-template-apply-workflow` 的“模板反馈产出”；消费侧行为由本 capability 新增的“模板反馈消费”承接。
