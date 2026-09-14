## Purpose

Define the template-technology-independent contract that turns observed spatial arrangements into stable, reusable placement topology and authorizes every placement-sensitive implementation choice through that topology.

## Requirements

### Requirement: Generic placement topology
A reusable UI template SHALL represent placement as stable regions, slots, roles, containment or peer relations, sibling order, nesting, scroll ownership, and responsive modes. Roles SHALL describe semantic function rather than a product, route, business entity, framework element, or literal selector. Quantitative geometry SHALL remain referenced to token paths; prose alone SHALL NOT be the authority for a machine-verified placement constraint.

#### Scenario: Content-local section navigation
- **WHEN** a source scene contains a section navigation surface inside the content region and before the section content
- **THEN** the extracted topology records the content region, the navigation role, containment or peer relation, relative order, and evidence without inventing a page-specific rule

#### Scenario: Inset content region
- **WHEN** a source shell places the content as an inset surface with its own scroll domain
- **THEN** the topology records the shell-to-content relation, content scroll ownership, and referenced geometry tokens without copying framework class names

#### Scenario: Prose-only page-system input
- **WHEN** a page-system source import provides only prose layout and cannot derive complete topology, stable identities, and evidence
- **THEN** the import fails placement closure or records an explicit capability downgrade; it SHALL NOT be published as structurally complete

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

### Requirement: Route placement binding
Every included route SHALL bind to a declared layout scene, declared Page Type, and the applicable Pattern closure used by that route. Every stable reference SHALL resolve in the Active Instance, and a Pattern reference SHALL belong to the bound Page Type or an explicitly declared compatible composition.

#### Scenario: Complete route closure
- **WHEN** Apply plans a route with a declared layout scene, Page Type, patterns, primitives, and placement plan
- **THEN** all references resolve and the route may proceed to implementation

#### Scenario: Missing placement binding
- **WHEN** a route lacks a layout binding, uses an unknown stable ID, or uses a Pattern outside its Page Type closure
- **THEN** the route fails before implementation and recovery reopens the earliest affected phase

### Requirement: Unavailable structural fidelity
When a consumed template declares structural fidelity unavailable, Apply MAY consume tokens, primitives, patterns, and rules within their declared capability, but SHALL mark machine layout/profile verification unavailable. It SHALL NOT assert shell variant, ordered chrome slots, scroll ownership, region topology, or profile verification derived from prose.

#### Scenario: Legacy baseline consumption
- **WHEN** Apply adopts a published package without structural fidelity
- **THEN** Phase 2 records structural verification as unavailable and does not synthesize ordered chrome constraints

#### Scenario: Machine assertion without profile
- **WHEN** an Apply artifact contains ordered chrome slots, shell variant, or topology constraints while structural fidelity is unavailable
- **THEN** validation fails and the artifact must be corrected or the template upgraded through the Authoring flow

### Requirement: Source-blind placement validation
Apply placement checks SHALL consume only the digest-consistent Active Instance, declared binding, structured Apply artifacts, and current-build evidence. Original source trees, source provenance paths, historical generated web output, and oracle comparisons SHALL NOT enter Apply placement validation.

#### Scenario: Alignment request
- **WHEN** a user asks Apply to align a generated page with its original source
- **THEN** Apply still validates only the Active Instance and current build, while source alignment remains an Authoring or certification workflow

#### Scenario: Oracle input detected
- **WHEN** an Apply placement artifact references a source oracle, source comparison, or historical generated implementation
- **THEN** validation reports a source-blind violation and blocks completion

### Requirement: Scroll domain trace
Apply 的每条 included route SHALL 声明 `scroll_owner` 且该值 MUST 等于绑定 layout 记录中某个 scroll domain 的 owner region。绑定的 layout 记录声明多个 scroll domain 时，页面根 SHALL 实现 height-constrained、overflow-hidden 的非滚动容器，滚动只发生在各声明的窗格内；复用壳级或页面级单一滚动容器承载多窗格 layout SHALL 校验失败。layout 记录仅声明单一 scroll domain 时，页面可按单 owner 滚动，但 owner 仍 SHALL 与声明的 region 一致。

#### Scenario: 单窗格对账
- **WHEN** route 绑定的 layout 只声明 canvas 一个 scroll domain
- **THEN** route 的 scroll_owner 指向该 owner 即通过；指向未声明 region 失败

#### Scenario: 多窗格复用单滚动容器
- **WHEN** layout 声明导航列与内容区两个 scroll domain，而实现把整页放进一个滚动容器
- **THEN** Phase 2/8 校验失败，报告窗格滚动未按声明建立（如导航列不撑满、分割线不到底等可观察后果进入证据）

#### Scenario: 壳级滚动越权
- **WHEN** 多窗格页面的根随壳级 main 容器滚动
- **THEN** 校验失败；页面根必须自持 overflow-hidden 并在窗格内滚动
