## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 完整实施 playbook
**Reason**: 原 requirement 将 `implementation/`、工程结构和模板设计规则混合，已被技术栈无关的 `apply/` 指南与通用 Apply 0–9 阶段取代。

**Migration**: 将设计行为保留在 `spec.md` 及拆分文档，将顺序和取证迁移到 `apply/`，将消费项目工程决定迁移到 `.ui-template-apply/`。

### Requirement: 默认技术栈 adapter
**Reason**: 默认 React + Vite + Tailwind + shadcn adapter 会把易过期的工程选择写入共享模板，违反模板/消费项目解耦边界。

**Migration**: 在每个消费项目的 Implementation Brief 或 `.ui-template-apply/` 中记录检测到的 stack、版本、来源、状态和模板规则映射；模板不提供默认 adapter。

### Requirement: 代码目录契约
**Reason**: 代码目录、状态管理、API/mock 与测试组织是消费项目现场决定，不是 workbench-shell 设计能力。

**Migration**: Apply Phase 3 在目标项目生成目录与工程边界产物；workbench-shell 只保留 layout region、组件语义和页面模式等设计层规则。
