## Purpose

定义独立 `ui-template-apply` skill 使用已有 UI 模板实现真实 UI 的行为契约：按阶段推进、只消费模板公开数据契约、以可访问性、路由语义、真实浏览器验证和 design review 作为完成门禁。

## Requirements

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

### Requirement: Design review 门禁
`ui-template-apply` skill SHALL 以多阶段 design review 作为完成门禁。review SHALL 覆盖视觉一致性、响应式、交互状态、可访问性、路由语义、模板 token 符合度和关键用户流程。

#### Scenario: review 发现可访问性问题
- **WHEN** review 发现 accessible name 缺失、焦点不可见、交互控件嵌套或颜色是唯一状态信号
- **THEN** Agent 必须修复并重新执行相关 review 检查

#### Scenario: review 发现响应式缺陷
- **WHEN** 某视口下出现横向滚动、控件不可达或关键文本不可读
- **THEN** Agent 必须修复响应式问题，并在原视口重新截图验证

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
Phase 2 SHALL 只把本次模板 `fidelity.yaml` **已声明**的 layout/chrome record（regions、arrangement、fill/shrink/wrap、scroll domains、overlay scope/anchor、responsive modes，以及已声明的 `shell_variant`、有序 slots、锚点）映射到稳定约束 identity。消费项目 MAY 使用任意技术栈和 DOM，只要 current-build evidence 证明相同可观察关系。Apply SHALL NOT 改写已声明的 variant/slot/anchor；通用 Apply skill SHALL NOT 要求未声明的 `chat-fab`、A–E 或 Board。无 sidecar 的 baseline 模板 SHALL 明确 structural chrome unavailable，这些几何 gate 为 unavailable，不得把自行发明的壳标为 profile-verified。

#### Scenario: Board structural scene
- **WHEN** included scene 声明横向 non-wrapping Board、non-shrinking columns 和内部 inline scroll owner
- **THEN** Phase 2 产物保留这些约束，且不得用自动换行 grid 或根横向滚动替代

#### Scenario: 主从有两个滚动域
- **WHEN** profile 分别声明 master/detail block scroll owners
- **THEN** Phase 2 生成两个 domain identity，不将根页面或错误 region 作为统一 scroll owner

#### Scenario: 已声明 inset 不得改成硬切
- **WHEN** included shell scene 声明 `shell_variant: inset`，且声明了锚在 page-header 的 header-trigger
- **THEN** Phase 2 约束保留这些已声明 record；实现改写它们时 Phase 8 对应 scenario 失败

#### Scenario: 有序槽位被重排
- **WHEN** profile 顺序为 workspace-switcher、search、compose
- **THEN** Phase 2 保留该顺序 identity；实现改成搜索/创建并排按钮且无切换器槽位时不得标 chrome 约束通过

#### Scenario: baseline 无 chrome records
- **WHEN** 模板无 `fidelity.yaml`
- **THEN** Phase 2 记录 structural chrome unavailable，不把消费项目自选壳形态写进 profile-verified 证据

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
Phase 8 SHALL 从 included structural records 确定性生成 required scenario IDs，并以 current-build computed style、bounding geometry、scroll owner、overflow、state transition、overlay scope、**已声明的 shell variant / 槽位顺序 / 锚点** 和 Accessibility tree 证明 expected/actual。截图 MAY 作为辅助证据，但不得替代可解析结构与 computed evidence。未声明的 chrome record SHALL NOT 进入 required scenario。

#### Scenario: 检查 Dialog 顶部 padding
- **WHEN** 浏览器打开 included Dialog
- **THEN** evidence 记录 content `padding-block-start` 的 token-resolved expected、computed actual、rule/profile record ID 和 current identities

#### Scenario: 检查 link hover decoration
- **WHEN** 浏览器分别 hover navigation、entity-row 和 button-link
- **THEN** 每个 context 的 text decoration 与背景变化匹配其独立 record，不以单一全局 link 断言代替

#### Scenario: 检查非常规 layout
- **WHEN** 浏览器在声明 viewport/mode 渲染 Board、主从或 overlay scene
- **THEN** evidence 证明指定 region 承担对应轴滚动、非 owner 不意外滚动、non-wrap/non-shrink 与 overlay scope 成立

#### Scenario: 检查已声明 shell chrome
- **WHEN** 浏览器在声明 viewport 渲染 included shell，且 profile 声明了 variant/slots/anchors
- **THEN** evidence 只证明这些已声明 record；未声明的 FAB、Board 或页面模式不得成为失败理由

### Requirement: Profile 变化恢复与反馈
Structural profile canonical semantics 的变化 SHALL 使受影响 Phase 2/4/8 产物和证据过期，并从最早受影响 phase 恢复。若 current build 无法满足可复用 profile record，Apply SHALL 产出引用 record/rule/current-build evidence 的 feedback；仅属目标技术栈的问题 SHALL 留在消费项目。

#### Scenario: 仅 state record 变化
- **WHEN** contextual state presentation 发生语义变化而 layout records 未变
- **THEN** Apply 至少重开 Phase 4 与 Phase 8，并保留仍有效的 Phase 2 artifact

#### Scenario: Layout record 变化
- **WHEN** scroll owner、region relation、responsive mode 或已声明的 shell chrome composition（variant、槽位顺序、锚点）变化
- **THEN** Apply 从 Phase 2 重开，并使依赖的 component 和 browser evidence 过期

#### Scenario: 不同技术栈实现相同 contract
- **WHEN** 两个目标项目使用不同框架或组件库但通过相同 structural scenario IDs
- **THEN** Apply 接受两者，不要求源码目录、组件名、CSS class 或 DOM 同构

### Requirement: 拒绝退役模板
`ui-template-apply` SHALL 在 Intake 对**项目库** INDEX 运行 `manage_template_index.py require-published`。若项目缺少该行但 Author catalog 有 published 同名模板，SHALL 先按播种规则写入项目库再检查。若目标模板在项目库状态为 `retired`，或项目与 catalog 都没有可播种的 published 行，SHALL 以非 0 停止且不得进入 Phase 1。

#### Scenario: 消费 retired 模板
- **WHEN** 用户要求用项目 INDEX 中 status=retired 的模板实现页面
- **THEN** Apply 拒绝开始并提示先由 Authoring 恢复 published 或另选模板；不得用 catalog 覆盖用户 retired 行

#### Scenario: 空项目没有 INDEX
- **WHEN** 消费项目没有 `templates/INDEX.md`，但已安装 Author catalog 含 published `workbench-shell`
- **THEN** Apply 播种后 `require-published` 成功，不得因缺项目 INDEX 直接失败

### Requirement: 安装后可消费官方 catalog
`ui-template-apply` SHALL 在消费项目缺少目标 published 模板时，解析已安装 `ui-template-author` 的只读 catalog。若 catalog 有该名称且状态为 published，SHALL 先播种到项目 `templates/`（不覆盖已有同名行/目录），再执行 `require-published`。仅当项目库与 catalog 都没有该 published 模板时，SHALL 以“没有模板”停止并移交 Authoring。SHALL NOT 在空项目上把缺项目 `templates/` 当成最终失败。

#### Scenario: 空项目按官方模板实现
- **WHEN** 用户在只安装了双公开 skill 的空项目要求用 `workbench-shell` 做页面
- **THEN** Apply 能读到 catalog 中的 published 模板（播种后走项目库），并进入 Phase 0，不得停成“没有模板”

#### Scenario: catalog 与项目都没有目标模板
- **WHEN** 用户点名的模板在项目 INDEX 与 Author catalog 都不存在或都不是 published
- **THEN** Apply 停止并移交 Authoring，不得猜测视觉规则

#### Scenario: 项目已有同名模板
- **WHEN** 项目 `templates/<name>/` 或 INDEX 已有该名称
- **THEN** Apply 只消费项目库该条目，不覆盖为 catalog 副本

### Requirement: 干净实现与保真对照分离
Apply 默认只消费模板与用户需求，SHALL NOT 读取原版 checkout、`meta.sources[]` 路径或工作区已有生成物。当用户明确要求对齐原版时，Apply SHALL 把可部署原版仅当作视觉 oracle，将差异分类为 spec / apply / prompt-or-accept，并写入 `.ui-template-apply/source-compare.yaml`。对照失败 SHALL NOT 通过修改生成物闭合；SHALL 回写对应 skill 或模板后丢弃生成物并至少重生一次。

#### Scenario: 干净实现
- **WHEN** 用户用 published 模板实现 prompts 中的页面且未要求对齐原版
- **THEN** Apply 只读模板与 prompts，完成 Phase 0–9，不打开原版源码

#### Scenario: 对照差异出现在壳几何
- **WHEN** 模式 B 发现 inset/槽位与可部署原版不一致
- **THEN** 记录 spec 分类，不得改生成 CSS/组件来消除差异

#### Scenario: 参考已有生成物
- **WHEN** 工作区存在历史输出目录或未跟踪 WIP
- **THEN** Apply 仍不得把它们当作实现或对照参考
