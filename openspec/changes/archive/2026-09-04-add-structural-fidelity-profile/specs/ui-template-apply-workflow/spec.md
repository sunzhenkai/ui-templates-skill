## ADDED Requirements

### Requirement: Structural fidelity profile Intake
`ui-template-apply` SHALL 在 Phase 0 检测并验证 `fidelity.yaml`。受支持 structural profile SHALL 进入 included/deferred/excluded 决策；合法 v2 模板无 sidecar 时 SHALL 明确记录 baseline fidelity；存在未知 profile/schema、悬空引用或未解决的 included blocker 时 SHALL 拒绝 structural consumption。

#### Scenario: 受支持 structural profile
- **WHEN**模板包含验证通过的 `repo-structural-v1`
- **THEN** Intake 记录 profile identity、conformance、scope、canonical digest 与 unresolved decisions，并将其纳入 checkpoint template identity

#### Scenario: 旧 v2 模板无 sidecar
- **WHEN**模板满足 core v2 但没有 `fidelity.yaml`
- **THEN** Apply 可继续 baseline 流程，明确记录 structural fidelity unavailable，不把布局或细节一致性标记为 profile-verified

#### Scenario: Unknown profile
- **WHEN**sidecar schema/profile version 不受支持
- **THEN** Apply 停止并报告兼容升级，不忽略 sidecar 后继续猜测

### Requirement: Phase 2 layout topology consumption
Phase 2 SHALL 将每个 included layout scene 的 regions、arrangement、fill/shrink/wrap、scroll domains、overlay scope/anchor 与 responsive modes 映射到稳定约束 identity。消费项目 MAY 使用任意技术栈和 DOM，只要 current-build evidence 证明相同可观察关系。

#### Scenario: Board structural scene
- **WHEN**included scene 声明横向 non-wrapping Board、non-shrinking columns 和内部 inline scroll owner
- **THEN** Phase 2 产物保留这些约束，且不得用自动换行 grid 或根横向滚动替代

#### Scenario: 主从有两个滚动域
- **WHEN**profile 分别声明 master/detail block scroll owners
- **THEN** Phase 2 生成两个 domain identity，不将根页面或错误 region 作为统一 scroll owner

### Requirement: Phase 4 geometry 与 contextual state consumption
Phase 4 SHALL 将 included component/slot geometry 和 subject/context/state presentation 映射到组件 inventory 与 token map。Apply SHALL 保留 profile 的 negative facts，不得用框架、组件库或 Agent 常见默认值覆盖 `none`、不对称 padding、non-wrap 或无 shadow 等 expected。

#### Scenario: Dialog content geometry
- **WHEN**profile 将 Dialog content 四个逻辑方向 padding 映射到 token refs
- **THEN**组件 inventory 和实现约束包含全部方向，顶部 padding 不得因关闭按钮或 header 结构省略

#### Scenario: Navigation link hover
- **WHEN**profile 声明 navigation link hover 使用背景且 `text_decoration: none`
- **THEN**实现不得继承 button-link/prose-link 的 hover underline

#### Scenario: Button link 例外
- **WHEN**profile 为 button-link context 声明 hover underline
- **THEN**该 decoration 只适用于对应 context，不传播到 entity-row、navigation 或 card-link

### Requirement: Structural current-build browser evidence
Phase 8 SHALL 从 included structural records 确定性生成 required scenario IDs，并以 current-build computed style、bounding geometry、scroll owner、overflow、state transition、overlay scope 和 Accessibility tree 证明 expected/actual。截图 MAY 作为辅助证据，但不得替代可解析结构与 computed evidence。

#### Scenario: 检查 Dialog 顶部 padding
- **WHEN**浏览器打开 included Dialog
- **THEN**evidence 记录 content `padding-block-start` 的 token-resolved expected、computed actual、rule/profile record ID 和 current identities

#### Scenario: 检查 link hover decoration
- **WHEN**浏览器分别 hover navigation、entity-row 和 button-link
- **THEN**每个 context 的 text decoration 与背景变化匹配其独立 record，不以单一全局 link 断言代替

#### Scenario: 检查非常规 layout
- **WHEN**浏览器在声明 viewport/mode 渲染 Board、主从或 overlay scene
- **THEN**evidence 证明指定 region 承担对应轴滚动、非 owner 不意外滚动、non-wrap/non-shrink 与 overlay scope 成立

### Requirement: Profile 变化恢复与反馈
Structural profile canonical semantics 的变化 SHALL 使受影响 Phase 2/4/8 产物和证据过期，并从最早受影响 phase 恢复。若 current build 无法满足可复用 profile record，Apply SHALL 产出引用 record/rule/current-build evidence 的 feedback；仅属目标技术栈的问题 SHALL 留在消费项目。

#### Scenario: 仅 state record 变化
- **WHEN**contextual state presentation 发生语义变化而 layout records 未变
- **THEN**Apply 至少重开 Phase 4 与 Phase 8，并保留仍有效的 Phase 2 artifact

#### Scenario: Layout record 变化
- **WHEN**scroll owner、region relation 或 responsive mode 变化
- **THEN**Apply 从 Phase 2 重开，并使依赖的 component 和 browser evidence 过期

#### Scenario: 不同技术栈实现相同 contract
- **WHEN**两个目标项目使用不同框架或组件库但通过相同 structural scenario IDs
- **THEN**Apply 接受两者，不要求源码目录、组件名、CSS class 或 DOM 同构
