## MODIFIED Requirements

### Requirement: 独立入口与模板消费契约
`ui-template-apply` skill SHALL 只在用户选择已有模板并要求实现 UI 时启动，并 SHALL 通过 Authoring 拥有的版本化契约读取模板：`spec.md` 是设计规则入口、`tokens.yaml` 是精确值唯一载体、`meta.yaml` coverage 决定验收严格度、`evidence.yaml` 提供来源审计。消费者 SHALL 只接受 `source | computed | estimated | default` origin，并 SHALL 在不支持 schema version 时明确停止。

#### Scenario: 用户要求用已有模板实现页面
- **WHEN** 用户要求使用一个已存在且 schema 受支持的模板实现页面
- **THEN** skill 进入 Template Apply 工作流，并确认页面范围、平台、技术栈和 coverage decisions

#### Scenario: 规则冲突
- **WHEN** 模板拆分文档或 `apply/` 与 `spec.md` 冲突
- **THEN** skill 以 `spec.md` 为准，记录冲突、规则 ID 与处理结果，并产出模板反馈

#### Scenario: coverage 不足
- **WHEN** 所需页面模式、平台、视口、主题或状态被标记为 defaulted、unsupported 或未覆盖
- **THEN** skill 在实现前记录 `accepted | deferred | excluded` 决定，不得静默即兴发挥

#### Scenario: schema 或 origin 不受支持
- **WHEN** 模板 schema version 不受支持或 token 包含未知 origin
- **THEN** skill 拒绝开始实现并报告迁移或修复要求，不得猜测语义

### Requirement: 阶段化 Apply 工作流
`ui-template-apply` skill SHALL 定义且不得跳过 0–9 阶段，并 SHALL 为每个阶段生成具有稳定名称和状态的标准产物。阶段完成 SHALL 由产物与证据决定，而不是只由任务列表或页面文件存在决定。

#### Scenario: 跳过设计系统直接写页面
- **WHEN** Agent 尚未产出美学方向、完整 token map 和模板 digest 就开始生成页面代码
- **THEN** skill 将 Phase 1 标记为未通过，并要求先完成设计系统

#### Scenario: 组件先于 layout 完成
- **WHEN** Agent 准备编写 composed business component，但 route inventory、shell 形态或目录结构尚未确认
- **THEN** skill 要求先完成 Phase 2 与 Phase 3 的标准产物

#### Scenario: 页面完成后未做浏览器验证
- **WHEN** Agent 宣称页面实现完成但缺少 Phase 8 证据和 Phase 9 review
- **THEN** skill 不允许完成，并要求补齐真实浏览器检查和复验记录

#### Scenario: 阶段产物缺失
- **WHEN** checkpoint 将阶段标为完成但该阶段必需 artifact 不存在或 hash 不匹配
- **THEN** skill 将该阶段及其依赖阶段标为待复验，并回退到最早失效阶段

### Requirement: Toolchain adapter
`ui-template-apply` skill SHALL 将外部 UI 知识、审美、组件、浏览器和 review 工具视为候选增强器。调用 `ui-ux-pro-max` 时 SHALL 使用 one-intent、显式 mode、2–5 个有效关键词、top identity 校验、最多一次重试和明确 abstain；未经验证的结果 SHALL 不得持久化为第二套设计权威。

#### Scenario: 新项目需要整体视觉方向
- **WHEN** Agent 使用 `ui-ux-pro-max` 为新项目生成方向
- **THEN** 使用 design-system mode 和机器可读输出，并记录 query、mode、top identity、适配理由、来源和 fallback

#### Scenario: 局部 UX 或技术栈问题
- **WHEN** Agent 查询单一交互问题或已知技术栈问题
- **THEN** 分别使用显式 domain 或 stack mode，不用包含多个主意图的查询替代

#### Scenario: 检索结果为空或错配
- **WHEN** 首次结果为空、领域错误或与目标平台不匹配
- **THEN** Agent 只允许收窄重试一次；仍失败时记录无 verified match，并回退模板规则

#### Scenario: 工具要求持久化设计系统
- **WHEN** 外部工具可写入自己的 master/override 文件
- **THEN** Apply 默认拒绝持久化，除非用户另行授权且该文件不取代 `spec.md` 与 `tokens.yaml`

#### Scenario: 默认工具不可用
- **WHEN** 任一外部工具不可用
- **THEN** Agent 记录等效回退方案并保持相同验收目标，不降低 gate

#### Scenario: 默认工具可用
- **WHEN** 知识检索、审美、组件、浏览器和 review 工具均可用
- **THEN** Agent 按 Query Contract 调用适用工具、验证输出身份，并保留选择与映射证据

#### Scenario: shadcn 检索不可用
- **WHEN** shadcn MCP 或组件检索不可用
- **THEN** Agent 使用本地组件或手工 inventory 回退，并继续满足相同语义、状态和可访问性 gate

#### Scenario: 浏览器 MCP 不可用
- **WHEN** Playwright MCP 和 chrome-devtools MCP 均不可用
- **THEN** Agent 使用 browser-use 或目标项目的本地浏览器脚本生成同等结构化证据

### Requirement: 真实浏览器验证
`ui-template-apply` skill SHALL 在收尾前用真实浏览器验证渲染结果，并 SHALL 生成绑定模板 digest、源码 revision、build identity、浏览器版本、页面、视口、主题和状态的结构化证据。验证 SHALL 覆盖 console、可访问性树、computed style、关键交互、URL 恢复和声明支持的状态。

#### Scenario: 多视口验证
- **WHEN** 页面通过浏览器验证
- **THEN** 证据矩阵包含模板要求的 desktop、compact 和 mobile 视口及每个 included route 的结果

#### Scenario: computed style 与模板不一致
- **WHEN** 浏览器 computed style 显示字号、颜色、间距、圆角或阴影不符合 token map
- **THEN** 对应 gate 失败，证据记录 expected/actual 与规则 ID，修复后追加复验结果

#### Scenario: 控制台或可访问性错误
- **WHEN** 浏览器出现未解释 console error、unhandled rejection、缺失 accessible name 或错误 role
- **THEN** 页面不得标记为完成，且 finding 必须进入 review

#### Scenario: 控制台错误
- **WHEN** 浏览器控制台出现未解释的 error 或 unhandled rejection
- **THEN** 该页面 gate 失败，结构化证据记录错误与复验结果

#### Scenario: 证据无法关联当前构建
- **WHEN** 证据缺少 build identity、源码 revision 或模板 digest，或与 checkpoint 不一致
- **THEN** 证据视为过期，不得用于完成 Phase 8

### Requirement: 模板反馈产出
`ui-template-apply` skill 完成前 SHALL 对可复用规则缺口产出符合统一 feedback schema 的记录。每条记录 SHALL 有唯一 ID、模板 identity/version、场景、证据、建议、影响范围和初始 `proposed` 状态；项目专属问题 SHALL 留在消费项目决定中。

#### Scenario: 发现可复用规则缺口
- **WHEN** 实现发现模板缺少可复用的路由状态、错误态或可访问性规则
- **THEN** Agent 在固定 feedback inbox 产出 `proposed` 记录，并引用证据与相关规则 ID

#### Scenario: 仅当前业务或技术栈需要特殊处理
- **WHEN** 问题只来自当前业务、目录、API/mock 或框架实现
- **THEN** Agent 将决定记录在消费项目产物中，不生成模板反馈

#### Scenario: 仅当前业务需要特殊样式
- **WHEN** 问题只来自当前业务页面的产品要求
- **THEN** Agent 将决定记录在消费项目实现说明中，不产出模板反馈

#### Scenario: 重复发现同一缺口
- **WHEN** feedback inbox 已存在相同 ID 或等价的 active 反馈
- **THEN** Agent 合并新证据或引用既有记录，不创建重复反馈

## ADDED Requirements

### Requirement: Apply checkpoint 与中断恢复
Apply SHALL 在消费项目中维护机器可读 checkpoint，至少记录模板 identity/version/digest、included/excluded 范围、阶段状态、artifact 路径、证据路径、最后验证的源码 revision 与 build identity。恢复 SHALL 先验证这些值，再决定继续或回退。

#### Scenario: 正常跨会话恢复
- **WHEN** 新会话读取完整且 hash 一致的 checkpoint
- **THEN** skill 只从第一个未完成阶段继续，并保留既有已验证证据

#### Scenario: 模板 token 漂移
- **WHEN** 当前 `tokens.yaml` digest 与 checkpoint 不同
- **THEN** skill 至少回退到 Phase 1，重新生成 token map 并使依赖的浏览器证据过期

#### Scenario: 页面存在但证据缺失
- **WHEN** 页面文件已存在而 Phase 8 证据缺失或过期
- **THEN** skill 不把该页面视为完成，并重新执行相关浏览器 gate

#### Scenario: 用户改变范围
- **WHEN** included、deferred 或 excluded 页面范围发生变化
- **THEN** checkpoint 记录变更和确认，受影响阶段重新评估，不静默扩大或缩小验收范围
