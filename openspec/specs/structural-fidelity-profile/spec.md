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

### Requirement: Contextual state presentation records
交互呈现 SHALL 按 subject role、context、state 和适用 surface 记录，而不是按通用“link/component”全局推广。记录 SHALL 支持背景/文字/边框角色、text decoration、visibility 与 container-state 等闭集结果，并 SHALL 将 `none` 等 negative facts 作为 expected 值。

#### Scenario: Navigation link hover
- **WHEN** 来源 navigation link 通过 sidebar background 表达 hover 且没有 text underline
- **THEN** profile 记录该 context 的背景 token ref 与 `text_decoration: none`

#### Scenario: Button link hover
- **WHEN** 来源 button-link variant 在 hover 时显示 underline
- **THEN** profile 只为 button-link context 记录 underline，不影响 navigation、entity-row 或 card-link

#### Scenario: 单一 usage 被推广为全局规则
- **WHEN** Authoring 只有一个 context 的来源证据却生成跨 context 状态规则
- **THEN** source replay 或 semantic validation 失败，并要求拆分 context 或记录 unresolved

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
