# Repo literal capture format v1

`repo-literal-graph-v1` 是 repo Authoring 唯一内建静态采集子集。输入仅限 UTF-8 `.json/.yaml/.yml`；对象 closed、重复 key/ID 失败，未知字段或枚举失败。所有其他输入返回 `unsupported`，不会回退到 grep/regex、代表组件抽样或来源代码执行。

## Capture request

必填 envelope：`schema_version: 1`、`capture_profile: repo-literal-graph-v1`、`source_id`、40 位 lowercase Git commit `source_revision`、安全相对 `graph_path`、`platform: web`、`conformance`、`scope`、`decisions`、`limits`。structural 的 scenes/components/contexts 均为非空闭集；style-only 需 `style_only_reason`，且不生成 structural records。

`limits` 固定 `max_graph_bytes/max_definitions/max_imports/max_usages/max_facts`。达到任一上限即 `limit-exceeded` 且不输出部分 closure。`decisions` 只允许 `theme_id`、`entry_id`、`definition_ids`；多个候选无显式 decision 时 unresolved。

Capture request 的 `source_id` / `source_revision` 绑定的是**本会话 session source**，不是已发布模板 `meta.sources[]` 的隐式路径。没有用户给出的 session source 时不要构造 request、不要猜测 root。

## Literal source graph

顶层仅允许：

- `schema_version: 1`、`graph_type: ui-template-literal-source-graph`、`platform: web`、`closure_complete: true`；
- `canonical_candidates.themes/entries`；
- `definitions`：stable ID、`theme|entry|scene|component|context|primitive`、name、identity locator、exports、facts；
- `imports`：显式 from/to definition edge；
- `usages`：definition、scene、可空 component/context/slot/state、identity locator、facts；
- `exclusions`：`out-of-scope|platform-mismatch|non-ui`；
- `dynamic`：`runtime-expression|computed-import|conditional-definition|unknown-export`，scope 命中即 unresolved。

Fact 只表达三个 facet：`layout_scenes`、`component_geometry`、`state_presentations`。identity 固定 `id/facet/subject/context/slot/state/property/rule_id`；实现投影 value 仍仅为 `token-ref` 或 semantic 字符串：通用布局语义（如 `none|zero|auto|intrinsic|fill|non-wrap|non-shrink|underline|visible|hidden|viewport|region|inline|block|horizontal|vertical|overlay|inset|flush|icon-label|label-only|root|whole-trigger|split-trigger` 及 `"0"`–`"32"`）由 sidecar schema 闭集承载；槽位 role、anchor role、scene 标签等实例词汇是开放自声明值（非空字符串，kebab-case），采集与校验不得用固定枚举限制。如来源声明精确 CSS 值，value 可附 `observed: {kind: css-length|css-color, value: <非空字符串>}`：它是带 locator 的 source 观测，不是 package 的第二份 token 权威；Author 必须将其映射到 `tokens.yaml` 的 token-ref 后才能发布。layout property 另含 `shell_variant`、`slot_role`、`slot_order`、`anchor_role`、`container_role`。无任意可执行表达式、CSS class 或 framework primitive。negative semantic 必须显式 `negative: true`；正向 semantic（如 `underline`）标 `negative: true` 是自相矛盾，一律拒绝（`NEGATIVE_FACT_INVALID`）。shell usage 必须闭合 chrome composition，否则 `CHROME_COMPOSITION_INCOMPLETE`。

Locator 固定为 `<graph_path>#/<collection>/<stable-id>`；capture digest 针对 canonical literal node，不依赖 YAML 顺序或行号。来源 revision、scope、decisions、limits、graph digest、definitions/exports/imports/usages/exclusions/dynamic/facts/unresolved 共同进入 closure digest。

## 安全与确定性

Runtime 只对**本会话 session source root** 执行 `git rev-parse HEAD`；默认从该 root 读取 graph。调用方也可显式提供 source 外的 artifact root：graph 仍须为安全相对路径、内容 digest 与 source revision 一同进入 receipt，但 source checkout 不得被写入、暂存或提交。拒绝 absolute/traversal、symlink、`example/`、revision mismatch。禁止从已发布 `meta.sources[]`、sibling 或 `/tmp` 猜测该 root。它不导入来源模块，不执行 shell/package/编译器，不访问网络，也不把完整 AST/call graph/source snapshot 发布进模板。该有限子集无法表达的 repo 必须 fail unsupported/unresolved 或请求用户提供可信 literal graph，不能猜测。

## Mandatory question matrix（close-layout-fidelity-blind-spots）

closure 只证明 scope 内问题已闭合；本节问题由机器强制，沉默与未作答等价。`capture` 对 included scenes 逐项检查，缺失即抛 `MANDATORY_FACT_MISSING`（与 chrome composition 不完整同级 fail closed），不产出 `captured` receipt：

1. **variant 内容面**：shell scene 声明 `shell_variant`（除 profile 级豁免值 `flush` 外的任意实例值）时，变体事实点名的内容面（fact 未点名 slot 时为全部已声明 slot）必须携带五项几何事实，每项为 token-ref、闭集语义或显式 negative——inset/margin（`gap`、`inset_*`、`padding_*` 任一）、`radius`、`border`、`shadow`、`background`。slot 名与 variant 值都是实例自声明词汇。精确值仍由 `tokens.yaml` 唯一携带。高保真 geometry 记录仍须满足四向 padding 完整性（含显式 zero）。gaps 标签 `variant-surface:*`。
2. **多分区页二级导航**：kind 为 `board | other` 的 included scene 必须结构性地声明二级导航列——某个 slot 携带 `anatomy` 事实，或同时携带列级布局属性（`arrangement` / `container_presentation` / `scroll_block` / `scroll_inline` / `size`）与 selected/hover/active 的 `background` token-ref；按 slot 名（如 `section-nav`）匹配不算作答。或以 exclusions 条目显式回答。gaps 标签 `nav-column:{scene}`。
3. **master-detail 分侧与辅助面**：kind 为 `master-detail` 的 scene 必须有两个及以上携带 `scroll_block` 事实的 slot（分侧与次序，slot 名实例自声明）；在非分侧 slot 上声明 overlay 语义（`overlay_scope` / `overlay_anchor`）的辅助面必须给出 `overlay_scope`。gaps 标签 `detail-panes:{scene}` / `aux-surfaces:{scene}`。

**显式不知道的作答方式**：exclusions 条目的 locator 指向目标 scene definition（`<graph_path>#/definitions/<id>`，或保持自指 `<graph_path>#/exclusions/<id>`），reason 仍取闭集。指向不存在 definition 的 exclusions 一律拒绝。`fidelity.yaml` 投影按 `mandatory_answers` 暴露每项应答状态（`observed | excluded | unresolved`）；未作答项不得呈现为 observed。骨架 `--init-source-graph` 输出附必答清单注释，起草时逐项作答。

## Mandatory question matrix — round 2（close-state-presentation-blind-spots）

在第一轮基础上追加（同一 fail-closed 语义，gaps 标签 `focus:` / `pane-scroll:` / `nav-anatomy:` / `nav-state:`）：

1. **交互控件 focus 处理**：scope.components 中命中交互控件名闭集（`button`、`icon-button`、`input`、`textarea`、`select`、`combobox`、`checkbox`、`switch`、`nav-item`、`menu-item`、`tabs`、`pagination`，或名称以 `-nav` / `-nav-item` 结尾）的组件，必须携带 `state_presentations`、`state: focus-visible` 的事实，property 至少覆盖 `border` 与 `shadow`（ring 机制）之一，值为 token-ref。机制缺失（只有颜色没有机制语义）视为未作答。
2. **in-card 导航列多窗格拓扑**：检测到导航列（round 1 第 2 条的结构性判定）的 scene 必须记录——根滚动语义（`root_scroll: none`，negative）、≥2 个不同 slot 上的 `scroll_block`（导航列 + 内容区各自滚动域）、导航列 `size: fill`（stretch）。
3. **导航列解剖与页面上下文状态**：必须记录 `anatomy` 事实（闭集语义 `icon-label | label-only`），以及 selected/hover/active 的 `background` token-ref。绑定哪个 surface token 是模板级决定，由 `tokens.yaml` 的命名与 role 映射表达，矩阵只做机制存在性检查。

作答方式与第一轮一致：facts 或指向目标 definition 的显式 exclusions。`fidelity.yaml` 的 `mandatory_answers` 覆盖以上全部条目。

## Mandatory question matrix — round 3（close-chrome-containment-and-interaction-blind-spots）

在第二轮基础上追加（同一 fail-closed 语义，gaps 标签 `chrome-containment:` / `chrome-separation:` / `state-decoration:` / `trigger-anatomy:`）。四问针对的是已被真实生成物证实丢失的四类事实：inset 壳内 header 的容器归属、侧栏分隔负空间、链接默认态文本装饰、选择类控件触发器解剖。

1. **chrome 容器归属**：shell scene 声明非 `flush` 的 `shell_variant` 且声明了 chrome slot（slot 名实例自声明）时，每个 chrome slot 必须携带 `container_role` 事实（layout_scenes facet，语义值为 `root` 或实例 surface 名）。chrome 在内容卡内还是卡外是布局形态决定，不得由采集沉默交给 Apply 默认。投影时 `container_role` 生成 fidelity region 的 `parent` 与对应 `contains` 关系（`region.<scene>.<slot>` 嵌套于 `region.<scene>.<container>`），并派生 `phase8:containment:` scenario。
2. **chrome 分隔负空间**：同一触发条件（非 `flush` variant + 已声明 chrome slot）下，每个 chrome slot 必须携带 `border` 事实（token-ref，或语义 `none` 且 `negative: true`）。「某 chrome 面自身无边框、分隔由内容面提供」是必须显式记录的否定性事实；缺失视为未作答，不得让 Apply 以组件库默认边框补位。
3. **链接默认态文本装饰**：scope.contexts 中名字含 `link` 的每个 context（context 词汇由 graph 声明，不设固定枚举），必须在 `state: default` 上携带 `text_decoration` 事实（`underline`，或 `none` 且 `negative: true`）。全局「链接无下划线」基线按 context 分别闭合，不得把单一 context 推广为全局规则。`underline` 这类正向语义标记 `negative: true` 一律拒绝（`NEGATIVE_FACT_INVALID`）；fidelity 侧对同 record 的 `text_decoration: underline` + negative fact 报 `FIDELITY_STATE_DECORATION_CONFLICT`。
4. **选择类控件触发器解剖**：scope 内名称命中 `select | combobox | dropdown | dropdown-menu` 的组件必须携带 `anatomy` 事实（component_geometry facet，闭集语义 `whole-trigger | split-trigger`）：`whole-trigger` 表示整行触发器是单一命中控件、尾随 affordance 图标只是其内部装饰（图标命中区属于触发器）；`split-trigger` 表示 affordance 是独立可点控件。该事实投影进 component geometry，Apply 不得发明与解剖相反的命中结构。

作答方式与前两轮一致：facts 或指向目标 definition（scene/component/context）的显式 exclusions；`fidelity.yaml` 的 `mandatory_answers` 覆盖以上全部条目。
