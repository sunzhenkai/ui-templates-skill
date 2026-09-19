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

Fact 只表达三个 facet：`layout_scenes`、`component_geometry`、`state_presentations`。identity 固定 `id/facet/subject/context/slot/state/property/rule_id`；实现投影 value 仍仅为 `token-ref` 或闭集 semantic（如 `none|zero|auto|intrinsic|fill|non-wrap|non-shrink|underline|visible|hidden|viewport|region|inline|block|horizontal|vertical|overlay|inset|flush` 及槽位 role / `"0"`–`"32"`）。如来源声明精确 CSS 值，value 可附 `observed: {kind: css-length|css-color, value: <非空字符串>}`：它是带 locator 的 source 观测，不是 package 的第二份 token 权威；Author 必须将其映射到 `tokens.yaml` 的 token-ref 后才能发布。layout property 另含 `shell_variant`、`slot_role`、`slot_order`、`anchor_role`。无任意可执行表达式、CSS class 或 framework primitive。negative semantic 必须显式 `negative: true`。shell usage 必须闭合 chrome composition，否则 `CHROME_COMPOSITION_INCOMPLETE`。

Locator 固定为 `<graph_path>#/<collection>/<stable-id>`；capture digest 针对 canonical literal node，不依赖 YAML 顺序或行号。来源 revision、scope、decisions、limits、graph digest、definitions/exports/imports/usages/exclusions/dynamic/facts/unresolved 共同进入 closure digest。

## 安全与确定性

Runtime 只对**本会话 session source root** 执行 `git rev-parse HEAD`；默认从该 root 读取 graph。调用方也可显式提供 source 外的 artifact root：graph 仍须为安全相对路径、内容 digest 与 source revision 一同进入 receipt，但 source checkout 不得被写入、暂存或提交。拒绝 absolute/traversal、symlink、`example/`、revision mismatch。禁止从已发布 `meta.sources[]`、sibling 或 `/tmp` 猜测该 root。它不导入来源模块，不执行 shell/package/编译器，不访问网络，也不把完整 AST/call graph/source snapshot 发布进模板。该有限子集无法表达的 repo 必须 fail unsupported/unresolved 或请求用户提供可信 literal graph，不能猜测。

## Mandatory question matrix（close-layout-fidelity-blind-spots）

closure 只证明 scope 内问题已闭合；本节问题由机器强制，沉默与未作答等价。`capture` 对 included scenes 逐项检查，缺失即抛 `MANDATORY_FACT_MISSING`（与 chrome composition 不完整同级 fail closed），不产出 `captured` receipt：

1. **inset 内容卡片**：shell scene 声明 `shell_variant: inset` 时，内容面（slot `page-canvas` 或 `canvas`）必须携带五项几何事实，每项为 token-ref、闭集语义或显式 negative——inset/margin（`gap`、`inset_*`、`padding_*` 任一）、`radius`、`border`、`shadow`、`background`。精确值仍由 `tokens.yaml` 唯一携带。高保真 geometry 记录仍须满足四向 padding 完整性（含显式 zero）。
2. **多分区页二级导航**：kind 为 `board | other` 的 included scene 必须有一个 `slot: section-nav` 的 usage 声明二级导航放置（卡内左列/顶部/无），或以 exclusions 条目显式回答。
3. **master-detail 分侧与上下文**：kind 为 `master-detail` 的 scene 必须在 `master-pane` 与 `detail-pane` 两个 slot 上各携带事实（分侧与次序），并声明 `context-panel` usage 或 exclusions。

**显式不知道的作答方式**：exclusions 条目的 locator 指向目标 scene definition（`<graph_path>#/definitions/<id>`，或保持自指 `<graph_path>#/exclusions/<id>`），reason 仍取闭集。指向不存在 definition 的 exclusions 一律拒绝。`fidelity.yaml` 投影按 `mandatory_answers` 暴露每项应答状态（`observed | excluded | unresolved`）；未作答项不得呈现为 observed。骨架 `--init-source-graph` 输出附必答清单注释，起草时逐项作答。

## Mandatory question matrix — round 2（close-state-presentation-blind-spots）

在第一轮基础上追加（同一 fail-closed 语义，gaps 标签 `focus:` / `pane-scroll:` / `nav-anatomy:` / `nav-state:`）：

1. **交互控件 focus 处理**：scope.components 中命中交互控件名闭集（`button`、`icon-button`、`input`、`textarea`、`select`、`combobox`、`checkbox`、`switch`、`nav-item`、`menu-item`、`tabs`、`pagination`，或名称以 `-nav` / `-nav-item` 结尾）的组件，必须携带 `state_presentations`、`state: focus-visible` 的事实，property 至少覆盖 `border` 与 `shadow`（ring 机制）之一，值为 token-ref。机制缺失（只有颜色没有机制语义）视为未作答。
2. **in-card section-nav 多窗格拓扑**：声明 section-nav usage 的 scene 必须记录——根滚动语义（`root_scroll: none`，negative）、≥2 个不同 slot 上的 `scroll_block`（导航列 + 内容区各自滚动域）、导航列 `size: fill`（stretch）。
3. **section-nav 解剖与页面上下文状态**：必须记录 `anatomy` 事实（闭集语义 `icon-label | label-only`），以及 selected/hover 的 `background` token-ref 且绑定 page-surface token（含 `sidebar` 的 token 路径不算作答）。

作答方式与第一轮一致：facts 或指向目标 definition 的显式 exclusions。`fidelity.yaml` 的 `mandatory_answers` 覆盖以上全部条目。
