## ADDED Requirements

### Requirement: Capture mandatory question matrix
repo structural capture 的 literal graph SHALL 满足机器强制的必答事实矩阵，闭合范围不得只由作者起草的 scope 决定。当 shell scene 声明 `shell_variant: inset` 时，该 scene SHALL 同时携带内容承载面（page-canvas 槽位）的 inset/gap、radius、border、shadow、background 五项事实，每项以 token-ref、闭集语义或显式 negative 表达；缺任一项 SHALL 以 chrome composition 不完整的同级错误 fail closed。每个声明的 page_mode SHALL 回答其必答问题：多分区页（含设置类）必须声明 section navigation 的放置事实（内容区内部左列、顶部或无）；detail 页必须声明 master/detail 分侧与上下文面板位置。来源无法作答的项 SHALL 以带理由的显式 exclusions 呈现；沉默 SHALL 等价于闭合失败。骨架初始化输出 SHALL 附带按本矩阵生成的必答清单。

#### Scenario: inset 壳缺内容卡片几何
- **WHEN** capture graph 声明 `shell_variant: inset` 但 page-canvas 槽位缺少 radius 或 shadow 等必答事实且无对应 exclusions
- **THEN** capture 以闭合不完整失败，不得产出 `captured` receipt，模板不得进入 Generate

#### Scenario: 多分区页未声明二级导航
- **WHEN** included page_mode 为多分区页而 graph 未声明 section navigation 放置事实，也没有带理由的 exclusions
- **THEN** capture 失败并指出缺失的必答项，不得以「scope 未包含」为由放行

#### Scenario: 显式不知道
- **WHEN** 来源确实无法唯一裁决某必答项
- **THEN** graph 以带理由的 exclusions 记录该项，capture 可继续，fidelity 将该项呈现为非 observed 而非省略

#### Scenario: 骨架生成必答清单
- **WHEN** 作者以骨架初始化起草 capture graph
- **THEN** 骨架输出包含按矩阵推导的必答清单注释，作者逐项作答或显式排除

### Requirement: Fidelity projection completeness
fidelity profile SHALL 是 capture facts 的确定性投影，且 SHALL 暴露必答矩阵的应答状态：每项必答事实在 profile 中要么有对应记录，要么有显式 unresolved/exclusion 条目。profile SHALL NOT 把未作答的必答项呈现为已观察结构事实，也不得在投影时静默丢弃。

#### Scenario: 投影保留应答状态
- **WHEN** capture facts 包含内容卡片五项几何
- **THEN** fidelity 的 component geometry 记录逐项携带对应 token-ref，placement 引用可解析

#### Scenario: 投影不得吞噬 exclusions
- **WHEN** capture graph 对某必答项声明了 exclusions
- **THEN** fidelity 保留该 exclusion 的可见痕迹，validator 与下游 Apply 可区分「已观察为无」与「未作答」
