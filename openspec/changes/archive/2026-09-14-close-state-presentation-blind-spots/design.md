# Design: close-state-presentation-blind-spots

## Context

1.3.1 复审的四类走样同根：状态呈现与组件解剖不属必答面，模板 primitives 无变体契约，Apply 以默认值与全局 CSS 填空。源的准确实现已取证：input `focus-visible:border-ring + ring-3 ring-ring/50`、`rounded-lg`、`bg-transparent`；settings 页根 `flex min-h-0 flex-1 overflow-hidden` 双窗格滚动（`settings-page.tsx:241/272/315`）；button `rounded-lg`、逐变体 token、`active:translate-y-px`；settings 导航 icon+label、分组标签、`bg-surface-selected` 选中。token 值全部已在 `core/tokens.yaml`（ring、surface-selected、radius.lg），缺的是「token×控件×状态×机制」的语义绑定与强制询问。上一 change（close-layout-fidelity-blind-spots）的矩阵第一轮与 template_refs gate 是本轮的先例与基座。

## Goals / Non-Goals

**Goals:**
- 矩阵第二轮：focus 处理、多窗格拓扑、section-nav 解剖与页面上下文状态成为必答。
- primitives 变体样式契约与解剖槽进模板（1.3.2）。
- Apply：scroll_owner 对账 gate、全局机制 CSS 禁令、沉默即停止扩展。
- Phase 8：状态呈现与窗格滚动 scenario 派生。
- web 按新契约修复四类走样并重取证。

**Non-Goals:**
- 不改 archive/immutable history；不自动 catalog promotion。
- 不引入像素级 screenshot diff（Certification Gate 的 Pattern Equivalence 已承担对源对照）。
- 不为「控件清单之外」的每个可能控件扩矩阵——按 included scope 内声明的控件类提问。

## Decisions

1. **矩阵第二轮落在 chrome.py 既有 `mandatory_fact_gaps` 机制**，新增三组问题（focus 状态、多窗格拓扑、section-nav 解剖/上下文状态），错误码沿用 `MANDATORY_FACT_MISSING`，gaps 标签命名空间扩展（`focus:<subject>`、`pane-scroll:<scene>`、`nav-anatomy:<scene>`、`nav-state:<scene>`）。不另起校验层，保持闭合语义内聚。
2. **控件类识别按 graph 声明而非猜源码**：scope.components 里声明了 input/button/nav-item 类组件即触发 focus 必答——capture 只读 literal graph，不解析源码，控件清单由作者按来源实际组件作答（与第一轮「作者填清单、机器强制闭合」一致）。
3. **变体契约的表达载体：扩 primitives schema（`variant_contracts` 可选块 + `anatomy` 槽）**，而非塞进 rules prose——契约要被 validator 与 Apply 双向消费，必须是结构化字段。字段：`presentation`（filled|outline|ghost 闭集）、`radius`、`control_height`、`hover`、`active`、`focus_ref`（指向 rule 或 state 事实）、`context_bindings`（nav-item 类按 surface 上下文分列）。旧模板无该块 = 契约沉默 ⇒ Apply 走「沉默即停止」，与 BREAKING 收紧方向一致但 portable 校验不炸旧模板。
4. **scroll_owner 对账在 `_route_composition_findings`**：新增 `SCROLL_OWNER_UNTRACE`（owner 不在绑定 layout 的 scroll domain owners 中）；多窗格判定读 layout 记录 scroll_domains 数量 ≥2 ⇒ 要求 02-routes 该 route 声明 `multi_pane: true` 且页面结构工件（03-structure.md）记录 overflow-hidden 根——静态可查的部分进 Phase 2，滚动实态留给 Phase 8 scenario。
5. **全局机制 CSS 禁令用静态扫描实现**（Phase 1 gate）：扫描输出根样式表中的全局元素/伪类选择器机制声明（`:focus-visible { outline/ring }`、`:hover` 作用于标签名），要求每条能 trace 到模板状态事实或 vendor 原语（白名单机制：变量定义、token 投影、prefers-reduced-motion 等）。误报控制：只拦「机制发明类」，不拦 token 投影。
6. **状态 scenario 派生扩展 `derive_scenario_ids`**：state_presentations 每条 focus/selected/hover 记录 ⇒ `phase8:state:<subject>:<context>:<state>:<property>` 场景；layout 每条 scroll_domain ⇒ `phase8:scroll-domain:<layout>:<axis>:<owner>`。断言细则（border-color、box-shadow、overflow）写在 quality-gates 文档。
7. **修复路径**：模板 1.3.2 从 graph 补事实重走完整 authoring 链（不做原地补丁，先例 1.3.1）；web 修复四项：input/button 按 vendor+契约重写 focus 与圆角、settings 多窗格根、nav icon+分组。Phase 8 证据含新场景。
8. **Certification 不在本轮加码**（入口强制已由上一 change 落地）；本 change 的验收依赖本地证据扩张，对源最终对照仍留给 promotion 前认证。

## Risks / Trade-offs

- **primitives schema 扩展**是最重的耦合面（schemas/authoring/validator/apply/fixtures/eval 同步）——用可选块降低破坏面；旧模板「沉默即停止」可能在存量消费中频繁触发询问，接受（这正是暴露债务）。
- **全局 CSS 静态扫描有误报面**：只拦机制发明类并把白名单写进 gate 文档；误报时走 unresolved 而非硬失败。
- **focus/状态 scenario 数量增长**：断言按「机制+token 解析值」两键聚合，不逐属性截图。
- 与上一 pending change（close-layout-fidelity-blind-spots）修改同一 Requirement（Current-build verification）：归档顺序先 layout 后 state，本轮 delta 文本已按叠加后的完整语义书写。
