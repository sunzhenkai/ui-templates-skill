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

Fact 只表达三个 facet：`layout_scenes`、`component_geometry`、`state_presentations`。identity 固定 `id/facet/subject/context/slot/state/property/rule_id`；value 仅为 `token-ref` 或闭集 semantic（如 `none|zero|auto|intrinsic|fill|non-wrap|non-shrink|underline|visible|hidden|viewport|region|inline|block|horizontal|vertical|overlay|inset|flush` 及槽位 role / `"0"`–`"32"`）。layout property 另含 `shell_variant`、`slot_role`、`slot_order`、`anchor_role`。无任意数字、CSS class、framework primitive 或 executable expression。negative semantic 必须显式 `negative: true`。shell usage 必须闭合 chrome composition，否则 `CHROME_COMPOSITION_INCOMPLETE`。

Locator 固定为 `<graph_path>#/<collection>/<stable-id>`；capture digest 针对 canonical literal node，不依赖 YAML 顺序或行号。来源 revision、scope、decisions、limits、graph digest、definitions/exports/imports/usages/exclusions/dynamic/facts/unresolved 共同进入 closure digest。

## 安全与确定性

Runtime 只对**本会话 session source root** 执行 `git rev-parse HEAD`，随后读取 graph 数据；拒绝 absolute/traversal、symlink、`example/`、revision mismatch。禁止从已发布 `meta.sources[]`、sibling 或 `/tmp` 猜测该 root。它不导入来源模块，不执行 shell/package/编译器，不访问网络，也不把完整 AST/call graph/source snapshot 发布进模板。该有限子集无法表达的 repo 必须 fail unsupported/unresolved 或请求用户提供可信 literal graph，不能猜测。
