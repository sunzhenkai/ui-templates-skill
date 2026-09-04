## MODIFIED Requirements

### Requirement: Phase 2 layout topology consumption
Phase 2 SHALL 将每个 included layout scene 的 regions、arrangement、fill/shrink/wrap、scroll domains、overlay scope/anchor、responsive modes 与 **shell chrome composition**（`shell_variant`、有序 slots、header-trigger/chat-fab 锚点）映射到稳定约束 identity。消费项目 MAY 使用任意技术栈和 DOM，只要 current-build evidence 证明相同可观察关系。Apply SHALL NOT 在 profile 声明 `inset` 时改用左右硬切 flush 壳，SHALL NOT 把 `header-trigger` 从 page-header 挪到画布悬浮控件，SHALL NOT 重排已观察的 chrome 槽位顺序。无 sidecar 的 baseline 模板 SHALL 明确 structural chrome unavailable，不得把自行发明的壳标为 profile-verified。

#### Scenario: Board structural scene
- **WHEN** included scene 声明横向 non-wrapping Board、non-shrinking columns 和内部 inline scroll owner
- **THEN** Phase 2 产物保留这些约束，且不得用自动换行 grid 或根横向滚动替代

#### Scenario: 主从有两个滚动域
- **WHEN** profile 分别声明 master/detail block scroll owners
- **THEN** Phase 2 生成两个 domain identity，不将根页面或错误 region 作为统一 scroll owner

#### Scenario: inset 壳不得改成硬切
- **WHEN** included shell scene 声明 `shell_variant: inset` 且 header-trigger 锚在 page-header
- **THEN** Phase 2 约束保留 inset 画布与页头 trigger；实现用 flush 分栏或画布角汉堡菜单替代时 Phase 8 对应 scenario 失败

#### Scenario: 有序槽位被重排
- **WHEN** profile 顺序为 workspace-switcher、search、compose
- **THEN** Phase 2 保留该顺序 identity；实现改成搜索/创建并排按钮且无切换器槽位时不得标 chrome 约束通过

#### Scenario: baseline 无 chrome records
- **WHEN** 模板无 `fidelity.yaml`
- **THEN** Phase 2 记录 structural chrome unavailable，不把消费项目自选壳形态写进 profile-verified 证据

### Requirement: Structural current-build browser evidence
Phase 8 SHALL 从 included structural records 确定性生成 required scenario IDs，并以 current-build computed style、bounding geometry、scroll owner、overflow、state transition、overlay scope、**shell variant / 槽位顺序 / trigger 锚点** 和 Accessibility tree 证明 expected/actual。截图 MAY 作为辅助证据，但不得替代可解析结构与 computed evidence。

#### Scenario: 检查 Dialog 顶部 padding
- **WHEN** 浏览器打开 included Dialog
- **THEN** evidence 记录 content `padding-block-start` 的 token-resolved expected、computed actual、rule/profile record ID 和 current identities

#### Scenario: 检查 link hover decoration
- **WHEN** 浏览器分别 hover navigation、entity-row 和 button-link
- **THEN** 每个 context 的 text decoration 与背景变化匹配其独立 record，不以单一全局 link 断言代替

#### Scenario: 检查非常规 layout
- **WHEN** 浏览器在声明 viewport/mode 渲染 Board、主从或 overlay scene
- **THEN** evidence 证明指定 region 承担对应轴滚动、非 owner 不意外滚动、non-wrap/non-shrink 与 overlay scope 成立

#### Scenario: 检查 shell chrome
- **WHEN** 浏览器在声明 viewport 渲染 included inset shell
- **THEN** evidence 证明画布相对壳内缩（非左右硬切）、header-trigger 位于 page-header 几何内、槽位顺序与 profile slots 一致；flush 替代或画布角汉堡使该 scenario failed

### Requirement: Profile 变化恢复与反馈
Structural profile canonical semantics 的变化 SHALL 使受影响 Phase 2/4/8 产物和证据过期，并从最早受影响 phase 恢复。若 current build 无法满足可复用 profile record，Apply SHALL 产出引用 record/rule/current-build evidence 的 feedback；仅属目标技术栈的问题 SHALL 留在消费项目。

#### Scenario: 仅 state record 变化
- **WHEN** contextual state presentation 发生语义变化而 layout records 未变
- **THEN** Apply 至少重开 Phase 4 与 Phase 8，并保留仍有效的 Phase 2 artifact

#### Scenario: Layout record 变化
- **WHEN** scroll owner、region relation、responsive mode 或 shell chrome composition（variant、槽位顺序、trigger/FAB 锚点）变化
- **THEN** Apply 从 Phase 2 重开，并使依赖的 component 和 browser evidence 过期

#### Scenario: 不同技术栈实现相同 contract
- **WHEN** 两个目标项目使用不同框架或组件库但通过相同 structural scenario IDs
- **THEN** Apply 接受两者，不要求源码目录、组件名、CSS class 或 DOM 同构
