## MODIFIED Requirements

### Requirement: Placement authorization closure
A placement-sensitive semantic role SHALL be authorized by one of two channels: (a) a closure of Page Type, Pattern, Primitive, and resolvable evidence in the Active Instance, or (b) an explicitly declared derived-route decision that records a resolvable `derivation_basis` (template rule, token, or primitive stable IDs, or session-scoped LOCAL rule IDs) and the design-language reasoning. Presence of a globally declared Primitive SHALL NOT authorize its use in an undeclared placement role without one of these channels. Local project placement decisions MAY add session-scoped constraints but SHALL NOT replace a missing reusable authorization without recording the derived basis. 模板对某布局语义沉默时，Apply SHALL 通过 derived route 通道显式记录派生依据后继续实现，SHALL NOT 静默实现；仅当该决策与模板显式声明（negative facts、placement topology、Page Type 的 Pattern closure）冲突时 SHALL 停止等待用户裁决。当 binding 声明的 component system 在已加载 vendor 参考中提供壳层原语（如 inset 内容容器）时，壳层实现 SHALL 从该原语起步，偏离必须记录理由与确认。

#### Scenario: Unrelated control reuse
- **WHEN** an implementation uses a declared control in a semantic placement role for which no applicable Pattern or topology binding exists and no derived-route derivation basis is recorded
- **THEN** placement validation fails and requires a package update, an explicit session-scoped decision, or a derived-route record before the route can complete

#### Scenario: Reusable placement is absent
- **WHEN** a route requires a reusable arrangement that is absent from the template
- **THEN** Apply MAY proceed via a derived route that records `derivation_basis` referencing resolvable template rule/token/primitive IDs or LOCAL rules, and SHOULD emit package feedback with stable semantic identity and evidence references instead of silently choosing another control

#### Scenario: 模板沉默时发明布局
- **WHEN** 模板未声明内容区是否为悬浮卡片，Apply 计划以卡片形态实现
- **THEN** 该决策必须落在 derived route 通道并在 `derivation_basis` 中记录引用的 rule/token stable ID 与 LOCAL rule；已记录且引用可解析时 Phase 2 gate 接受并保持显式可审计，未记录依据或引用悬空时 gate 失败

#### Scenario: 派生与显式声明冲突
- **WHEN** derived route 的布局决策与模板对该 route 已引用场景声明的 negative fact 或 placement topology 矛盾
- **THEN** Phase 2 gate 判为 unresolved 并停止，向用户呈现冲突的模板声明

#### Scenario: vendor 壳层原语偏离
- **WHEN** binding 声明 shadcn 组件体系且 vendor 参考含 inset 内容容器原语，而实现手写等价壳层
- **THEN** Phase 2/4 gate 要求记录偏离理由与用户确认，未记录不得进入实现

#### Scenario: 布局决策可追溯
- **WHEN** Apply 的 placement_plan 声明 full-bleed 或通栏形态
- **THEN** 该条目引用模板 placement geometry 或 rule 的稳定 ID，或该 route 为记录了可解析 derivation_basis 的 derived route；引用缺失且非 derived route 即 gate 失败

### Requirement: Route placement binding
An included route SHALL declare `design_source: template | derived`（缺省为 `template`）。A `template` route SHALL bind to a declared layout scene, declared Page Type, and the applicable Pattern closure used by that route, and its placement plan SHALL trace to template stable IDs. A `derived` route SHALL record a non-empty `derivation_basis` whose members resolve in the Active Instance stable-ID closure or the session LOCAL rule ID closure, and MAY omit page-type, pattern, layout, and placement template-ref bindings. Every stable reference that IS declared SHALL resolve in the Active Instance, and a Pattern reference on a `template` route SHALL belong to the bound Page Type or an explicitly declared compatible composition. An unknown `design_source` value SHALL fail closed.

#### Scenario: Complete route closure
- **WHEN** Apply plans a template route with a declared layout scene, Page Type, patterns, primitives, and placement plan
- **THEN** all references resolve and the route may proceed to implementation

#### Scenario: Derived route with resolvable basis
- **WHEN** a route declares `design_source: derived` with `derivation_basis` referencing declared rule/token/primitive stable IDs or LOCAL rules
- **THEN** the route passes Phase 2 binding checks without template page-type/layout closure and proceeds to implementation with its local design rules

#### Scenario: Derived route with dangling basis
- **WHEN** a derived route's `derivation_basis` is empty, missing, or contains an unresolvable template stable ID
- **THEN** the route fails with `DERIVATION_BASIS_MISSING` or `DERIVATION_BASIS_DANGLING` before implementation

#### Scenario: Invalid design source
- **WHEN** a route declares an unknown `design_source` value
- **THEN** the route fails with `ROUTE_DESIGN_SOURCE_INVALID`

#### Scenario: Template route default behavior preserved
- **WHEN** a route omits `design_source`
- **THEN** the route is validated as a template route and missing layout, Page Type, pattern closure, or placement template traces fail as before

#### Scenario: Missing placement binding
- **WHEN** a template route lacks a layout binding, uses an unknown stable ID, or uses a Pattern outside its Page Type closure
- **THEN** the route fails before implementation and recovery reopens the earliest affected phase
