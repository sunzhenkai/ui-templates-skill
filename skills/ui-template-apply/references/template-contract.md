# Template Apply 消费契约

本文件只定义消费不变量；字段全集和 Authoring 语义由 `ui-template-author/references/package-format.md` 所有。

## 启动前 fail-closed 检查

1. 必须存在 `design-system.yaml`、`meta.yaml` 与 manifest `layers` 声明的全部 core 文件；若模板位于带 `INDEX.md` 的集合中，该模板 INDEX 状态必须是 `published`；`retired` 或缺行立即停止。
2. `design-system.yaml` 必须声明 `schema: design-system/v1` 与已知 `capability`（`tokens-only | ui-kit | page-system`）；未知 schema、未知 capability 或缺必填层立即停止。
3. 每个 token leaf 必须是含 `value`、适用 `unit` 与 `origin: source | computed | estimated | default` 的 record；出现 `observed` 或任意未知值即拒绝开始。
3a. legacy schema v2 输入只走显式迁移：v2 模板必须提供 `spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml` 且 `schema_version: 2` 可解析；`spec.md` 是设计规则入口，Non-negotiables 优先于一切映射。合法 v2 sidecar 无 sidecar 明确记录 `legacy-baseline`；未知 schema/profile 停止，不得按 v1 猜测。
4. checker 必须确认 token/evidence、coverage、rule ID、placement closure、primitive contracts、color_pairs 与 required contrast 可解析。验证失败的模板不得进入 Phase 0 complete。
5. 可选 `fidelity.yaml`：受支持 `repo-structural-v1` 进入 included/deferred/excluded；未知 schema/profile 停止并要求兼容升级，不得忽略 sidecar。无 chrome-complete sidecar 时不得把 layout 当 high / profile-verified。

四种合法 origin 的 `value` 都是确定性 expected：source 为来源声明，computed 为计算/实测，estimated 为可追踪估算，default 为 Authoring 明确补全。Apply 不因 estimated/default 自行换值；偏离必须在 `.ui-template-apply/01-token-map.yaml` 记录 rule ID、理由和用户确认。profile 的 `none`、non-wrap、non-shrink、无 shadow 等 negative facts 同样是 expected，不得被组件库默认值覆盖。

## 读取优先级

1. 模板 rule IDs（`core/rules.yaml` 的 Non-negotiables）优先。
2. `core/tokens.yaml` 是精确值唯一载体，expected 不从 prose 重算。
3. `fidelity.yaml`（若存在）定义 scene/slot/context 的 token 用法、区域关系、chrome composition（`shell_variant` / 有序 slots / anchors）和 negative facts；不复制精确值。
4. `core/layout.yaml` 若声明 `placement`，它是机器 topology 与 route Pattern closure 的权威；relation/order、scroll owner、responsive mode、region `parent`/`position` 和 `pattern_refs` 必须在 Phase 2 闭合。
5. `apply/`（若存在）只补阶段映射和取证方法，不能推翻设计规则或复制精确值。

发现冲突时，以较高层为准，在 Phase 9 记录 rule ID/裁决并创建 feedback；不得静默处理。

## 密度、图标、对比度与置顶是可执行 expected

- `variant_contracts` 的 `control_height`、`anatomy` 的 icon/label slots、`color_pairs` 对比度、typography 的 `line_height` 与 region `position` 与 token 值同为 expected。实现不得用组件库默认高度、默认无图标导航、临时前景/背景组合或自行决定 header 位置替代；这些字段在 `ui-kit`/`page-system` 模板里由 validator fail closed 保障，沉默即缺陷。
- 控件高度取 `size.control-height-*`，控件内文字取对应 typography step 与 `font.weight.*`；按钮、输入框、选择器、导航项的高度与文字组合必须能从 token 推导，推导不出的组合禁止落地。
- 置顶 chrome 按 placement 的 `parent` + `position: sticky` 实现；containment 校验（子 region bounding box 落在父 region 内）不通过的实现即失败。

## coverage decision

对目标平台、视口、主题、page mode、组件、状态逐项读取 coverage：

- observed：可按模板直接纳入；
- defaulted：实现前由用户决定 `accepted | deferred | excluded`；
- unsupported：只能 deferred/excluded，或先移交 Authoring 扩展模板；
- 未声明/重叠/未完整覆盖：模板无效，停止。

所有决定写入 `00-intake.md` 和 checkpoint scope。实现开始（Phase 5）前必须完成决定，不能靠缩小测试矩阵掩盖 coverage 缺口。

## evidence 与 rule ID

Apply 使用 evidence 审计来源，不用它覆盖 token。checkpoint 的 template name/version 必须与当前 meta `name`/`version` 一致，不能只校验 digest。verification/review/feedback 必须引用模板中存在的稳定 rule ID；feedback 只要含 targets 就必须提供完整规则上下文并逐项校验，且 evidence refs 必须相对 `.ui-template-apply/` 根存在、不越界。source revision、template digest、token digest、目标源码 revision 和 build identity 必须进入 checkpoint 与 Phase 8/9 记录；身份不一致的旧证据不可复用。
