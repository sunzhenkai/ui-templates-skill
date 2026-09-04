## ADDED Requirements

### Requirement: Workbench structural fidelity profile
`templates/workbench-shell/` SHALL 提供通过验证的 `repo-structural-v1` sidecar，使用其已声明 repo 与 doc 固定 revisions 作为来源，覆盖 included Web shell、Board、主从、Dialog 和 link contexts。profile SHALL 引用当前 tokens/rule IDs 和 source-direct provenance，不得从 `example/**` 反推或修正模板决定。

#### Scenario: Workbench template validation
- **WHEN**maintainer 验证 workbench-shell 模板
- **THEN**core v2、structural profile、source replay、template INDEX 和 relevant eval 全部通过，且 source-direct records 不指向旧模板快照冒充上游来源

#### Scenario: Example 实现存在差异
- **WHEN**`example/workbench-shell/**` 的生成代码、样式、测试或文档发生变化
- **THEN**workbench profile 生成与验收不读取、不修改也不使用该变化作为来源证据

### Requirement: Workbench 非常规 layout records
Workbench profile SHALL 为固定根壳与内部 canvas、非换行横向 Board、主从独立滚动、可调整 detail/sidebar 和 canvas-scoped modal/global overlays 定义稳定 structural records。精确 geometry SHALL 引用现有 layout/spacing/responsive tokens，不在 sidecar 复制值。

#### Scenario: Board 横向滚动
- **WHEN**consumer 实现 workbench Board scene
- **THEN**Board region 横向排列且不换行，columns 不收缩，inline 滚动属于 Board，根壳不产生意外滚动

#### Scenario: 主从布局
- **WHEN**consumer 实现 workbench master/detail scene
- **THEN**master 与 detail 的 block scroll owners、分隔/resize 边界和 compact 单列转换匹配 profile records

#### Scenario: Modal registry scope
- **WHEN**consumer 打开 workbench 全局 modal
- **THEN**overlay 的视觉 scope/anchor 与 profile 声明一致，不因 portal 或框架实现扩大到错误容器

### Requirement: Workbench link context records
Workbench profile SHALL 分别定义 navigation-link、entity-row-link、button-link 与 inline-prose-link 的 default/hover/focus presentation。Navigation 和 entity-row SHALL 不因通用 link 默认产生未声明 underline；button/prose context 的 underline SHALL 仅在来源支持时保留。

#### Scenario: Navigation hover
- **WHEN**用户 hover sidebar navigation link
- **THEN**背景/文字状态匹配 sidebar role 且 text decoration 为 profile 声明的 `none`

#### Scenario: Entity row hover
- **WHEN**用户 hover 可导航列表行
- **THEN**container surface 表达 hover，行内 link 不额外显示未声明 underline

#### Scenario: Button link hover
- **WHEN**用户 hover 明确的 button-link variant
- **THEN**underline 只按该 context record 显示，不污染 navigation 或 entity-row

### Requirement: Workbench Dialog geometry records
Workbench profile SHALL 为 Dialog content、header、close control 和 footer 的 included slots 定义逻辑方向 padding、gap、inset、surface、radius、shadow 与边界 token refs。所有方向 SHALL 独立可验证，不能用“从 spacing scale 映射”的 prose 代替。

#### Scenario: Dialog content 顶部 padding
- **WHEN**consumer 打开标准 workbench Dialog
- **THEN**content 的 `padding-block-start` 等于 profile 引用 token 的 resolved value，并保留 header/close/footer 的相对几何

#### Scenario: Footer 几何
- **WHEN**Dialog 包含 footer
- **THEN**footer 的逻辑方向 padding、边界与 content offset 匹配 profile records，不因目标组件库默认结构发生漂移

### Requirement: Workbench profile 质量矩阵
Workbench `apply/quality.md` SHALL 引用 structural record IDs，并 SHALL 为 included layout、geometry 和 state records 定义 current-build 取证与通过条件，不复制 token 精确值或维护第二套 profile。

#### Scenario: Apply 生成验收场景
- **WHEN**consumer 读取 workbench profile 与 quality matrix
- **THEN**Phase 8 required scenario IDs 可由 included records 确定生成，覆盖 link decoration、Dialog padding、scroll domains 与 overlay scope

#### Scenario: 只提供整页截图
- **WHEN**consumer 用截图声称 structural records 通过但没有 computed/geometry/scroll evidence
- **THEN**相关 gate 保持 failed，直到提供绑定 current build 的 expected/actual
