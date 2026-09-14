# Proposal: close-state-presentation-blind-spots

## Why

1.3.1 复审实证四类视觉走样——输入框 focus 外框遮挡文字、卡内二级导航高度不撑满卡片、按钮变体样式与源不一致、二级导航缺 icon/分组——全部同根：必答矩阵第一轮只闭合了**布局层**（位置/几何），**控件状态呈现层**（focus 机制与 token 绑定、逐变体样式）与**组件解剖层**（icon 槽、分组、多窗格滚动拓扑）仍「词表能表达、无人强制问」。模板 primitives 只列 variant 名与 token 清单，不携带变体样式契约；Apply 以组件库默认值与自造全局 CSS（`:focus-visible` outline、`rounded-md` 默认、无 icon 导航、壳级单一滚动容器）填空，而 Phase 8 证据集与契约同盲无法发现。

## What Changes

- **capture 必答矩阵第二轮**：交互控件（input/button/nav-item/select 类）的 `focus-visible` 处理成为必答状态问题（border token + ring/shadow 机制与 token，如源 `focus-visible:border-ring focus-visible:ring-3 ring-ring/50`）；声明 in-card section-nav 的 scene 必答多窗格拓扑（根 overflow-hidden、每窗格 scroll domain、导航列 stretch）；section-nav 必答解剖（icon 槽、分组标签）与页面上下文状态（selected/hover 绑定 page-surface token）。沉默即 `MANDATORY_FACT_MISSING`，exclusions 仍是唯一合法「显式不知道」。
- **primitive 变体样式契约进模板**：primitives 层为交互控件携带逐变体语义（filled/outline/ghost、radius token、控件高度、focus 处理引用）与解剖槽（icon/label）；nav-item 区分 sidebar 上下文与 page-surface 上下文的状态绑定。Apply 不得在契约外发明变体样式。
- **Apply 滚动归属 gate**：02-routes 每条 `scroll_owner` 必须等于绑定 layout 记录声明的某个 scroll domain owner；多窗格 layout 记录 ⇒ 页面根必须 height-constrained + overflow-hidden + 分窗格滚动，禁止复用壳级单一滚动容器。
- **Apply 全局机制 CSS 禁令**：未 trace 到模板状态事实的全局元素级 focus/机制样式（如 `:focus-visible { outline }`）在 Phase 1/2 gate 失败；focus 必须逐控件按模板事实 token 化，或直接消费 vendor 原语自带语义。
- **Phase 8 状态场景派生**：每条 focus/selected/hover 状态呈现事实 ⇒ 一条 computed-style 场景；证据面随状态事实扩张。
- workbench-shell 1.3.2：补上述事实与契约，重建候选并走完整 authoring gates。

## Capabilities

### New Capabilities

无全新 capability。

### Modified Capabilities

- `structural-fidelity-profile`：**BREAKING**——新增「必答矩阵第二轮（交互状态与解剖）」Requirement；修改「Contextual state presentation records」，`focus-visible` 成为一等状态且必须记录机制（border/ring）与 token。
- `design-system-contract`：新增「Primitive variant styling contracts」Requirement（变体样式契约与解剖槽进 primitives 层）。
- `design-system-placement-closure`：新增「Scroll domain trace」Requirement（route scroll_owner 与 layout scroll domain 对账；多窗格根语义）。
- `design-system-implementation`：新增「Template-derived control styling」Requirement（禁全局机制发明，沉默即停止扩展到状态与解剖）；修改「Current-build verification」纳入状态呈现场景派生。

### Removed Capabilities

无。

## Impact

- **代码面**：`template_authoring/{chrome,capture,profile}.py`（矩阵第二轮 + exclusions 理由沿用）、primitives schema/生成器、`template_apply_state`（scroll owner 对账 + 全局 CSS 静态检查）、`derive_scenario_ids`（状态场景）、fixtures/eval/baseline 同步；`templates/workbench-shell` 1.3.2 候选与 authoring gates；`example/workbench-shell/web` 按新契约修复四类走样并重取证。
- **兼容性**：矩阵收紧为 fail-closed 前向变更（与第一轮同性质）；primitives 契约为新增可选→必答的渐进收紧，旧模板 portable 校验不受影响。
- **非目标**：不改 archive 与 immutable history；不自动 promotion（Certification Gate 作为本类视觉差异的最终兜底，promotion 仍需用户确认）。
