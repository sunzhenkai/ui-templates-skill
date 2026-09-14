## ADDED Requirements

### Requirement: Primitive variant styling contracts
primitives 层的交互控件 SHALL 携带逐变体样式契约：每个声明 variant SHALL 表达呈现类别（filled、outline、ghost 等闭集）、radius token、控件高度 token、hover/active 语义 token 引用与 focus 处理引用（指向状态呈现事实或等价 rule）；变体不得只以名字存在。携带可标识条目内容的 primitives（如导航条目）SHALL 声明解剖槽（icon、label）及其次序；同一 primitive 在不同表面上下文（sidebar 与 page-surface）状态绑定不同时 SHALL 按上下文分别声明 token 引用。Apply SHALL NOT 在契约之外发明变体样式、控件圆角/高度或解剖结构；契约沉默项按 Apply 侧「沉默即停止」处理，不得回退组件库默认值。

#### Scenario: 按钮变体契约完整
- **WHEN** 模板声明 button 的 default/outline/brand 变体
- **THEN** 每个变体携带呈现类别、radius token、高度 token 与 focus 引用；validator 对缺项报错

#### Scenario: 契约外发明样式
- **WHEN** Apply 以组件库默认圆角或自造 hover 实现某变体而契约已声明对应 token
- **THEN** Phase 4/8 校验失败并指向被偏离的契约字段

#### Scenario: 导航条目上下文区分
- **WHEN** nav-item 同时用于 sidebar 与页面卡内左列
- **THEN** 两类上下文的 selected/hover token 引用分别声明；sidebar token 出现在页面上下文实现中被判偏离

#### Scenario: 解剖槽声明
- **WHEN** 导航条目契约声明 icon+label 槽
- **WHEN** 实现渲染纯文字条目
- **THEN** Phase 8 存在性场景失败，证据指向缺失的 icon 槽
