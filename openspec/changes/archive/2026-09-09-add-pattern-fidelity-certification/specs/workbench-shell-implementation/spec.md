## MODIFIED Requirements

### Requirement: 核心组件 inventory
playbook 与 portable core SHALL 共同覆盖以下 Component Family：侧栏导航、工作区切换、全局搜索、创建入口、按钮、输入、文本域、选择器、复选框、开关、徽章、页签、表格、分页、看板列与卡片、服务卡片、日历卡、统计卡、趋势图例、头像、空态、骨架、Toast、确认框、对话框、菜单、提示和图标按钮。每个成员 SHALL 使用 Stable Entity ID 登记：独立交互件为 Primitive，可复用组合或布局语义为 Pattern，页面骨架为 Page Type，并定义语义元素、variants、尺寸、状态、evidence 和可访问性要求；SHALL 不用 prose inventory 代替引用闭包。

#### Scenario: 实现基础组件
- **WHEN** consumer 开始实现工作台基础组件
- **THEN** 能从 Active Instance 的 Primitive/Pattern 契约找到用途、semantic element、variants、hover/focus/disabled/loading 状态和 a11y 要求

#### Scenario: 实现状态徽章
- **WHEN** 状态使用颜色区分
- **THEN** 对应 Primitive 或 Pattern 同时提供状态文字或其他非颜色信号的 tokenized 契约

#### Scenario: 实现看板卡片
- **WHEN** 卡片支持拖拽
- **THEN** 对应 Pattern 提供非拖拽替代操作、键盘可达方案和拖拽视觉反馈的稳定契约

#### Scenario: candidate family upgrade
- **WHEN** `workbench-shell` 生成升级 candidate
- **THEN** 上述成员被归入 Page Type → Pattern → Primitive 闭集，certification inventory 无缺口，且生产 catalog 不自动切换
