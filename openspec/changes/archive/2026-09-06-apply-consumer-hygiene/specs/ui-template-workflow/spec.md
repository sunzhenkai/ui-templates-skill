## ADDED Requirements

### Requirement: 写模板时才从 catalog 领养
当用户或 Authoring 要改模板、接受 feedback 落库、retire、delete、Index，或用户明确要求把官方模板接到本仓时，若项目 INDEX 没有同名行且没有对应目录，Authoring SHALL 把 catalog 中该 published 模板领养到项目 `templates/` 并写入 published INDEX 行，然后才允许这些写动词。Apply Intake SHALL NOT 执行该领养。已有同名项目目录或 INDEX 行 SHALL NOT 被领养覆盖；冲突时保留项目库并报告，不得静默替换。显式 `seed` 仍是 Authoring 库动词，行为与领养相同。

#### Scenario: 空项目只 Apply 不落库
- **WHEN** 消费项目没有 `templates/`，用户只用 catalog 中的 `workbench-shell` 实现页面，且未要求改模板或接到本仓
- **THEN** 项目不出现 `templates/` 或 INDEX 行

#### Scenario: 接受 feedback 时才领养
- **WHEN** Authoring 接受针对 catalog pin 的 feedback 并要改规格
- **THEN** 项目出现完整 `templates/<name>/` 与 published INDEX 行，内容来自当时 pin 住的 catalog 副本，随后只改项目库

#### Scenario: 项目已有同名模板
- **WHEN** 项目 INDEX 或目录已有 `workbench-shell`
- **THEN** 领养不改现有文件；若用户要官方副本必须显式 refresh 并得到确认

#### Scenario: catalog 无该名称
- **WHEN** 用户要的模板在 catalog 与项目库都不存在
- **THEN** 不伪造目录；按“尚无合适模板”移交 Authoring 从源创建

## MODIFIED Requirements

### Requirement: Authoring 单一职责入口
`ui-template-author` skill SHALL 只响应模板创建、导入、更新、浏览与拆分意图。当用户请求使用已有模板实现页面时，skill SHALL 提示移交到 `ui-template-apply` skill，且不得在同一 SKILL.md 中加载 Apply 阶段流程。项目库与 catalog 任一侧已有 published 匹配模板时，SHALL NOT 把“没有模板”当作失败原因。

#### Scenario: 用户要求从新来源创建模板
- **WHEN** 用户给定 URL、仓库、图片或设计文档并要求沉淀风格
- **THEN** skill 进入 Template Authoring 工作流，并按来源生成或更新模板

#### Scenario: 用户要求用已有模板实现页面
- **WHEN** 用户请求“用 workbench-shell 做页面”或“按模板实现 UI”
- **THEN** skill 告知该请求由 `ui-template-apply` 处理，且自身不展开 Apply 阶段流程

#### Scenario: 尚无合适模板
- **WHEN** 用户想按某种风格实现页面，且项目库与 Author catalog 都没有可用 published 模板
- **THEN** skill 先引导完成 Authoring，再提示使用 `ui-template-apply` 继续消费端流程

#### Scenario: 只有 catalog 有官方模板
- **WHEN** 用户想用 `workbench-shell` 做页面，项目库为空，但 Author catalog 有 published `workbench-shell`
- **THEN** skill 不得声称没有模板；移交 Apply 后应能以 catalog pin 消费该模板，且不得为了移交而先播种项目库

## REMOVED Requirements

### Requirement: 缺项目行时从 catalog 播种
**Reason**: Apply 默认播种会污染只消费的项目仓。官方模板改为 catalog pin 消费；项目库只在写模板或用户显式接到本仓时出现。
**Migration**: 使用本 delta 的「写模板时才从 catalog 领养」。已播种项目继续走项目库，不被覆盖。
