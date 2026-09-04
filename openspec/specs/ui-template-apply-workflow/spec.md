## Purpose

定义独立 `ui-template-apply` skill 使用已有 UI 模板实现真实 UI 的行为契约：按阶段推进、只消费模板公开数据契约、以可访问性、路由语义、真实浏览器验证和 design review 作为完成门禁。

## Requirements

### Requirement: 独立入口与模板消费契约
`ui-template-apply` skill SHALL 只在用户选择已有模板并要求实现 UI 时启动，并 SHALL 依赖一份精简消费契约读取模板：`spec.md` 是设计规则唯一入口、`tokens.yaml` 是精确值唯一载体、`meta.yaml` coverage 决定验收严格度；冲突时以 `spec.md` 为准。该契约 SHALL 不复制 Authoring 的格式生成规则。

#### Scenario: 用户要求用已有模板实现页面
- **WHEN** 用户要求“用 workbench-shell 做页面”
- **THEN** skill 进入 Template Apply 工作流，并要求确认页面范围、平台和技术栈

#### Scenario: 规则冲突
- **WHEN** 模板内文档与 `spec.md` 冲突
- **THEN** skill 以 `spec.md` 为准，并记录冲突与处理结果

#### Scenario: coverage 不足
- **WHEN** 所需页面模式在 `meta.yaml` coverage 中标记为未覆盖
- **THEN** skill 在实现前向用户确认该模式的处理方式，不得静默即兴发挥

### Requirement: 阶段化 Apply 工作流
`ui-template-apply` skill SHALL 定义且不得跳过以下阶段：模板选择与范围确认、美学方向与设计系统、IA/layout/route、代码目录结构、基础组件、页面与垂直切片、完整页面模式实现、浏览器验证、design review、模板反馈评估。每个阶段 SHALL 说明输入、产物、工具配合和验收门禁。

#### Scenario: 跳过设计系统直接写页面
- **WHEN** Agent 尚未产出美学方向和 token 映射就开始生成页面代码
- **THEN** skill 将该阶段标记为未通过，并要求先完成设计系统

#### Scenario: 组件先于 layout 完成
- **WHEN** Agent 准备编写 composed business component，但 route inventory、shell 形态或目录结构尚未确认
- **THEN** skill 要求先完成 IA/layout 和代码结构阶段

#### Scenario: 页面完成后未做浏览器验证
- **WHEN** Agent 宣称页面实现完成
- **THEN** skill 要求先通过真实浏览器检查与 design review，再允许收尾

### Requirement: 美学方向先行
`ui-template-apply` skill SHALL 在生成 UI 代码前产出明确的美学承诺，包括风格关键词、明暗主题、配色角色、字体阶梯、密度、圆角、边框与阴影策略。后续实现 SHALL 将颜色、字号、间距、圆角和层级映射到语义 token 或已确认的模板规则，而不是散落任意值。

#### Scenario: 选定配色与字体
- **WHEN** Agent 完成美学方向阶段
- **THEN** 产物包含选定风格、配色角色、字体搭配、密度基调和主题策略

#### Scenario: 出现未映射的视觉值
- **WHEN** 实现中出现未映射的 arbitrary color、字号、间距或阴影
- **THEN** 浏览器验证或 review 判定不符合 token 约束，并要求改用语义 token

### Requirement: Layout 与路由先于组件组装
`ui-template-apply` skill SHALL 在编写 composed business component 前产出 route inventory、App Shell 形态、页面模式、断点行为、导航语义和 URL 状态约定。路由入口 SHALL 使用真实 link 语义表达，当前路由 SHALL 使用当前页语义标记。

#### Scenario: 生成 route inventory
- **WHEN** Agent 进入 IA/layout 阶段
- **THEN** 产物列出每个路由的页面模式、入口、URL 参数、shell 差异和响应式降级

#### Scenario: 用按钮表达路由跳转
- **WHEN** 实现使用没有 `href` 的按钮执行侧栏导航、面包屑祖先跳转或跨页面结果打开
- **THEN** review 判定语义不通过，并要求改为真实 link

### Requirement: 代码目录结构先于组件组装
`ui-template-apply` skill SHALL 在组件组装前确认代码目录结构、命名规则、状态管理、数据访问、路由实现和测试组织。后续新增文件 SHALL 有唯一且明确的归属。

#### Scenario: 确认目录约定
- **WHEN** Agent 完成代码结构阶段
- **THEN** 产物说明 shell、layout、页面、业务模块、基础组件、通用工具、状态和测试的存放位置

#### Scenario: 新文件归属不明确
- **WHEN** 实现需要新增 composed component 或 utility，但产物没有对应目录规则
- **THEN** skill 要求先补充目录约定，再创建文件

### Requirement: 组件 inventory
`ui-template-apply` skill SHALL 在页面组装前维护组件 inventory。每个组件条目 SHALL 说明用途、语义元素、variants、尺寸、交互状态、可访问性要求和来源；使用 React/Tailwind 项目时 SHOULD 优先检查 shadcn 是否已有生产组件。

#### Scenario: 新增基础组件
- **WHEN** Agent 准备实现 Button、Input、Dialog、Tabs、Table 或类似组件
- **THEN** 组件 inventory 记录语义元素、状态、可访问性要求和模板适配方式

#### Scenario: 使用 icon-only 控件
- **WHEN** 组件在窄屏或紧凑态只显示图标
- **THEN** inventory 与实现必须提供非空 accessible name

### Requirement: Toolchain adapter
`ui-template-apply` skill SHALL 将以下工具作为默认 adapter：`ui-ux-pro-max` 用于风格、配色、字体和 UX 规则检索；`frontend-design` 用于美学承诺；shadcn 用于组件检索与生产组件来源；Playwright MCP、chrome-devtools MCP 或 browser-use 用于真实浏览器反馈；design review 或等效 checklist 用于完成前审查。某个工具不可用时 SHALL 记录回退方案，流程仍须达到同等验收目标。

#### Scenario: 默认工具可用
- **WHEN** Agent 在 React/Tailwind 项目中执行 Template Apply
- **THEN** 工作流引用知识检索、美学承诺、组件检索、浏览器验证和 design review 五类能力

#### Scenario: shadcn 检索不可用
- **WHEN** shadcn MCP 或组件检索工具不可用
- **THEN** Agent 记录回退策略，先手写组件 inventory，再按同等可访问性与状态要求实现

#### Scenario: 浏览器 MCP 不可用
- **WHEN** Playwright MCP 和 chrome-devtools MCP 均不可用
- **THEN** Agent 可使用 browser-use 或本地 Playwright 脚本完成同等真实浏览器验证

### Requirement: 真实浏览器验证
`ui-template-apply` skill SHALL 在收尾前用真实浏览器验证渲染结果。验证 SHALL 覆盖桌面与窄屏视口、控制台错误、可访问性树、computed style、关键交互状态、加载/空/错误状态和路由恢复。验证产物 SHALL 保留截图或可复查的检查结果。

#### Scenario: 多视口验证
- **WHEN** 页面通过浏览器验证
- **THEN** 产物包含桌面视口、compact 视口和 mobile 视口的渲染证据

#### Scenario: computed style 与模板不一致
- **WHEN** 浏览器 computed style 显示字号、颜色、间距或阴影不符合模板规则
- **THEN** 验证失败，Agent 必须修复后重新验证

#### Scenario: 控制台错误
- **WHEN** 浏览器控制台出现未解释的错误或未处理 rejection
- **THEN** 该页面不得标记为完成

### Requirement: Design review 门禁
`ui-template-apply` skill SHALL 以多阶段 design review 作为完成门禁。review SHALL 覆盖视觉一致性、响应式、交互状态、可访问性、路由语义、模板 token 符合度和关键用户流程。

#### Scenario: review 发现可访问性问题
- **WHEN** review 发现 accessible name 缺失、焦点不可见、交互控件嵌套或颜色是唯一状态信号
- **THEN** Agent 必须修复并重新执行相关 review 检查

#### Scenario: review 发现响应式缺陷
- **WHEN** 某视口下出现横向滚动、控件不可达或关键文本不可读
- **THEN** Agent 必须修复响应式问题，并在原视口重新截图验证

### Requirement: 模板反馈产出
`ui-template-apply` skill 完成前 SHALL 评估实现过程中发现的规则缺口。若问题会重复出现在其他消费者中，Agent SHALL 产出结构化反馈记录供 `ui-template` 消费；仅属于当前业务的问题 SHALL 记录在项目内，不得污染模板。

#### Scenario: 发现可复用规则缺口
- **WHEN** 实现发现模板未定义 icon-only 控件、路由状态或错误态的可复用规则
- **THEN** Agent 产出包含场景、证据与建议的反馈记录

#### Scenario: 仅当前业务需要特殊样式
- **WHEN** 问题只来自某个业务页面的产品要求
- **THEN** Agent 将决定记录在项目实现说明中，而不是产出模板反馈

### Requirement: Structural fidelity profile Intake
`ui-template-apply` SHALL 在 Phase 0 检测并验证 `fidelity.yaml`。受支持 structural profile SHALL 进入 included/deferred/excluded 决策；合法 v2 模板无 sidecar 时 SHALL 明确记录 baseline fidelity；存在未知 profile/schema、悬空引用或未解决的 included blocker 时 SHALL 拒绝 structural consumption。

#### Scenario: 受支持 structural profile
- **WHEN**模板包含验证通过的 `repo-structural-v1`
- **THEN** Intake 记录 profile identity、conformance、scope、canonical digest 与 unresolved decisions，并将其纳入 checkpoint template identity

#### Scenario: 旧 v2 模板无 sidecar
- **WHEN**模板满足 core v2 但没有 `fidelity.yaml`
- **THEN** Apply 可继续 baseline 流程，明确记录 structural fidelity unavailable，不把布局或细节一致性标记为 profile-verified

#### Scenario: Unknown profile
- **WHEN**sidecar schema/profile version 不受支持
- **THEN** Apply 停止并报告兼容升级，不忽略 sidecar 后继续猜测

### Requirement: Phase 2 layout topology consumption
Phase 2 SHALL 将每个 included layout scene 的 regions、arrangement、fill/shrink/wrap、scroll domains、overlay scope/anchor 与 responsive modes 映射到稳定约束 identity。消费项目 MAY 使用任意技术栈和 DOM，只要 current-build evidence 证明相同可观察关系。

#### Scenario: Board structural scene
- **WHEN**included scene 声明横向 non-wrapping Board、non-shrinking columns 和内部 inline scroll owner
- **THEN** Phase 2 产物保留这些约束，且不得用自动换行 grid 或根横向滚动替代

#### Scenario: 主从有两个滚动域
- **WHEN**profile 分别声明 master/detail block scroll owners
- **THEN** Phase 2 生成两个 domain identity，不将根页面或错误 region 作为统一 scroll owner

### Requirement: Phase 4 geometry 与 contextual state consumption
Phase 4 SHALL 将 included component/slot geometry 和 subject/context/state presentation 映射到组件 inventory 与 token map。Apply SHALL 保留 profile 的 negative facts，不得用框架、组件库或 Agent 常见默认值覆盖 `none`、不对称 padding、non-wrap 或无 shadow 等 expected。

#### Scenario: Dialog content geometry
- **WHEN**profile 将 Dialog content 四个逻辑方向 padding 映射到 token refs
- **THEN**组件 inventory 和实现约束包含全部方向，顶部 padding 不得因关闭按钮或 header 结构省略

#### Scenario: Navigation link hover
- **WHEN**profile 声明 navigation link hover 使用背景且 `text_decoration: none`
- **THEN**实现不得继承 button-link/prose-link 的 hover underline

#### Scenario: Button link 例外
- **WHEN**profile 为 button-link context 声明 hover underline
- **THEN**该 decoration 只适用于对应 context，不传播到 entity-row、navigation 或 card-link

### Requirement: Structural current-build browser evidence
Phase 8 SHALL 从 included structural records 确定性生成 required scenario IDs，并以 current-build computed style、bounding geometry、scroll owner、overflow、state transition、overlay scope 和 Accessibility tree 证明 expected/actual。截图 MAY 作为辅助证据，但不得替代可解析结构与 computed evidence。

#### Scenario: 检查 Dialog 顶部 padding
- **WHEN**浏览器打开 included Dialog
- **THEN**evidence 记录 content `padding-block-start` 的 token-resolved expected、computed actual、rule/profile record ID 和 current identities

#### Scenario: 检查 link hover decoration
- **WHEN**浏览器分别 hover navigation、entity-row 和 button-link
- **THEN**每个 context 的 text decoration 与背景变化匹配其独立 record，不以单一全局 link 断言代替

#### Scenario: 检查非常规 layout
- **WHEN**浏览器在声明 viewport/mode 渲染 Board、主从或 overlay scene
- **THEN**evidence 证明指定 region 承担对应轴滚动、非 owner 不意外滚动、non-wrap/non-shrink 与 overlay scope 成立

### Requirement: Profile 变化恢复与反馈
Structural profile canonical semantics 的变化 SHALL 使受影响 Phase 2/4/8 产物和证据过期，并从最早受影响 phase 恢复。若 current build 无法满足可复用 profile record，Apply SHALL 产出引用 record/rule/current-build evidence 的 feedback；仅属目标技术栈的问题 SHALL 留在消费项目。

#### Scenario: 仅 state record 变化
- **WHEN**contextual state presentation 发生语义变化而 layout records 未变
- **THEN**Apply 至少重开 Phase 4 与 Phase 8，并保留仍有效的 Phase 2 artifact

#### Scenario: Layout record 变化
- **WHEN**scroll owner、region relation 或 responsive mode 变化
- **THEN**Apply 从 Phase 2 重开，并使依赖的 component 和 browser evidence 过期

#### Scenario: 不同技术栈实现相同 contract
- **WHEN**两个目标项目使用不同框架或组件库但通过相同 structural scenario IDs
- **THEN**Apply 接受两者，不要求源码目录、组件名、CSS class 或 DOM 同构
