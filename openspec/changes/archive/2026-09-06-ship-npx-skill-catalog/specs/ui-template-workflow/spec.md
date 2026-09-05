## ADDED Requirements

### Requirement: 只读 catalog 与可写项目库分离
`ui-template-author` SHALL 把官方 published 模板放在 skill 内只读 catalog，并把消费项目 `templates/` + `INDEX.md` 当作唯一可写生产库。Authoring 的 create / update-from-source / update-from-feedback / update-portable / retire / delete / Index SHALL 只改项目库，SHALL NOT 改 catalog。catalog 随 skill 升级替换；项目库不随 skill 安装覆盖。

#### Scenario: 本仓维护官方模板
- **WHEN** 维护者更新仓库根生产 `templates/workbench-shell`
- **THEN** catalog 必须被同步为同一 published 集合的副本，且 Authoring 日常库动词仍写仓库根或指定项目 `templates/`

#### Scenario: 安装环境创建新模板
- **WHEN** 用户在已安装 Author skill 的消费项目创建新模板
- **THEN** 文件写入项目 `templates/<name>/` 与项目 INDEX，catalog 字节不变

#### Scenario: 升级 skill 不覆盖用户库
- **WHEN** 用户项目已有自建或改过的 `templates/<name>/`，随后升级 Author skill
- **THEN** catalog 可更新，该项目模板目录与 INDEX 行不被 skill 安装覆盖

### Requirement: 缺项目行时从 catalog 播种
当用户要使用 catalog 中已有的 published 模板，且项目 INDEX 没有同名行或没有对应目录时，Authoring/Apply 共享的库解析 SHALL 把该模板从 catalog 播种到项目 `templates/` 并写入 published INDEX 行，然后才允许后续库动词或 Apply Intake。已有同名项目目录或 INDEX 行 SHALL NOT 被播种覆盖；冲突时保留项目库并报告，不得静默替换。

#### Scenario: 空项目首次使用官方模板
- **WHEN** 消费项目没有 `templates/` 或 INDEX 中没有 `workbench-shell`，且 Author catalog 有 published `workbench-shell`
- **THEN** 项目出现完整模板目录与 published INDEX 行，内容来自 catalog

#### Scenario: 项目已有同名模板
- **WHEN** 项目 INDEX 或目录已有 `workbench-shell`
- **THEN** 播种不改现有文件；若用户要官方副本必须显式 refresh 并得到确认

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
- **THEN** skill 不得声称没有模板；播种或移交 Apply 后应能消费该模板
