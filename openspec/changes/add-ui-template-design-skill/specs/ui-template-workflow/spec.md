## MODIFIED Requirements

### Requirement: Authoring 单一职责入口
`ui-template-author` skill SHALL 只响应模板创建、导入、更新、浏览与拆分意图。当用户请求使用已有模板实现页面时，skill SHALL 提示移交到 `ui-template-apply` skill，且不得在同一 SKILL.md 中加载 Apply 阶段流程。当用户请求建立或重构项目级 Design System、统一 token/Pattern、或防止页面视觉漂移，且并非抽取可发布模板时，skill SHALL 提示移交到 `ui-template-design`，且不得把该请求当成 Authoring 导入。项目库与 catalog 任一侧已有 published 匹配模板时，SHALL NOT 把“没有模板”当作失败原因。

#### Scenario: 用户要求从新来源创建模板
- **WHEN** 用户给定 URL、仓库、图片或设计文档并要求沉淀风格
- **THEN** skill 进入 Template Authoring 工作流，并按来源生成或更新模板

#### Scenario: 用户要求用已有模板实现页面
- **WHEN** 用户请求“用 workbench-shell 做页面”或“按模板实现 UI”
- **THEN** skill 告知该请求由 `ui-template-apply` 处理，且自身不展开 Apply 阶段流程

#### Scenario: 用户要求建立项目设计系统
- **WHEN** 用户请求“给这个后台做 Design System”或“先统一 token 和页面 Pattern，不要做成模板”
- **THEN** skill 告知该请求由 `ui-template-design` 处理，且自身不 Index 模板

#### Scenario: 尚无合适模板
- **WHEN** 用户想按某种风格实现页面，且项目库与 Author catalog 都没有可用 published 模板
- **THEN** skill 先引导完成 Authoring，再提示使用 `ui-template-apply` 继续消费端流程

#### Scenario: 只有 catalog 有官方模板
- **WHEN** 用户想用 `workbench-shell` 做页面，项目库为空，但 Author catalog 有 published `workbench-shell`
- **THEN** skill 不得声称没有模板；移交 Apply 后应能以 catalog pin 消费该模板，且不得为了移交而先播种项目库

## ADDED Requirements

### Requirement: 仅在用户要求发布时消费 Design freeze
`ui-template-author` SHALL NOT 在日常库动词中读取或改写 `.ui-template-design/`。仅当用户明确要求把已冻结的项目视觉语言发布为 schema v2 模板时，Authoring SHALL 把该 freeze 当作可选 session source 之一，并仍走 Generate → Validate → Eval → Index → Report。Design freeze SHALL NOT 自动变成 catalog 或项目 INDEX 行。

#### Scenario: freeze 存在但用户只要设计系统
- **WHEN** 项目已有 design freeze，用户未要求做成模板
- **THEN** Authoring 不启动，不写 INDEX

#### Scenario: 用户要求从 freeze 发布模板
- **WHEN** 用户明确要求把当前设计系统发布为模板，且 freeze 可解析
- **THEN** Authoring 按现有门禁导入；失败不得留下半套 INDEX 行
