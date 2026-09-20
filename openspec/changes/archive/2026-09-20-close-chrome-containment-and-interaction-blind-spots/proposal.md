# Proposal: close-chrome-containment-and-interaction-blind-spots

## Why

对 workbench-shell 重建 example web 与 source 的逐项对比证实了四个视觉/交互缺陷，全部能追溯到 author → design system → apply 链路的机制盲区，而不是单点实现失误：

1. **header 悬在内容卡外**：source 的 page header 位于 inset 卡（SidebarInset）内部；采集协议只有平级 `slot_role/slot_order`，`facts_to_fidelity` 把 relations 硬编码为「root contains 一切」，嵌套语义全链路无载体，Apply 忠实实现了平级结构。
2. **侧栏凭空多出 1px 边框**：source 的 inset 侧栏零边框、分隔全靠 canvas 的 ring+圆角+inset；「侧栏无边框」这一否定性事实不在必答矩阵，Apply 以组件库默认补位。
3. **下拉 chevron 点不动**：workspace 切换器的 chevron 图标中心落在 `<select>` 矩形之外，`pointer-events-none` 穿透到无关元素；select/combobox 没有任何触发器结构契约（`whole-trigger | split-trigger`），schema 无处可写、采集无人必答、Phase 8 无 scenario 可抓。
4. **链接静息下划线**：source 由全局 preflight 使链接默认无下划线、逐处 opt-in hover 下划线；模板只有一句自然语言规则，且 fidelity 存量记录 `state.nav-link...default.item` 自相矛盾（`text_decoration: underline` 同时登记为 negative fact）——错误期望恰好被生成物的错误实现满足，门禁形同虚设。该矛盾记录同时与 `rule/QUALITY-103` 冲突而無任何交叉校验。

## What Changes

- **必答矩阵第三轮（close-chrome-containment-and-interaction-blind-spots）**：四问 fail closed——① inset 壳内 `page-header`/`page-toolbar` 的 `container_role`（root/page-canvas/canvas）；② inset 壳 `nav-group` slot 的 `border` 事实（token-ref 或 `none` negative）；③ 每个 included link context 的 default 态 `text_decoration`；④ `select/combobox/dropdown/dropdown-menu` 组件的 `anatomy`（`whole-trigger | split-trigger`）。沉默与未作答等价（`MANDATORY_FACT_MISSING`）。
- **嵌套投影**：fact 模型新增 `container_role` property 与 `root/whole-trigger/split-trigger` 语义值；`facts_to_fidelity` 把 `container_role` 投影为 fidelity region 的 `parent` 与对应 `contains` 边；`anatomy` 投影进 component geometry properties。fidelity sidecar schema 的 region 增加 `parent`，geometryProperties 增加 `anatomy`。
- **矛盾拒绝**：正向语义（如 `underline`）标 `negative: true` 在 capture 层拒绝（`NEGATIVE_FACT_INVALID`）、投影层抛错；v1/v2 validator 对 sidecar 的 `underline`+negative 自相矛盾报 `FIDELITY_STATE_DECORATION_CONFLICT`；region `parent` 悬空与 contains/owns 边与 parent 冲突 fail closed（`FIDELITY_REGION_PARENT_DANGLING` / `FIDELITY_CONTAINMENT_CONFLICT` / v1 `PLACEMENT_CLOSURE_INVALID`）。
- **Apply 消费面**：Phase 2 placement 消费把嵌套拓扑（parent/contains 树）列为硬约束，模板未声明的边框/分隔进入 unresolved；Phase 4 选择类控件按 anatomy 实现触发器、链接静息装饰消费 default 态 presentation；Phase 8 scenario 派生新增 containment（`phase8:containment:` / `phase8:placement-containment:`），quality-gates 增加「affordance 命中区」与「链接装饰基线」验证域。
- **存量数据修正**：`templates/workbench-shell/fidelity.yaml`（及 catalog 副本）的自相矛盾记录修正为 `text_decoration: none` + negative，方向与 `rule/QUALITY-103` 及 source 事实一致。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `structural-fidelity-profile`: 新增「必答矩阵第三轮」与「嵌套拓扑投影」requirements。
- `design-system-placement-closure`: 新增「Placement containment closure」（parent/边一致性与 containment scenario 派生）requirement。
- `design-system-implementation`: 新增「Placement containment consumption」「Trigger hit-area follows anatomy」「Link baseline from default-state presentation」requirements。

## Impact

- **代码面**：`scripts/template_authoring/{chrome,capture,profile}.py`、`scripts/template_validation/fidelity.py`、`scripts/validate_design_system.py`、`scripts/template_apply_state/fidelity.py` 及其在 `skills/ui-template-author/runtime`、`skills/ui-template-apply/runtime`、`skills/ui-template-design/runtime` 的镜像；`schemas/template/fidelity/v1/fidelity.schema.json`。
- **文档面**：`skills/ui-template-author/references/{repo-capture-format,extraction-layers}.md`、`skills/ui-template-apply/references/{apply-workflow,quality-gates}.md`。
- **兼容性**：parent/边一致性检查只对显式声明 parent 的结构生效（存量平级模板不受影响）；v1 sidecar 语义检查为新增面，唯一存量命中即上述矛盾记录并已同步修正。模板 `fidelity.yaml` 修正会改变 sidecar profile digest，既有 apply checkpoint 的 fidelity 绑定将过期并按恢复规则从 Phase 0 重开，属预期行为。
- **非目标**：不重采 workbench-shell（从源更新与 certification 重认证、模板 promotion 均需用户单独发起，见下）；不改七层 core 契约 digest 语义；不重写 immutable history。`make validate` 既有 `CERTIFICATION_STALE`（candidate 认证报告过期，先于本 change 存在）不在本 change 修复面内。
- **后续（需用户单独确认）**：按新矩阵从 multica session source 重采 workbench-shell（补四类 facts、重投影嵌套拓扑、更新 `core/layout.yaml` regions parent 与分隔规则），过 authoring gate 与 Template Certification Gate 后 promotion；再以 ui-template-test 干净模式重建 example web 验证四缺陷消失。
