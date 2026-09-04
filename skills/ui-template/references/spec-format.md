# UI 模板格式契约（schema v2）

本文是 `ui-template` 对 `templates/<name>/` 公开数据契约的 prose 权威；机器结构以 `schemas/template/v2/*.schema.json` 为准。两者冲突时不得任选其一发布，必须先修复漂移。Apply 只消费本契约，不反向定义格式。

## 目录与所有权

```text
templates/<name>/
├── spec.md                 # 设计规则入口，开篇为 Non-negotiables
├── tokens.yaml             # 精确值唯一载体
├── meta.yaml               # 身份、来源、置信度、coverage
├── evidence.yaml           # token/default/asset provenance
├── fidelity.yaml           # 可选 compatible sidecar；repo Authoring 新建/更新时总是生成 receipt
├── assets/                 # 可选，仅放许可允许且已完成隐私处理的资产
├── components.md           # 可选，设计层组件契约
├── platforms/*.md          # 可选，平台设计差异
├── routes-and-layouts.md   # 可选，页面模式/路由/布局设计规则
└── apply/
    ├── playbook.md         # 存在 apply/ 时必需：阶段映射、gate、取证引用
    └── quality.md          # 可选：rule ID → 检查方法
```

`implementation/` 已移除并禁止。模板内也禁止 stack adapter、框架/依赖清单、runnable starter、源码/项目目录契约、API/mock/data 分层、状态库选型及具体消费项目业务结构。这些决定只属于消费项目 `.ui-template-apply/03-structure.md`。

## 必备 envelope

`meta.yaml`、`tokens.yaml`、`evidence.yaml` 都必须声明 `schema_version: 2`；`meta.yaml` 另须声明 SemVer `template_version`。未知或缺失 schema 必须 fail closed，不得按 v1 猜测。v1 只能通过显式迁移器生成候选和报告。

## `spec.md` 与稳定规则 ID

`spec.md` 保持以下设计层骨架：0 Non-negotiables、整体风格、配色角色、字体、间距与布局、组件契约、可选特征、还原要点。它解释用途和行为，但不复制 `tokens.yaml` 的精确值。

跨文档或机器证据引用的规则必须定义稳定 ID，定义语法为 `[ID]`，引用语法为 `@ID`：

- `NN-###`：不可协商规则；
- `TOKEN-###`、`LAYOUT-###`、`ROUTE-###`、`AX-###`、`RESP-###`、`QUALITY-###`：对应领域规则。

ID 在整个模板内唯一。按各命名空间单调分配；删除后永不复用。规则被替代时保留旧 ID 的 retired/superseded 说明并指向新 ID；不得静默改写历史 evidence、feedback 或 verification 中的引用。`apply/`、quality matrix、verification 与 feedback 只引用 ID，不复制规则数值。

## `tokens.yaml`

每个可消费 leaf 都是统一 record：

```yaml
schema_version: 2
themes:
  light:
    background: {value: "#ffffff", origin: source}
typography:
  scale:
    body: {value: 14, unit: px, origin: source}
spacing:
  allowed: {value: [4, 8, 12, 16], unit: px, origin: computed}
```

硬性要求：

- `value` 非空，`origin` 仅为 `source | computed | estimated | default`。
- 有量纲数值必须声明 `unit`；闭集为 `px | rem | em | % | ms | s | deg | ratio | unitless`。scalar numeric 与包含 numeric 的同单位 list 都须有 unit；复合 map 的 numeric 成员使用 `{value, unit}`，不得用裸 numeric 绕过。
- list/map 必须放在 record 的 `value` 中；不允许裸 scalar/list/map token leaf。
- 来源缺口回填确定的 `default`，并在 evidence 写 basis 或 decision ID；不得留空、给区间或交给 Apply 即兴选择。
- 双主题角色键必须一致。颜色、字体、字号、间距、圆角、阴影、动效等精确值只在本文件维护。

## `meta.yaml`

最小语义如下（完整字段闭集以 schema 为准）：

```yaml
schema_version: 2
template_version: 2.0.0
name: example
description: 一句话设计描述
sources:
  - id: source-001
    type: web # web | repo | image | doc
    ref: https://example.invalid
    revision: response-etag-or-content-digest
    captured_at: 2026-09-03T00:00:00Z
captured_at: 2026-09-03
tokens: tokens.yaml
evidence: evidence.yaml
platforms: [web]
confidence: {overall: medium, layout: high, visual: medium, components: medium}
coverage:
  platforms: {declared: [web], observed: [web], defaulted: [], unsupported: []}
  viewports: {declared: [desktop], observed: [desktop], defaulted: [], unsupported: []}
  themes: {declared: [light], observed: [light], defaulted: [], unsupported: []}
  page_modes: {declared: [collection], observed: [collection], defaulted: [], unsupported: []}
  components: {declared: [button], observed: [button], defaulted: [], unsupported: []}
  states: {declared: [default, focus-visible], observed: [default], defaulted: [focus-visible], unsupported: []}
```

每个 coverage dimension 的 `declared` 必须被 `observed/defaulted/unsupported` 恰好覆盖，三者互斥；`platforms` 与 `coverage.platforms.declared` 相等。`overall` 不高于 layout/visual/components 中最弱的必需维度。Apply 对 defaulted/unsupported 项必须在实现前作 accepted/deferred/excluded 决定。

## `evidence.yaml`

每个 token path 必须恰有一条 active evidence；历史记录用 `status: superseded` 保存，并由其 `supersedes` 向前指向同 kind/path 的唯一 active replacement，不得悬空、自引用或成环。

```yaml
schema_version: 2
entries:
  - id: evidence-theme-background
    kind: token
    path: themes.light.background
    origin: source
    method: computed-style
    source_id: source-001
    source_revision: etag-or-digest
    locator: "GET / + body background-color"
    artifact: assets/page-redacted.png
    status: active
    confidence: high
    captured_at: 2026-09-03T00:00:00Z
  - id: evidence-focus-default
    kind: default
    path: focus.ring
    origin: default
    basis: 来源未展示键盘焦点；采用可见且满足对比度门禁的模板默认决策
    decision_id: DEFAULT-FOCUS-001
    status: active
    confidence: medium
    captured_at: 2026-09-03T00:00:00Z
```

`source/computed/estimated` evidence 必须记录 `source_id`、与 meta 一致的 `source_revision`、`locator`、`method`、时间和 confidence；可用 `artifact` 指向本地佐证。`default` 必须记录 `basis` 或 `decision_id`，不得伪造 source。

每个实际 `assets/` 文件还须有 `kind: asset` evidence，并记录 `license`、`redistribution: allowed | prohibited | not-applicable`、`redaction: none | applied | required | not-applicable`。禁止分发或仍需脱敏的资产不得留在模板中。

## optional compatible `fidelity.yaml`

`fidelity.yaml` 使用独立 schema family；支持的 v1 profile 为 `repo-structural-v1`。它只机器表达三类 source-derived observable：

1. `layout_scenes`：region/relation、arrangement、fill/shrink/wrap、按轴 scroll domains、overlay scope/anchor、responsive mode；
2. `component_geometry`：component/slot 的逻辑方向 padding/gap/inset/size/radius/surface/border/shadow token refs 或闭集 semantic；
3. `state_presentations`：subject/context/state/surface 的背景/文字/边界、decoration、visibility/container presentation，并把 `none` 等 negative fact 作为 expected。

权威按职责分区，而非互相复制：`spec.md` 定义设计意图、Non-negotiables 与稳定 rule identity；`tokens.yaml` 唯一携带精确值；`fidelity.yaml` 定义 scene/component slot/context/state 中的 token usage、关系、status、negative facts 与 direct provenance；split docs 只做人类解释并引用 rule/profile record IDs；`apply/` 只定义 Phase 0–9 映射、取证方法和通过条件。跨职责悬空或越权即失败，不由 Apply 按 prose 优先级猜测。

repo 新建/更新默认 structural；用户明确 style-only 时 sidecar 记录理由且三类 records 为空。合法 core v2 无 sidecar 是 `legacy-baseline`，并非 style-only；未知 schema/profile fail closed。profile canonical semantics 纳入 template identity。已发布模板的 `meta.sources[]` 只证明出处，不要求原仓库仍在本地；无 session source 时不得为补 sidecar 向用户索要历史路径。

**Profile v1 Non-Goals：**不发布完整 AST/call graph/source snapshot，不成为通用 UI/component DSL，不规定 React/Vue/Tailwind、组件库、DOM、CSS class、工程目录、依赖、API/data/state 或 runnable starter，不要求目标源码/DOM 同构。所有精确数值仍只在 `tokens.yaml`。

## optional `apply/`

`apply/` 只归模板 Authoring 所有，只描述：模板步骤如何映射通用 Apply Phase 0–9、某个 rule/profile record ID 在何处/如何取证、通过条件是什么。页面模式、布局、断点、URL、组件语义属于设计规则，应在根设计文档定义；`apply/` 只能引用它们，不重新定义 expected。

## Authoring 完整性

Generate 在本次从源导入的 staging 至少生成四个 core 文件；有 session source 的 repo 来源另生成适用 sidecar 与 capture receipt，并补齐 evidence/coverage/rule ID。Validate 必须聚合 core/profile schema、语义、对比度、来源身份、links、INDEX 候选和禁入内容。structural Generate-from-source 才对该 session source 要求 replay；已发布模板无 session source 时 portable 通过即可，replay `not-run` 合法。Eval 在从源导入时验证 capture reproducibility 与 Authoring contract。只有本次从源路径的 capture/replay/reproducibility/eval 全部成功后才允许原子更新 production `templates/INDEX.md`；失败保持其 digest 不变。具体顺序与 report API 见 `../SKILL.md` 和 [authoring-report.md](authoring-report.md)。
