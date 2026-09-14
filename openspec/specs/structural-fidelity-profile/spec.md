## Purpose

为 repo 来源 UI 模板提供独立版本化、技术栈无关且可重放的结构保真扩展，使 layout 关系、组件盒模型和上下文状态在不同 Authoring/Apply Agent 间保持可验证的一致语义。

## Requirements

### Requirement: 版本化 structural fidelity sidecar
结构保真模板 SHALL 使用独立版本化的 `fidelity.yaml` sidecar，声明 `repo-structural-v1` profile、conformance、适用平台和来源范围。sidecar SHALL 只表达 layout topology、component geometry 与 contextual state presentation；所有精确数值 SHALL 继续由 `tokens.yaml` 唯一携带，sidecar 只引用 token path、稳定 rule ID 或闭集语义值。

#### Scenario: repo structural 模板
- **WHEN** repo Authoring 以 structural conformance 完成模板
- **THEN** 模板包含可解析的 `fidelity.yaml`，三类记录按声明 scope 完整，所有精确值均解析到 `tokens.yaml`

#### Scenario: 用户明确选择 style-only
- **WHEN** 用户明确要求 repo 来源只提取视觉语言
- **THEN** sidecar 记录 style-only conformance 与理由，不伪造 structural records，Apply 明确按 baseline fidelity 消费

#### Scenario: sidecar 包含工程实现
- **WHEN** normative 字段包含框架、依赖、源码目录、CSS class、hook、API/data/state 选型或 runnable starter
- **THEN** profile validation 失败，且模板不得进入 Index

### Requirement: Layout topology records
每个 included structural scene SHALL 以稳定 ID 和 rule ID 定义抽象 regions、最小归属关系、arrangement、fill/shrink/wrap 语义、按轴划分的 scroll domains、overlay scope/anchor 和适用 responsive mode。每个声明的 scroll domain SHALL 有且只有一个 owner；多个独立或嵌套 scroll domain SHALL 被允许，不得使用全局唯一 scroll owner 假设。

#### Scenario: 非换行横向 Board
- **WHEN** 来源 scene 使用固定列、横向排列和内部横向滚动
- **THEN** profile 记录 board arrangement、non-wrapping、column non-shrink、inline scroll owner 和根/画布 overflow 边界

#### Scenario: 主从布局有独立滚动域
- **WHEN** master 与 detail 分别承担 block-axis 滚动
- **THEN** profile 定义两个独立 scroll domains 及各自 owner，validator 不把它们误判为冲突

#### Scenario: overlay 归属未确定
- **WHEN** 来源无法确定 modal、sheet 或 floating surface 相对 viewport 还是 region 定位
- **THEN** 该关系进入 unresolved，模板不得将其标记为 observed structural fact

### Requirement: Shell chrome composition records
每个 included structural **shell** scene SHALL 在 layout topology 之外记录 chrome composition：闭集 `shell_variant`（`inset | flush`）与该 scene 内有序 `slots[]`（稳定 ID、闭集 role、所属 region）。`chrome_anchors` 是可选 record：仅当 slot/graph 声明了允许的锚点 role 时，对应锚点必须闭合且 region 存在。同级 `contains` 关系 SHALL 带稳定顺序，不得只声明无序归属。精确几何值 SHALL 继续只引用 `tokens.yaml`。槽位 role 闭集至少包含 `workspace-switcher`、`search`、`compose`、`nav-group`、`pin-list`、`rail`、`header-trigger`、`footer-utility`、`chat-fab`、`page-header`、`page-toolbar`、`page-canvas`。通用 profile 契约 SHALL NOT 把 `chat-fab`、A–E 或 Board 写成每个 shell 的必选项。来源无法唯一裁决变体、顺序或已声明锚点时 SHALL 进入 unresolved，不得把该 shell 标为 observed structural。

#### Scenario: inset 壳与页头 trigger
- **WHEN** 来源 shell 使用内缩画布，且声明了位于 page-header 的导航覆盖触发器
- **THEN** profile 记录 `shell_variant: inset`、`header-trigger` 锚在 page-header region，且不得把该 trigger 记为 page-canvas overlay

#### Scenario: 侧栏槽位顺序可观察
- **WHEN** 来源 sidebar header 按工作区切换器、搜索、创建动作排列
- **THEN** profile 以该顺序写出对应 slots；颠倒顺序的记录与来源冲突并不得标 observed

#### Scenario: 只有横向排列没有 chrome
- **WHEN** included shell scene 只声明 `arrangement: horizontal` 和根不滚动，没有 variant 或有序槽位
- **THEN** 该 scene 不得标 observed structural；Authoring/validation 报告 chrome composition 不完整

#### Scenario: 未声明可选锚点
- **WHEN** included shell 有 variant 与有序 slots，来源未出现 header-trigger 或 chat-fab
- **THEN** 空 `chrome_anchors` 仍可标 observed；不得因缺少这些实例锚点而 incomplete

#### Scenario: flush 与 inset 冲突
- **WHEN** 同一 shell scene 的 usages 对 `shell_variant` 给出 inset 与 flush
- **THEN** 两条 fact 进入 unresolved，模板不得发布其中任一条为 observed

### Requirement: Component geometry records
每个 included 高保真 component slot SHALL 以稳定 ID 记录适用 component/slot、盒模型属性和 token path 映射。支持的几何属性 SHALL 至少覆盖逻辑方向 padding、gap、inset、size、radius、surface 和 shadow；`none`、`zero` 及逻辑方向不对称 SHALL 作为一等可验证值，不得由 Apply 从通用 scale 自选。

#### Scenario: Dialog content 顶部 padding
- **WHEN** 来源 Dialog content 在四个逻辑方向使用已观察 padding
- **THEN** profile 分别记录 `padding_block_start`、`padding_inline_end`、`padding_block_end`、`padding_inline_start` 的 token refs，Apply 不得省略顶部 padding

#### Scenario: slot 几何只写“从 scale 映射”
- **WHEN** structural component geometry 未指定某个必需属性对应的 token path或闭集语义值
- **THEN** validation 报告不完整映射，不允许以自由 prose 代替

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

### Requirement: Structural provenance 与 source replay
每条 **本会话 Generate-from-source 新写入的** structural observed record SHALL 记录 source ID、与 meta 一致的 revision、可重放 locator、method、source-span digest、captured_at 和 confidence。Authoring 仅在本会话提供 session source 时 SHALL 重放这些 record。已发布模板上 `method: v1-source-token-migration` 等 snapshot locator 是合法 legacy provenance，SHALL NOT 触发「请提供上游本地路径」。多个 usage 冲突时 SHALL 保留冲突集合并要求显式裁决，不得静默多数表决。

#### Scenario: Direct source locator 可重放
- **WHEN** 本会话 Generate 的 record 标记为 observed source fact，且 caller 提供了匹配的 session source
- **THEN** Authoring source replay 在固定 revision 找到 path/symbol/selector，内容摘要匹配且 record 与来源语义一致

#### Scenario: 新 record 的 locator 指向候选模板自身
- **WHEN** 本会话 Generate 写入的 repo-origin observed record 的 locator 指向当前候选模板或旧模板快照而非 session source revision
- **THEN** source replay 失败，且该 record 不得保留 observed/high confidence

#### Scenario: 已发布迁移 evidence 不是 replay 输入
- **WHEN** workbench 或其他已发布模板的 evidence locator 指向本仓历史 tokens 快照（例如 `v1-source-token-migration`）
- **THEN** portable 消费与校验仍然合法；SHALL NOT 把这些 locator 当成必须对外部 checkout 重放的 source-direct fact

#### Scenario: 同类 usage 冲突
- **WHEN** scope closure 中相同 context/slot 的 usage 给出不同结构事实
- **THEN** Authoring 记录全部冲突和 locator，并在有稳定 rule/decision 前保持 unresolved

### Requirement: 兼容降级与 identity
schema v2 core 模板 SHALL 在没有 `fidelity.yaml` 时继续可解析；Apply SHALL 将其标识为 baseline fidelity，而不是伪造 structural conformance。存在 sidecar 时，未知 schema/profile SHALL fail closed；profile 的 canonical semantic content SHALL 纳入模板 identity 和 checkpoint 失效计算。

#### Scenario: 旧 v2 模板无 sidecar
- **WHEN** 新 Apply 消费合法但没有 `fidelity.yaml` 的 v2 模板
- **THEN** Apply 继续 baseline 流程，明确记录 structural profile unavailable，并不得宣称结构保真已验证

#### Scenario: 未知 profile version
- **WHEN** `fidelity.yaml` 声明消费者不支持的 schema 或 profile
- **THEN** Authoring/Apply 明确拒绝 structural consumption 并报告所需兼容升级

#### Scenario: profile 语义变化
- **WHEN** layout、geometry、state、provenance 或 unresolved 集合发生语义变化
- **THEN** template identity 改变，Apply 从最早受影响 phase 重新打开并使相关浏览器证据过期

### Requirement: Structural semantic reproducibility
相同 source revision、scope、profile 与已确认 decisions SHALL 生成相同的 canonical structural semantics。YAML 顺序、描述措辞和 locator 行号变化 MAY 被 canonicalization 忽略，但 record identities、关系、token/rule refs、negative facts 和 unresolved 集合 SHALL 一致。

#### Scenario: 重复 Authoring
- **WHEN** 两次独立 Authoring 使用相同固定 repo fixture、scope 和 decisions
- **THEN** canonical profile digest 和所有阻断 record identity 集合完全一致

#### Scenario: 一个 Agent observed、另一个 Agent defaulted
- **WHEN** 相同来源闭包在不同运行中得到不一致的 record status 或 unresolved 结果
- **THEN** reproducibility eval 失败并阻断该 profile 作为稳定 contract 发布
