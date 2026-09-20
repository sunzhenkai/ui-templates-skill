## ADDED Requirements

### Requirement: Placement containment closure

Placement topology 的嵌套语义 SHALL 闭合：region `parent` 引用必须指向已声明 region（dangling fail closed）；`contains`/`owns` 边的 from SHALL NOT 与目标 region 声明的 parent 矛盾。fidelity sidecar 与 `core/layout.yaml` placement 两侧 SHALL 执行同一闭环检查。声明了 `parent` 的 route SHALL 派生确定性 Phase 8 containment scenario（`phase8:containment:<scene>:<region>:in:<parent>` 与 `phase8:placement-containment:<layout>:<region>:in:<parent>`），断言子 region bounding box 落在父 region 内。

#### Scenario: contains 边与 parent 矛盾

- **WHEN** layout placement 声明 `region.header.parent = region.canvas`，但 relations 含 `contains from region.root to region.header`
- **THEN** validator 报 `PLACEMENT_CLOSURE_INVALID`（v1）或 `FIDELITY_CONTAINMENT_CONFLICT`（sidecar）

#### Scenario: 嵌套拓扑派生 scenario

- **WHEN** fidelity scene 或 core layout placement 的 region 声明 `parent`
- **THEN** `derive_scenario_ids` 输出对应的 containment scenario ID，Phase 8 按其 fail closed

#### Scenario: 存量平级拓扑兼容

- **WHEN** placement regions 全部未声明 `parent`
- **THEN** 不产生 containment 错误，也不派生 containment scenario
