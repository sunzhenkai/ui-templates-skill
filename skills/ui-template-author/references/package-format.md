# `design-system/v1` Package Format

`design-system/v1` 是 Author 的新建/更新发布产物。它只携带可复用设计语义；项目落地选择由 `binding.yaml` 表达，且 binding 永远不出现在 package 内。

## 目录

```text
templates/<name>/
├── design-system.yaml      # design-system/v1 manifest
├── meta.yaml               # design-system-meta/v1
├── core/
│   ├── tokens.yaml         # design-system-tokens/v1；精确值唯一权威
│   ├── primitives.yaml     # design-system-primitives/v1
│   ├── patterns.yaml       # design-system-patterns/v1
│   ├── page-types.yaml     # design-system-page-types/v1
│   ├── layout.yaml         # design-system-layout/v1
│   ├── rules.yaml          # design-system-rules/v1
│   └── evidence.yaml       # design-system-evidence/v1
├── measured-expectations.yaml  # optional；certification 产出的 oracle 锚定期望值集合
└── apply/                  # optional；仍技术栈无关
```

`meta.yaml` 声明 `schema: design-system-meta/v1` 和 `version`；`name/version` 必须等于 manifest `id/version`。

## Capability

| capability | 必填 core | 消费含义 |
| --- | --- | --- |
| `tokens-only` | tokens、rules、evidence | 只可映射主题与规则，不可声称页面能力 |
| `ui-kit` | tokens、primitives、rules、evidence | 可实施已声明 primitives |
| `page-system` | 七层全部 | 可支撑完整页面实施 |

manifest 里的 `layers` 只能声明 capability 范围内文件。缺层是 capability 边界；Apply 不得即兴补语义。

## Visual role tokens

`meta.yaml` 可增加 `visual_role_tokens`：产品级视觉角色（`canvas`、`surface`、`text-primary`…`status-danger`、`typography.heading/body/secondary` 的固定闭集）到本模板 token path 的映射。声明后它**整体替代**内置默认路径表（默认表是首个模板 workbench-shell 的命名，如 `color.app-shell`/`color.page-canvas`），但角色闭集仍 fail-closed：缺角色、全部候选 path 缺失、或只由 `default` origin token 满足，分别报 `VISUAL_ROLE_MISSING` / `VISUAL_ROLE_DEFAULTED`。token 命名与首个模板不同的新模板必须声明该字段才能通过 `--require-visual-role-closure`。

## Digest

- 每个 layer digest 是 `sha256-canonical-json-v1`，输入为 YAML/JSON 安全解析后的 canonical JSON。
- `contract_digest` 覆盖删除 `contract_digest` 字段后的 canonical manifest。
- `binding_digest` 和 projection digest 属于消费项目，Author 不得预填。
- `status: frozen` 时 manifest contract digest、全部 layer digest 和 projection digest 缺一即 fail closed。

## Stable IDs

跨文件身份固定为 `primitive/<slug>`、`pattern/<slug>`、`page-type/<slug>`、`token/<dotted-path>` 和 `rule/<NAMESPACE>-###`。展示名、YAML key、页面标题不是身份。published ID 不复用；替代时旧记录写 `retired`/`superseded` 并指向新 ID。

## Evidence admission

`core/evidence.yaml` 的每条 item 是声明准入的记录：

- `scope`（`surface | product`，缺省 `surface`）：声明适用范围。`product` 表示产品/站点级规则，必须由 `recurrence_refs` 支撑。
- `surface`（可选）：该证据所属的已采样 surface 标识（页面/scene/视口）。缺省时 validator 从 `locator` 推导 distinct surface。
- `recurrence_refs`（可选）：同 role 复现本声明的其他 evidence id。`scope: product` 时必须解析到 active evidence，且覆盖 ≥2 个 distinct surface，否则 `RECURRENCE_UNSUPPORTED`。

对 `origin: source | computed` 且 `kind` 不属于 `basis`/`default` 的 item，validator 要求 `locator`（Observation）与非空 `method`/`basis`（Basis）齐备，且 `target` 解析到已声明的 token 路径或 stable entity（Consequence）；缺失报 `CLAIM_ADMISSION_INCOMPLETE`。`origin: default` 的 item 需带 `basis` 或 `decision_id`，但豁免 Consequence。

## L0–L6 映射

| Authoring 变更标签 | package 目标 |
| --- | --- |
| L0 身份 | `design-system.yaml` + `meta.yaml` |
| L1 壳 / chrome | `core/layout.yaml` |
| L2 token | `core/tokens.yaml` + `core/evidence.yaml` |
| L3 scene / route | `core/layout.yaml` + `core/page-types.yaml` |
| L4 原子组件 | `core/primitives.yaml` |
| L5 复合组件 | `core/patterns.yaml` |
| L6 Apply 映射 | `apply/` |

变更集合仍按路径/组件冻结。未声明文件保持原字节。

## Primitive contracts

来源里能按 API 或调用点区分 `variant` / `size` 的交互控件，Author 不得把它们压平成一个 anonymous primitive。Primitives 层必须保留完整变体闭集；每个声明 variant 都要有 `variant_contracts` 条目，字段至少包含 `presentation`（`filled | outline | ghost | plain` 等闭集）、`radius` token、`control_height` token 和 focus 处理引用。hover / active 可用时也必须绑定 token。静止颜色同样是契约：`filled` 需 `background`+`foreground`，`outline` 需 `foreground`+`border`，`ghost`/`plain` 需 `foreground`（token 引用，可写 `token/color.x@10%` 表示透明度混合；某主题需不同 alpha 时写 `theme_overrides.<theme>`）；缺失报 `PRIMITIVE_CONTRACT_COLORS_MISSING`（warning，认证前必须补齐），否则各实现会各自猜测填充/描边。`button`、`nav-item`、`menu-item`、`tabs` 等可包含内容条目的 primitive 必须声明 anatomy slots（至少区分 icon 与 label；badge、shortcut、trailing 按来源补齐）与次序。缺失 contract、contract 指向未知 token/rule，或声明 variant 没有契约，都会在 Validate fail closed（`PRIMITIVE_CONTRACT_INVALID`）。`ui-kit`/`page-system` 下 `button`、`nav-item`、`menu-item`、`tabs` 完全沉默（无 `variant_contracts` 或无 icon/label `anatomy`）直接失败：`PRIMITIVE_CONTRACT_MISSING` / `PRIMITIVE_ANATOMY_MISSING`——沉默不是可移植契约，禁止用组件库默认样式填补 contract 沉默。

## Anatomy 闭合与图标基础层

`ui-kit` / `page-system` 包内**每个** primitive 必须声明 `anatomy[]`，或用 `anatomy_exempt: <理由>` 说明其为纯布局/容器（validator `PRIMITIVE_ANATOMY_UNDECLARED`；两者同时出现为 `PRIMITIVE_ANATOMY_CONFLICT`）。不再依赖固定名单——任何渲染内容的控件都要回答「里面有哪些槽位」。

- slot 词汇：`icon, label, badge, shortcut, trailing, avatar, count, status, chevron, checkbox, description, media, action, indicator`；`order` 唯一；`required`（默认 true）区分恒在与条件槽位；`content` ∈ `icon | text | image | number | kbd | indicator | control`；`size_ref` 指向 token（悬空即 `PRIMITIVE_ANATOMY_SIZE_DANGLING`）。
- 图标是基础层：任一槽位为 icon 时 tokens 必须有 `icon.library`（字符串）、`icon.stroke-width`（unitless）、`icon.size.default`（px/rem），可再加 `icon.size.sm` 等（`ICON_FOUNDATION_MISSING`）。
- DOM 约定：实现以 `data-primitive="<slug>"` 标 primitive 根、`data-slot="<slot>"` 标槽位，供 `check_anatomy_conformance.py` 机检。

## 多主题与交互 primitive

- **多主题**：`tokens.themes = {default, selector?, variants: {<name>: {selector?, overrides: {<token-path>: record}, shared?: [path]}}}`。基础 tokens 即默认主题；每个 variant 必须对**每个** `color.*` 给出 override 或列入 `shared`（`THEME_COVERAGE_INCOMPLETE`），override 路径必须存在（`THEME_OVERRIDE_DANGLING`），并有自己的 `color_pairs`（`theme: <name>`，按该主题值计算对比度；缺失即 `THEME_PAIRS_MISSING`）。源码自身未达标的对比度如实记录并在 reason 中标注，不得改源值。
- **交互 primitive**：overlay/disclosure 用 `interaction: {kind, trigger[], dismiss[], placement?, covers[]}` 声明打开/关闭方式；overlay 必须可 `escape` 关闭、states 含 `open`（`INTERACTION_*`）；`covers` 对应采集的 `interaction_inventory`。
- 槽位词汇新增 `progress`（进度环/条）与 `activity`（运行中/实时活动指示）。

## Tokens：结构化字阶、字重与对比度配对

- typography step 除 `value`/`unit` 外必须携带结构化 `line_height` 与 `line_height_unit`；来源声明字重时写入 `font.weight.*`（`unit: unitless`）。来源给出几步就声明几步，禁止只采三个代表值后让 Apply 猜中间档；`capability >= ui-kit` 时 validator 对缺 `line_height` 的 step 报 `TYPOGRAPHY_STEP_INCOMPLETE`，无字阶报 `TYPOGRAPHY_SCALE_MISSING`。
- 前景/背景配对写入 tokens 文件顶层 `color_pairs`（`foreground`/`background`/`min_ratio`，路径为 `token/` 前缀）。每条配对是可执行 contrast 断言：validator 解析两端颜色值并计算 WCAG 对比度，悬空报 `COLOR_PAIR_DANGLING`，值不可解析报 `COLOR_PAIR_UNRESOLVABLE`，低于 `min_ratio` 报 `COLOR_CONTRAST_TOO_LOW`。控件填充与文字色必须从声明配对中取用，不得临时组合。

## Placement topology

`core/layout.yaml` 的每个 route 可声明可选 `placement` scene。scene 使用 stable region/slot ID、semantic role、`contains | owns | horizontal | vertical | overlay` relation、sibling order、scroll domain 和 responsive mode 表达通用拓扑；`pattern_refs` 必须属于该 route 的 Page Type closure，`evidence_refs` 必须解析到 active evidence，quantitative geometry 只能引用 `token/` path。`slots`/`breakpoints` 散文可继续存在，但不是机器 placement constraint 的唯一权威。

page-system Generate-from-source 必须能闭合 topology、Page Type/Pattern identity 和 evidence；无法闭合时显式降级 capability 或停止，不得用 prose 或实现默认补齐。

`placementRegion` 可声明 `position`（`static | sticky | fixed`）。来源中的置顶 chrome（卡内 header、sticky 列表头）必须把容器事实投影为 `parent` 并记录 `position: sticky`；只写平级 region 等价于丢失嵌套，Apply 会把 chrome 实现到容器之外。弹窗适配（max 块向尺寸 + body 内部滚动域 + header/footer shrink）以 region + scroll domain + geometry（`max-block-size`）+ rule 表达。

## Package feedback

`design-system-feedback/v1` 的 `ownership` 固定为 `package`；`package` 记录 name/version/capability/contract digest；`targets` 只接受 Stable Entity ID；`evidence_refs` 必须能在授权 inbox 上下文内解析。项目 binding 缺口和 Apply skill 缺陷不得写入 package feedback。

## Gate

仓库内：

```bash
python3 scripts/validate_design_system.py validate <candidate-package> --kind package --json
python3 scripts/validate_design_system.py validate-feedback <feedback.yaml> --evidence-root <inbox> --json
```

安装态使用本 skill 的 discovery wrapper（它会启动 `runtime/shared_validate_design_system.py`，不得把 wrapper 写入 `UI_DESIGN_SYSTEM_VALIDATOR`）：

```bash
python3 runtime/validate_design_system.py validate <candidate-package> --kind package --json
```

指向 wrapper 会以 `VALIDATOR_SELF_INVOCATION` 失败；缺共享实现或 schema 为 `DESIGN_SYSTEM_VALIDATOR_MISSING`。任一 error 都停止 Index。candidate-only；production INDEX 只在用户显式确认的 publish/index gate 中更新。
