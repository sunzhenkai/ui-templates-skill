## ADDED Requirements

### Requirement: Placement containment consumption

结构化 placement 可用时，Apply SHALL 按 placement regions 的 `parent` / `contains` 树实现嵌套（如 inset 壳里 `page-header`、`page-toolbar` 嵌套于 `page-canvas`）：header 属于哪张卡是采集事实，不是 Apply 的自由决定；regions 全部平级时才允许平级实现。给侧栏、分隔或 chrome 追加模板未声明的 border/ring 同样是布局形态决策：fidelity negative facts（如 `nav-group` border `none`）SHALL 按无装饰实现，组件库默认边框 SHALL NOT 覆盖；模板对该语义沉默时进入 unresolved 等待用户裁决。

#### Scenario: 卡内 header 按嵌套实现

- **WHEN** Active Instance layout placement 声明 `page-header` 的 parent 为 `page-canvas`
- **THEN** 实现中 page header 的 bounding box 位于内容卡内，Phase 8 containment scenario 通过

#### Scenario: 未声明的侧栏边框失败

- **WHEN** fidelity 记录 `nav-group` border `none` negative fact，而实现的侧栏出现边框
- **THEN** Phase 8 对应 negative scenario 记 failed

### Requirement: Trigger hit-area follows anatomy

选择类控件（select/combobox/dropdown）SHALL 按模板 component anatomy 事实实现触发器结构：`whole-trigger` 表示整行触发器是唯一命中控件、尾随 affordance 图标是其内部装饰（命中区必须覆盖图标位置）；`split-trigger` 表示 affordance 独立可点。模板未声明触发器解剖时 SHALL NOT 默认发明，进入 unresolved。Phase 8 交互验证 SHALL 覆盖 affordance 命中区：点击尾随图标中心必须激活触发器（或其独立控件），图标中心落在触发控件 bounding box 之外即 failed。

#### Scenario: 图标点击穿透失效

- **WHEN** 实现的下拉 chevron 图标中心位于触发控件 bounding box 之外且点击无效果
- **THEN** Phase 8 affordance 命中区记录 failed

### Requirement: Link baseline from default-state presentation

链接类 semantic element 的静息 text-decoration SHALL 消费模板对应 context 的 default 态 state presentation（含 `none` negative facts），SHALL NOT 以浏览器或组件库默认下划线状态实现。Phase 8 SHALL 对 default 态 computed `text-decoration-line` 与记录值逐 context 比对；静息下划线、hover 消失等与记录相反的模式即 failed。

#### Scenario: 静息下划线违背记录

- **WHEN** 模板记录 `navigation-link` default 态 `text_decoration: none`（negative），而实现中导航链接静息 computed `text-decoration-line: underline`
- **THEN** Phase 8 对应 state scenario 记 failed
