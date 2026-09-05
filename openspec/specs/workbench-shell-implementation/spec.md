## Purpose

为 `workbench-shell` 模板定义完整分阶段落地契约，确保消费者不仅复刻视觉，还能按 App Shell、页面模式、组件、代码结构、URL 状态、响应式和可访问性要求交付完整工作台应用。

## Requirements

### Requirement: 分阶段实现顺序
workbench-shell 的 `apply/` 指南 SHALL 将模板专属步骤映射到通用 Apply Phase 0–9，并 SHALL 要求按范围确认、token freeze、IA/route、项目现场代码结构、App Shell、组件、代表切片、included 页面模式、全局系统、浏览器验证和 review 顺序推进。模板指南 SHALL 只引用设计规则与取证方式，不定义消费项目工程结构。

#### Scenario: 先写页面再写 Shell
- **WHEN** consumer 在 App Shell 与页面 chrome 未通过代表切片 gate 前批量实现完整页面
- **THEN** `apply/` 指南判定阶段顺序不通过，并要求回到对应通用 phase

#### Scenario: 先完成代表性切片
- **WHEN** consumer 完成基础组件和 shell
- **THEN** 指南要求先实现一个端到端代表页面并保留浏览器证据，再扩展其余 included 模式

#### Scenario: 恢复时阶段编号不一致
- **WHEN** 模板步骤与通用 Phase 0–9 使用不同名称
- **THEN** checkpoint 以通用 phase ID 为唯一状态，模板步骤只作为映射标签

### Requirement: 技术栈无关 apply 指南
workbench-shell SHALL 提供 optional `apply/` 指南，用于映射通用 Apply 阶段、引用模板规则 ID 和规定取证方式。该指南 SHALL 不包含默认框架、依赖、代码目录、状态库、API/mock 分层或可运行 starter。

#### Scenario: 消费者选择任意技术栈
- **WHEN** consumer 使用 React、Vue、原生平台或其他技术栈
- **THEN** 读取相同的 workbench-shell 设计规则与 `apply/` gate，并在消费项目中自行记录 stack adapter

#### Scenario: apply 指南与 spec 冲突
- **WHEN** `apply/` 的顺序或验收说明暗含与 `spec.md` 不同的设计结果
- **THEN** consumer 以 `spec.md` 为准，使冲突 gate 失败并产出反馈

#### Scenario: apply 指南复制精确值
- **WHEN** `apply/` 重复维护颜色、字号、间距、断点或组件几何值
- **THEN** 模板验证失败，并要求改为引用 token 或规则 ID

### Requirement: App Shell 完整实现
workbench-shell 设计规则 SHALL 定义 Web 与 Desktop 的 shell 表面、侧栏、画布、页头、覆盖导航、滚动归属和可访问性行为。Web 在不小于 1280px 时使用展开侧栏，1024–1279px 使用折叠侧栏，小于 1024px 使用带可访问触发器的 288px 覆盖 Sheet；根容器保持 100svh 且不滚动。

#### Scenario: 展开桌面宽度渲染
- **WHEN** Web viewport 不小于 1280px
- **THEN** App Shell 显示展开浮岛侧栏、画布卡片和模板定义的外层呼吸边

#### Scenario: 桌面宽度渲染
- **WHEN** Web viewport 不小于 1024px
- **THEN** App Shell 按 1024–1279px 折叠侧栏或不小于 1280px 展开侧栏的矩阵渲染，并保持画布与根滚动规则

#### Scenario: compact 宽度渲染
- **WHEN** Web viewport 为 1024–1279px
- **THEN** 侧栏以模板定义的折叠形态常驻，核心导航仍可达且画布不产生意外根滚动

#### Scenario: 窄屏打开导航
- **WHEN** Web viewport 小于 1024px 且用户激活页头导航触发器
- **THEN** Shell 显示可关闭的 288px 覆盖 Sheet，触发器有 accessible name

#### Scenario: 抽屉内选择路由
- **WHEN** 用户在覆盖 Sheet 中选择真实路由
- **THEN** URL 更新、当前项语义正确、目标页面渲染，Sheet 关闭并按约定恢复焦点

### Requirement: 五种页面模式全覆盖
workbench-shell SHALL 以技术栈无关的 A–E 模式定义 included route 的结构与验收：A 常驻集合、B 主从、C 设置页签、D 聊天/时间线、E 聚合网格。每种模式 SHALL 定义滚动归属、状态表达、响应式降级、空/加载/错误状态和可访问性；未纳入范围的模式 SHALL 在 Intake 显式 excluded。

#### Scenario: A 常驻集合模式
- **WHEN** consumer 实现列表、表格、卡片集合、看板或泳道
- **THEN** 页面使用稳定 PageHeader/Toolbar、内部滚动、筛选排序、状态和 URL 恢复规则

#### Scenario: B 主从模式
- **WHEN** viewport 降到模板 compact 或 mobile 路径
- **THEN** 主从布局按规则降级为单列，选中项保留在 URL，返回后可恢复

#### Scenario: C 设置页签模式
- **WHEN** viewport 在宽屏与窄屏之间切换
- **THEN** 设置页签在纵向列与横向条之间切换，当前页签可由 URL 恢复

#### Scenario: D 聊天或时间线模式
- **WHEN** consumer 实现会话、活动流或时间线页面
- **THEN** 会话列表、内部滚动时间线和底部 composer 的滚动与固定边界均可独立验收

#### Scenario: E 聚合网格模式
- **WHEN** consumer 实现指标或卡片聚合页
- **THEN** 网格随容器宽度变化，并覆盖层级、hover、空态和创建入口

#### Scenario: 列表模式
- **WHEN** consumer 实现列表、表格、看板或其他集合页
- **THEN** 该页面映射到 A 常驻集合模式，并按 A 模式完成结构、状态、滚动和 URL 验收

#### Scenario: 主从双栏模式
- **WHEN** consumer 实现列表与详情并列的页面
- **THEN** 该页面映射到 B 主从模式，并在 compact/mobile 下验证单列降级与 URL 恢复

#### Scenario: 文档详情模式
- **WHEN** legacy route inventory 将文档详情列为独立模式
- **THEN** Intake 将其映射到 B 主从模式的详情槽位或显式 excluded，不再把它计为 A–E 之外的第六种必需模式

#### Scenario: 设置页模式
- **WHEN** consumer 实现设置页
- **THEN** 该页面映射到 C 设置页签模式，并验证宽窄屏页签与 URL 状态

#### Scenario: 聚合网格模式
- **WHEN** consumer 实现卡片或指标集合
- **THEN** 该页面映射到 E 聚合网格模式，并验证容器响应、层级和状态

#### Scenario: 模式未纳入范围
- **WHEN** 本次实现不需要 A–E 中某个模式
- **THEN** Intake 将其标记为 excluded 并说明理由，不得伪造覆盖证据

### Requirement: 页面 chrome 与导航语义
playbook SHALL 规定集合页头、面包屑页头和简单页头的实现方式，保持 48px 高度、16px 页左距、标题截断、计数和动作区一致。面包屑祖先 SHALL 是真实可导航 link，叶子 SHALL 不渲染为交互控件，面包屑页 SHALL 保留明确的页面标题语义。

#### Scenario: 切换页面
- **WHEN** 用户在不同页面模式间切换
- **THEN** 页头高度、左距、分割线和动作区几何保持稳定

#### Scenario: 点击面包屑祖先
- **WHEN** 用户点击详情页中的祖先 crumb
- **THEN** 浏览器导航到对应容器页，且该 crumb 在可访问性树中是 link

### Requirement: 核心组件 inventory
playbook SHALL 提供覆盖以下能力的组件 inventory：侧栏导航、工作区切换、全局搜索、创建入口、按钮、输入、文本域、选择器、复选框、开关、徽章、页签、表格、分页、看板列与卡片、服务卡片、日历卡、统计卡、趋势图例、头像、空态、骨架、Toast、确认框、对话框、菜单、提示和图标按钮。每个条目 SHALL 定义语义元素、variants、尺寸、状态和可访问性要求。

#### Scenario: 实现基础组件
- **WHEN** consumer 开始实现工作台基础组件
- **THEN** 能从 inventory 找到组件用途、semantic element、variants、hover/focus/disabled/loading 状态和 a11y 要求

#### Scenario: 实现状态徽章
- **WHEN** 状态使用颜色区分
- **THEN** 界面同时提供状态文字或其他非颜色信号

#### Scenario: 实现看板卡片
- **WHEN** 卡片支持拖拽
- **THEN** inventory 提供非拖拽的替代操作或键盘可达方案，并定义拖拽中的视觉反馈

### Requirement: URL 状态与深链
playbook SHALL 为页面选中项、设置页签、视图切换、筛选、分页和其他可恢复状态定义 query 参数约定。实现 SHALL 支持刷新恢复、浏览器前进后退、无效参数降级和选中项可见反馈。

#### Scenario: 刷新恢复设置页签
- **WHEN** 用户在设置页选择非默认页签后刷新
- **THEN** 页面恢复到 URL 中的页签

#### Scenario: 打开无效选中项
- **WHEN** URL 中的 `id` 不存在或已删除
- **THEN** 页面进入明确的未找到或空态，而不是静默显示无选中状态

#### Scenario: 浏览器返回
- **WHEN** 用户从详情或选中态返回上一历史记录
- **THEN** 页面恢复上一 URL 状态，导航高亮与内容保持一致

### Requirement: 响应式与平台路径
workbench-shell SHALL 以可直接验收的行为矩阵区分 Web expanded、Web compact、Web overlay、Mobile 平台 shell 和 Desktop 平台 chrome。断点、触发器、页头动作、页面模式与安全区 SHALL 引用 `spec.md`、tokens 和平台文档的唯一规则。

#### Scenario: Web compact 宽度
- **WHEN** Web viewport 为 1024–1279px
- **THEN** 使用折叠侧栏和 compact 页面降级，行为与平台矩阵一致

#### Scenario: Web overlay 宽度
- **WHEN** Web viewport 小于 1024px
- **THEN** 常驻侧栏退出布局，页头提供覆盖导航入口，且所有 included 页面保持一致

#### Scenario: web compact 宽度
- **WHEN** Web viewport 为 768–1023px
- **THEN** 使用小于 1024px 的 overlay 路径，页头提供导航入口，页面内容按 compact 规则降级

#### Scenario: web mobile 宽度
- **WHEN** Web viewport 小于 768px
- **THEN** 继续使用一致的覆盖导航，并按 mobile 宽度收缩动作、内容和页面模式，不与原生 Mobile 平台路径混淆

#### Scenario: 页头动作降级
- **WHEN** 可用宽度不足以显示完整动作标签
- **THEN** 动作按模板规则收缩，所有 icon-only 控件保留非空 accessible name

#### Scenario: 平台路径切换
- **WHEN** consumer 选择 Mobile 或 Desktop 平台而非 Web 响应式路径
- **THEN** 使用对应平台文档定义的 shell 与安全区，不把 Web 断点行为误当原生平台规则

### Requirement: 可访问性契约
playbook SHALL 要求所有可点击操作键盘可达，图标控件有 accessible name，表单控件有关联 label，弹层管理焦点并支持关闭后返回，禁止交互控件嵌套，焦点指示可见，状态不得只依赖颜色。

#### Scenario: 键盘遍历列表
- **WHEN** 用户用键盘遍历列表、筛选器、批量操作和分页
- **THEN** 每个操作控件可聚焦、可触发且有可见焦点

#### Scenario: 打开对话框
- **WHEN** 用户打开搜索、创建、确认或帮助对话框
- **THEN** 焦点进入弹层，Esc 或取消可关闭，焦点返回触发控件

#### Scenario: 嵌套交互控件
- **WHEN** 列表行需要行选择和行打开
- **THEN** playbook 要求拆分选择控件与打开目标，禁止把复选框嵌在整行按钮内

### Requirement: 浏览器与工程验收
workbench-shell 的 `apply/quality.md` SHALL 只定义模板专属的规则 ID、检查对象、取证方式和通过条件，并 SHALL 复用通用 Apply 的工程与浏览器证据格式。取证 SHALL 使用模板当前声明的 token 阶梯、页面模式和断点，不复制易漂移的数量或精确值清单。

#### Scenario: 交付前检查
- **WHEN** consumer 宣称 workbench 应用完成
- **THEN** included 范围的工程检查、模板规则、浏览器证据和 review 均通过或有明确用户接受记录

#### Scenario: 检查字号 token
- **WHEN** reviewer 读取导航、页头、正文、指标和对话框 computed style
- **THEN** 实际字号与行高匹配 `tokens.yaml` 当前声明的完整阶梯，不依赖文档中的固定“九档/十档”文字

#### Scenario: 检查亮暗主题
- **WHEN** 消费项目声明支持双主题
- **THEN** 两套主题下角色键一致，实际表面与文字对比度均有可关联当前构建的证据

#### Scenario: 模板步骤与通用证据重复
- **WHEN** 通用 Apply 已生成满足同一规则 ID 的有效证据
- **THEN** 模板 quality matrix 引用该证据，不要求维护第二份互相漂移的报告

### Requirement: workbench 模板反馈
workbench-shell 的可复用设计规则反馈 SHALL 指向 `spec.md`、`platforms/*.md`、`routes-and-layouts.md`、`components.md` 或 `apply/`；技术栈、代码目录、API/mock 和消费项目业务问题 SHALL 指向通用 toolchain 或消费项目产物，不得进入模板。

#### Scenario: 发现通用布局缺口
- **WHEN** 实现发现多个消费者都会遇到的页面模式、布局或安全区规则缺口
- **THEN** feedback 记录引用对应设计文档和规则 ID，交由 Authoring 处置

#### Scenario: 发现模板验收缺口
- **WHEN** 问题属于 workbench-shell 的实施顺序或取证方式
- **THEN** feedback 目标为 `apply/`，且不复制新的设计数值

#### Scenario: 发现技术栈专属问题
- **WHEN** 问题只出现在 React、Tailwind、shadcn、构建链路或项目目录
- **THEN** feedback 留在通用 toolchain 或消费项目，不修改 workbench-shell 模板

#### Scenario: 发现 React/Tailwind 专属问题
- **WHEN** 问题只出现在样式合并、shadcn 组件或 React/Tailwind 构建链路
- **THEN** 将决定写入通用 toolchain 或消费项目 stack adapter，不修改技术栈无关模板

### Requirement: Workbench 已发布模板保持可消费且不索取上游路径
`templates/workbench-shell/` SHALL 继续作为合法 schema v2 模板被 portable 校验与 Apply baseline 消费。`meta.sources[]` SHALL 只作为并列出处身份（固定 repo revision 与已泛化 doc revision）。无本会话 session source 时，模板 SHALL 保持无 `fidelity.yaml` 的 `legacy-baseline`；Authoring/治理 SHALL NOT 向用户索要这两个来源的本地绝对路径，SHALL NOT 扫描 sibling checkout、`/tmp` 或 `example/**`，SHALL NOT 按 provenance ref clone，也 SHALL NOT 用旧模板 snapshot locator 冒充 source-direct observed records。

#### Scenario: 无 session source 时校验 workbench
- **WHEN** maintainer 在未提供上游 checkout 的情况下验证 workbench-shell
- **THEN** portable core v2 与 INDEX 一致性通过；replay 为 not-run 或不适用；不得把缺本地 source root 报告为 blocker

#### Scenario: 禁止把 provenance 当路径请求
- **WHEN** Agent 读取 workbench `meta.yaml` 中的 source-001/source-002
- **THEN** 它不得请求用户提供对应本地绝对路径，也不得将任务 6.1 解释为「没有 checkout 就停下来问路径」

#### Scenario: Example 实现存在差异
- **WHEN**`example/workbench-shell/**` 的生成代码、样式、测试或文档发生变化
- **THEN**workbench 校验与任何后续 profile 生成不读取、不修改也不使用该变化作为来源证据

### Requirement: Workbench layout 置信度诚实降级
在 `templates/workbench-shell/` 无 chrome-complete `fidelity.yaml` 期间，`meta.confidence.layout` SHALL 不高于 `medium`。Authoring/治理 SHALL NOT 为满足 high 而伪造 source-direct sidecar，SHALL NOT 向用户索要 source-001/source-002 的本地绝对路径。该降级是 portable 契约，不改变 core v2 可消费性。

#### Scenario: 无 sidecar 时 layout 不得为 high
- **WHEN** maintainer 校验当前无 sidecar 的 workbench-shell
- **THEN** `confidence.layout` 为 medium 或更低，portable validator 不因 layout-high-without-chrome 失败

#### Scenario: 不得靠编造 sidecar 恢复 high
- **WHEN** 本会话没有与声明 revision 一致的 session source
- **THEN** 不得写入声称 observed 的 chrome records 或把 locator 指回模板自身以恢复 `layout: high`

### Requirement: A–E 是映射不是壳配方
workbench-shell 的 `routes-and-layouts.md` 与 `apply/playbook.md` SHALL 把 A–E 标明为 Apply 验收映射。壳层级说明 SHALL 区分「来源 chrome 槽位（若有 profile）」与「页面模式验收」。无 sidecar 时 prose SHALL NOT 暗示 A–E 等于上游 App Shell 视觉配方，也 SHALL NOT 把 Web 路径写成与来源 inset 冲突的唯一合法形态，除非同时声明 structural chrome unavailable。

#### Scenario: 阅读 routes-and-layouts
- **WHEN** consumer 打开 `routes-and-layouts.md`
- **THEN** 能区分 A–E 验收模式与壳 chrome；不会把五种页面模式误认为侧栏槽位顺序

#### Scenario: Web 平台文档
- **WHEN** consumer 阅读 `platforms/web.md` 且模板仍无 chrome sidecar
- **THEN** 文档不把 flush 硬切标为已验证的来源壳变体；inset 仅在后续 source-direct records 存在时成为 profile 约束

### Requirement: Structural 正向实例由 fixtures 承担
Board non-wrap/non-shrink、主从独立滚动、overlay scope、Dialog 四向 padding、四类 link context，以及 **shell chrome composition**（inset vs flush、有序槽位、header-trigger 与 chat-fab 锚点）的 source-direct structural 机器证据 SHALL 由非 example 固定 revision fixtures 提供，而不是把已发布 workbench 模板重新绑定到外部 checkout。仅当用户后续会话明确提供与 meta 声明 revision 一致的 session source 时，才允许对 workbench 做 Generate-from-source 并写入含 chrome records 的 `fidelity.yaml`。

#### Scenario: Fixture 覆盖非常规 layout
- **WHEN** contract eval 运行 repo-capture fixture
- **THEN** Board 横向 non-wrap、主从独立 scroll owner、overlay scope 与 inset chrome 槽位图作为 fixture records 可重复，而不要求本机存在上游 checkout

#### Scenario: 后续会话才允许 source-direct sidecar
- **WHEN** 用户为本会话提供与声明 revision 一致的可读 session source
- **THEN** Authoring 可按 Generate-from-source 为 workbench 补含 chrome composition 的 structural sidecar；该路径不是无 source 时的完成条件

#### Scenario: Chrome mutation 不依赖 workbench checkout
- **WHEN** fixture 将 header-trigger 改锚到 page-canvas 或将 variant 改为 flush
- **THEN** eval/validator 失败且不读取 `templates/workbench-shell/` 或 `example/**` 作为修复依据

### Requirement: Workbench profile 质量矩阵在有 sidecar 之前保持 baseline
在 workbench 仍无 `fidelity.yaml` 期间，`apply/quality.md` SHALL 继续按 core v2 rule IDs 工作，SHALL NOT 因为缺 profile record IDs 而要求补上游路径。若未来 sidecar 存在，quality matrix 只引用 record IDs，不复制 token 值或第二套 profile。

#### Scenario: Baseline quality 仍可消费
- **WHEN** consumer 读取当前无 sidecar 的 workbench
- **THEN** Apply 按 legacy-baseline 使用 playbook/quality，并明确 structural profile unavailable

#### Scenario: 只提供整页截图
- **WHEN** consumer 用截图声称结构细节通过但没有 computed/geometry/scroll evidence
- **THEN** 若当时没有 structural records，不得把截图升级为 profile-verified；有 records 时相关 gate 保持 failed，直到提供绑定 current build 的 expected/actual

### Requirement: 实例附录边界
本规格 SHALL 只作为 `workbench-shell` 的实例附录。通用 skill 与其他模板 SHALL 不把它当作产品级必选契约。对该模板的保真修复 SHALL 走 Authoring/Apply/模板回写与重生，SHALL NOT 特例化修改生成 web。无 sidecar 时 `confidence.components` SHALL 不高于与 defaulted 覆盖诚实匹配的取值。

#### Scenario: 生成页面与原版不一致
- **WHEN** 对照可部署原版发现壳或组件差异
- **THEN** 更新 workbench-shell 模板或对应 skill，并用干净 Apply 重生验证，不得直接改 example web
