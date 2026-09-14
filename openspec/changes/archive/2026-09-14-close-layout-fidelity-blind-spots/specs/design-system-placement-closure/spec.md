## MODIFIED Requirements

### Requirement: Placement authorization closure
A placement-sensitive semantic role SHALL be authorized by a closure of Page Type, Pattern, Primitive, and resolvable evidence in the Active Instance. Presence of a globally declared Primitive SHALL NOT authorize its use in an undeclared placement role. Local project placement decisions MAY add session-scoped constraints but SHALL NOT replace a missing reusable authorization. Apply 的每条布局 placement 决策（含页面级 full-bleed、通栏、卡片化等形态选择）SHALL trace 到模板 placement geometry、rule 或 pattern 的稳定 ID；当模板对某布局语义沉默而 Apply 欲自行决定时，该决策 SHALL 进入 unresolved 并停止等待用户裁决，SHALL NOT 以 local rule 静默补位。当 binding 声明的 component system 在已加载 vendor 参考中提供壳层原语（如 inset 内容容器）时，壳层实现 SHALL 从该原语起步，偏离必须记录理由与确认。

#### Scenario: Unrelated control reuse
- **WHEN** an implementation uses a declared control in a semantic placement role for which no applicable Pattern or topology binding exists
- **THEN** placement validation fails and requires a package update or an explicit session-scoped decision before the route can complete

#### Scenario: Reusable placement is absent
- **WHEN** a route requires a reusable arrangement that is absent from the template
- **THEN** Apply blocks that reusable layer and emits package feedback with stable semantic identity and evidence references instead of silently choosing another control

#### Scenario: 模板沉默时发明布局
- **WHEN** 模板未声明内容区是否为悬浮卡片，Apply 计划以 local rule 自行决定该形态
- **THEN** Phase 2 gate 将该决策判为 unresolved 并停止，向用户呈现候选与缺失的模板授权，不得继续写应用源码

#### Scenario: vendor 壳层原语偏离
- **WHEN** binding 声明 shadcn 组件体系且 vendor 参考含 inset 内容容器原语，而实现手写等价壳层
- **THEN** Phase 2/4 gate 要求记录偏离理由与用户确认，未记录不得进入实现

#### Scenario: 布局决策可追溯
- **WHEN** Apply 的 placement_plan 声明 full-bleed 或通栏形态
- **THEN** 该条目引用模板 placement geometry 或 rule 的稳定 ID；引用缺失即 gate 失败
