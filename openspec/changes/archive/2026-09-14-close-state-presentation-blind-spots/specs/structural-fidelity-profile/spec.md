## ADDED Requirements

### Requirement: 必答矩阵第二轮（交互状态与解剖）
repo structural capture 的必答事实矩阵 SHALL 覆盖交互控件状态呈现与组件解剖。对 included scope 内每个交互控件类（文本输入、按钮、导航条目、下拉类），graph SHALL 记录 `focus-visible` 状态事实：边框 token 与 ring/shadow 机制及对应 token（三者至少边框与机制二者），无法作答必须显式 exclusions。对声明 in-card section navigation 的 scene，graph SHALL 记录多窗格拓扑事实：根滚动语义（root_scroll none / overflow-hidden 等价闭集值）、每个可滚动窗格的 scroll domain、导航列 stretch/fill；并对 section navigation 条目记录解剖事实（icon 槽存在性、分组标签存在性）与页面上下文状态事实（selected/hover 绑定的 page-surface token）。沉默 SHALL 以 `MANDATORY_FACT_MISSING` fail closed；`mandatory_answers` 投影 SHALL 覆盖本轮全部条目。

#### Scenario: 输入框 focus 处理沉默
- **WHEN** included scope 含文本输入控件而 graph 无其 focus-visible 状态事实且无 exclusions
- **THEN** capture 以 `MANDATORY_FACT_MISSING` 失败，gaps 指明缺失的 focus 条目

#### Scenario: focus 机制与 token 被记录
- **WHEN** 来源输入控件 focus 时边框切 ring token 并绘制 3px 半透明 ring
- **THEN** graph 记录 focus-visible 状态的 border token-ref 与 shadow/ring 机制 token-ref，fidelity 投影为对应 state presentation 记录

#### Scenario: 多窗格场景缺滚动拓扑
- **WHEN** scene 声明 in-card section-nav 但未记录根滚动语义与各窗格 scroll domain
- **THEN** capture 失败并指明缺失条目；不得让导航列高度语义留空给 Apply 猜测

#### Scenario: 导航条目解剖沉默
- **WHEN** section navigation 条目在源中为 icon+label 而图未记录 icon 槽事实
- **THEN** capture 失败或经显式 exclusions 降级；Apply 不得默认渲染纯文字条目

#### Scenario: 页面上下文状态绑定
- **WHEN** section navigation 选中态在源中绑定 page-surface token（如 surface-selected）
- **THEN** 状态事实记录该 token；sidebar 系 token 不得被静默复用到页面上下文

## MODIFIED Requirements

### Requirement: Contextual state presentation records
交互呈现 SHALL 按 subject role、context、state 和适用 surface 记录，而不是按通用“link/component”全局推广。记录 SHALL 支持背景/文字/边框角色、text decoration、visibility 与 container-state 等闭集结果，并 SHALL 将 `none` 等 negative facts 作为 expected 值。`focus-visible` SHALL 是一等 state：交互控件的 focus 记录 SHALL 同时表达机制（border 切换、ring/box-shadow 或等价闭集语义）与 token 绑定，机制缺失的 focus 记录 SHALL 视为未作答。

#### Scenario: Navigation link hover
- **WHEN** 来源 navigation link 通过 sidebar background 表达 hover 且没有 text underline
- **THEN** profile 记录该 context 的背景 token ref 与 `text_decoration: none`

#### Scenario: Button link hover
- **WHEN** 来源 button-link variant 在 hover 时显示 underline
- **THEN** profile 只为 button-link context 记录 underline，不影响 navigation、entity-row 或 card-link

#### Scenario: 单一 usage 被推广为全局规则
- **WHEN** Authoring 只有一个 context 的来源证据却生成跨 context 状态规则
- **THEN** source replay 或 semantic validation 失败，并要求拆分 context 或记录 unresolved

#### Scenario: focus 记录缺机制
- **WHEN** 某交互控件 state presentation 声明 focus-visible 但只有颜色没有机制语义
- **THEN** 该记录判为不完整，等价未作答并回到必答矩阵失败路径
