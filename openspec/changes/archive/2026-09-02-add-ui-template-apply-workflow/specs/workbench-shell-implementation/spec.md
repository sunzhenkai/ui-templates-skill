## Purpose

为 `workbench-shell` 模板定义完整分阶段落地契约，确保消费者不仅复刻视觉，还能按 App Shell、页面模式、组件、代码结构、URL 状态、响应式和可访问性要求交付完整工作台应用。

## ADDED Requirements

### Requirement: 完整实施 playbook
`workbench-shell` SHALL 提供 `implementation/` playbook，完整覆盖 App Shell、五种页面模式、页面 chrome、核心组件、全局浮层、状态反馈、响应式降级、代码目录结构、可访问性和浏览器验收。playbook SHALL 引用 `spec.md` 与 `platforms/*.md`，不重复定义相同规则。

#### Scenario: 检查页面模式覆盖
- **WHEN** reviewer 阅读 implementation playbook
- **THEN** 能找到列表/集合模式、主从双栏模式、文档详情模式、设置页模式和聚合网格模式的实现与验收路径

#### Scenario: 检查全局能力覆盖
- **WHEN** consumer 准备实现一个 workbench 应用
- **THEN** playbook 能指导实现全局搜索、创建入口、Toast、确认对话框、快捷键帮助、进度反馈和右下角 FAB

#### Scenario: playbook 与主 spec 冲突
- **WHEN** implementation playbook 中出现与 `spec.md` 不同的 chrome 高度、断点或颜色规则
- **THEN** consumer 以 `spec.md` 为准，并修复 implementation playbook

### Requirement: 分阶段实现顺序
workbench-shell playbook SHALL 要求按以下顺序推进：范围确认、设计 tokens、代码结构、App Shell、页面 chrome、基础组件、代表性页面切片、五种页面模式、全局浮层、响应式状态、浏览器验证和 design review。App Shell 与页面 chrome SHALL 先于完整页面模式实现。

#### Scenario: 先写页面再写 Shell
- **WHEN** consumer 在 App Shell 未完成前实现完整列表页
- **THEN** playbook 判定阶段顺序不通过，并要求先完成 Shell 与页面 chrome

#### Scenario: 先完成代表性切片
- **WHEN** consumer 完成基础组件
- **THEN** playbook 要求先实现一个端到端代表页面，再批量扩展其余页面模式

### Requirement: 默认技术栈 adapter
workbench-shell playbook SHALL 提供默认 React + Vite + Tailwind + shadcn 技术栈 adapter，说明该组合下的目录结构、组件来源、样式 token 和验收方式。模板主 spec SHALL 继续保持技术栈无关，stack adapter SHALL 只补充实现映射。

#### Scenario: 使用默认技术栈
- **WHEN** consumer 选择 React + Vite + Tailwind + shadcn
- **THEN** playbook 给出基础组件来源、样式组织、路由/状态建议和目录映射

#### Scenario: 使用其他技术栈
- **WHEN** consumer 使用 Vue、Svelte 或服务端渲染等非默认栈
- **THEN** playbook 要求继续遵守 `spec.md` 的布局、密度、状态和可访问性规则，并自行建立 stack adapter

### Requirement: 代码目录契约
playbook SHALL 定义 App Shell、route/page、layout region、business feature、基础 UI 组件、通用工具、状态管理、mock/API 边界和测试文件的存放约定。每个新增文件 SHALL 能根据用途找到唯一主目录。

#### Scenario: 新增业务组件
- **WHEN** consumer 新增只属于某个业务域的卡片或表单
- **THEN** 目录契约指定该文件归属该业务域，而不是通用基础组件目录

#### Scenario: 新增跨页面组件
- **WHEN** consumer 新增 Dialog、Toast、Table shell 或 PageHeader
- **THEN** 目录契约将其归入共享 layout 或基础组件目录

### Requirement: App Shell 完整实现
playbook SHALL 指导实现三种平台外壳的 web 路径默认行为，包括应用底色、浮岛侧栏、画布卡片、48px 页头、窄屏触发器、移动抽屉、100svh 不滚动和内容区滚动。路由型侧栏项 SHALL 使用真实 link，当前项 SHALL 使用当前页标记，抽屉内导航后 SHALL 自动关闭。

#### Scenario: 桌面宽度渲染
- **WHEN** viewport 不小于 1024px
- **THEN** App Shell 显示常驻浮岛侧栏、8px 呼吸边和圆角画布卡片，整页不出现滚动条

#### Scenario: 窄屏打开导航
- **WHEN** viewport 小于 1024px 且用户打开导航触发器
- **THEN** Shell 显示可关闭的覆盖式抽屉，触发器保持可访问

#### Scenario: 抽屉内选择路由
- **WHEN** 用户在抽屉中选择一个真实路由
- **THEN** URL 更新、目标页面渲染、当前导航标记正确，且抽屉自动关闭

### Requirement: 五种页面模式全覆盖
playbook SHALL 分别定义并验收五种页面模式：列表/集合模式、主从双栏模式、文档详情模式、设置页模式和聚合网格模式。每种模式 SHALL 包含结构、滚动归属、状态表达、响应式降级、空态/加载态/错误态和可访问性要求。

#### Scenario: 列表模式
- **WHEN** consumer 实现列表或集合页
- **THEN** playbook 覆盖 48px 集合页头、内部滚动列表、筛选排序、分页、行交互和 URL 恢复

#### Scenario: 主从双栏模式
- **WHEN** viewport 降到 compact 断点
- **THEN** 双栏切换为单栏，选中项保留在 URL，返回列表后原选中项仍可恢复

#### Scenario: 文档详情模式
- **WHEN** consumer 实现详情页
- **THEN** playbook 覆盖面包屑祖先链接、主列限宽、属性栏、移动端属性降级和 FAB 安全区

#### Scenario: 设置页模式
- **WHEN** viewport 在桌面与移动宽度之间切换
- **THEN** 设置页签从竖排分组切换为顶部横向条，当前页签写入 URL 且可刷新恢复

#### Scenario: 聚合网格模式
- **WHEN** consumer 实现卡片集合页
- **THEN** playbook 覆盖响应式网格、卡片信息层级、悬停态、空态和创建入口

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
playbook SHALL 消除断点与平台路径的歧义，明确 web 路径在 compact 和 mobile 宽度下的侧栏、页头触发器、页面模式和动作降级；同时单独说明 mobile 平台路径的覆盖抽屉和 desktop 平台路径的顶行 chrome。行为矩阵 SHALL 可直接验收。

#### Scenario: web compact 宽度
- **WHEN** web 应用 viewport 进入 768–1023px
- **THEN** 画布内容按 compact 规则降级，页头提供导航入口，且实施行为与矩阵一致

#### Scenario: web mobile 宽度
- **WHEN** web 应用 viewport 小于 768px
- **THEN** playbook 明确侧栏是覆盖抽屉还是折叠形态，并保持该行为在所有页面一致

#### Scenario: 页头动作降级
- **WHEN** viewport 小于 768px
- **THEN** 页头动作按模板规则收缩，且每个 icon-only 控件保留非空 accessible name

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
playbook SHALL 要求消费项目在交付前通过构建、静态检查、单元测试或等效工程检查，以及真实浏览器多视口验收。验收 SHALL 检查控制台、computed style、可访问性树、交互状态、加载/空/错误状态、URL 恢复和亮暗主题，并保留截图或可复查证据。

#### Scenario: 交付前检查
- **WHEN** consumer 宣称 workbench 应用完成
- **THEN** 构建、静态检查、已有测试和浏览器验收均通过

#### Scenario: 检查字号 token
- **WHEN** reviewer 对导航、页头、说明文字、指标数字和对话框读取 computed style
- **THEN** 实际字号与行高匹配模板九档 token，自定义类没有被样式合并工具移除

#### Scenario: 检查亮暗主题
- **WHEN** 消费项目声明支持双主题
- **THEN** 两套主题下背景、前景、边框、状态色和浮层均来自主题 token，且满足可读性要求

### Requirement: workbench 模板反馈
workbench-shell 的实现反馈 SHALL 回写到 `spec.md`、`platforms/*.md` 或 `implementation/` 中对应文件。playbook SHALL 说明哪类问题属于布局模板、哪类属于 stack adapter、哪类属于业务实现。

#### Scenario: 发现通用布局缺口
- **WHEN** 实现发现五种页面模式都缺少某类状态或安全区规则
- **THEN** 更新 `spec.md` 或对应平台文档

#### Scenario: 发现 React/Tailwind 专属问题
- **WHEN** 问题只出现在样式合并、shadcn 组件或前端构建链路
- **THEN** 更新默认 stack adapter 或 quality 文档，不修改技术栈无关主 spec
