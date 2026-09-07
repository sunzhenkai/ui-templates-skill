## MODIFIED Requirements

### Requirement: 美学方向先行
`ui-template-apply` skill SHALL 在生成 UI 代码前产出明确的美学承诺和 design thesis，包括风格关键词、明暗主题、配色角色、字体阶梯、密度、圆角、边框、阴影、动效边界、页面职责、信息词汇表、安静元素、视觉重点和禁止的默认套路。Phase 1 SHALL 在 `01-token-map.yaml` 中定义会话内 `design_rules[]`，并以 `LOCAL-STYLE-###`、`LOCAL-INFORMATION-###`、`LOCAL-PLACEMENT-###` 表达风格角色、信息语义和放置约束；每个 rule SHALL 绑定适用的 token path、模板 rule ID、组件族或 route。模板 `spec.md`、`tokens.yaml`、`fidelity.yaml` 和已确认 design freeze SHALL 优先于 `frontend-design` 建议。

#### Scenario: 选定配色与字体
- **WHEN** Agent 完成美学方向阶段
- **THEN** 产物包含选定风格、配色角色、字体搭配、密度基调和主题策略

#### Scenario: 建立设计规则
- **WHEN** Agent 完成 Phase 1
- **THEN** token map 包含可引用的 local style、information 和 placement rules，且每个偏离都有理由和确认

#### Scenario: 出现未映射的视觉值
- **WHEN** 实现中出现未映射的 arbitrary color、字号、间距或阴影
- **THEN** 浏览器验证或 review 判定不符合 token 约束，并要求改用语义 token

### Requirement: Layout 与路由先于组件组装
`ui-template-apply` skill SHALL 在编写 composed business component 前产出 route inventory、App Shell 形态、页面模式、断点行为、导航语义和 URL 状态约定。每个 included route SHALL 有 `placement_plan`，记录页面单一职责、主要信息、主要动作、信息分组、阅读/焦点顺序、动作顺序和响应式降级位置。路由入口 SHALL 使用真实 link 语义表达，当前路由 SHALL 使用当前页语义标记。模板已声明的 shell、slot、anchor、scroll、overlay 和 negative facts SHALL 保留，SHALL NOT 被通用审美重排。

#### Scenario: 生成 route inventory
- **WHEN** Agent 进入 IA/layout 阶段
- **THEN** 产物列出每个路由的页面模式、入口、URL 参数、shell 差异和响应式降级

#### Scenario: 记录放置计划
- **WHEN** Agent 为 included route 规划页面
- **THEN** Phase 2 产物说明主要信息、主要动作、分组、阅读/焦点顺序和窄屏降级

#### Scenario: 用按钮表达路由跳转
- **WHEN** 实现使用没有 `href` 的按钮执行侧栏导航、面包屑祖先跳转或跨页面结果打开
- **THEN** review 判定语义不通过，并要求改为真实 link

### Requirement: 组件 inventory
`ui-template-apply` skill SHALL 在页面组装前维护组件 inventory。每个组件条目 SHALL 说明用途、语义元素、variants、尺寸、交互状态、可访问性要求和来源，并 SHALL 包含 semantic decision：用户任务、信息角色、候选元素、选择理由、文案契约、风格角色、放置组和关联 local/template rule。信息展示 SHALL 按语义选择 primitive，而不是按装饰便利或组件库默认值选择；icon-only 控件 SHALL 有非空 accessible name。使用 React/Tailwind 项目时 SHOULD 优先检查 shadcn 是否已有生产组件。

#### Scenario: 新增基础组件
- **WHEN** Agent 准备实现 Button、Input、Dialog、Tabs、Table 或类似组件
- **THEN** 组件 inventory 记录语义元素、状态、可访问性要求和模板适配方式

#### Scenario: 选择信息展示元素
- **WHEN** Agent 需要展示状态、比较数据、元数据或操作入口
- **THEN** inventory 记录候选语义元素、最终 primitive、选择理由和关联规则

#### Scenario: 使用 icon-only 控件
- **WHEN** 组件在窄屏或紧凑态只显示图标
- **THEN** inventory 与实现必须提供非空 accessible name

### Requirement: Toolchain adapter
`ui-template-apply` skill SHALL 将外部 UI 知识、审美、组件、浏览器和 review 工具视为候选增强器。`frontend-design` SHALL 用于两段式设计预案、anti-default 自我批判、信息表达和克制取舍；工具不可用时 SHALL 手写同等决策。调用 `ui-ux-pro-max` 时 SHALL 使用 one-intent、显式 mode、2–5 个有效关键词、top identity 校验、最多一次重试和明确 abstain；未经验证的结果 SHALL 不得持久化为第二套设计权威。

#### Scenario: frontend-design 提供设计方法
- **WHEN** Agent 在 Phase 1 或实现前评估视觉与信息表达
- **THEN** Agent 记录设计论点、反默认检查、自我批判和模板优先级裁决

#### Scenario: 审美建议与模板冲突
- **WHEN** 外部设计建议要求新的精确值或重排已声明结构
- **THEN** 模板契约与已确认 design freeze 优先；未经记录和确认的偏离不得实现

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

#### Scenario: 新项目需要整体视觉方向
- **WHEN** Agent 使用 `ui-ux-pro-max` 为新项目生成方向
- **THEN** 使用 design-system mode 和机器可读输出，并记录 query、mode、top identity、适配理由、来源和 fallback

### Requirement: 真实浏览器验证
`ui-template-apply` skill SHALL 在收尾前用真实浏览器验证渲染结果，并 SHALL 生成绑定模板 digest、源码 revision、build identity、浏览器版本、页面、视口、主题和状态的结构化证据。验证 SHALL 覆盖 console、可访问性树、computed style、关键交互、URL 恢复、声明支持的状态，以及 Design semantics & consistency 中的 local rule。同一 style role 的视觉 treatment SHALL 一致；错误语义元素、信息分组、阅读/焦点顺序或主要信息/动作放置 SHALL 使对应 gate 失败。

#### Scenario: 多视口验证
- **WHEN** 页面通过浏览器验证
- **THEN** 证据矩阵包含模板要求的 desktop、compact 和 mobile 视口及每个 included route 的结果

#### Scenario: 验证设计语义
- **WHEN** Agent 执行 Phase 8
- **THEN** current-build evidence 覆盖 local style、information 和 placement rules，并绑定 expected/actual

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

### Requirement: Design review 门禁
`ui-template-apply` skill SHALL 以多阶段 design review 作为完成门禁。review SHALL 覆盖视觉一致性、信息语义、元素放置、响应式、交互状态、可访问性、路由语义、模板 token 符合度和关键用户流程。风格漂移、错误 primitive、装饰性信息展示、任务组打散或主要动作层级错误不得通过 review。

#### Scenario: review 发现可访问性问题
- **WHEN** review 发现 accessible name 缺失、焦点不可见、交互控件嵌套或颜色是唯一状态信号
- **THEN** Agent 必须修复并重新执行相关 review 检查

#### Scenario: review 发现设计语义缺陷
- **WHEN** review 发现同一 role 风格不一致、状态用错误元素表达或主要信息/动作放置违反 placement plan
- **THEN** Agent 必须修复并用当前 build evidence 复验原 rule

#### Scenario: review 发现响应式缺陷
- **WHEN** 某视口下出现横向滚动、控件不可达或关键文本不可读
- **THEN** Agent 必须修复响应式问题，并在原视口重新截图验证
