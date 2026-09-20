## ADDED Requirements

### Requirement: 必答矩阵第三轮（chrome 容器归属、分隔负空间、默认态装饰、触发器解剖）

Mandatory question matrix 第三轮对 included scenes/components/contexts 机器强制四问，沉默与未作答等价（`MANDATORY_FACT_MISSING`），可用 facts 或指向目标 definition 的显式 exclusions 作答：

1. shell scene 声明 `shell_variant: inset` 且声明 `page-header`/`page-toolbar` slot 时，每个此类 slot 必须携带 `container_role` 事实（闭集语义 `root | page-canvas | canvas`）。
2. shell scene 声明 `shell_variant: inset` 且声明 `nav-group` slot 时，`nav-group` 必须携带 `border` 事实（token-ref，或 `none` 且 `negative: true`）。
3. scope.contexts 中命中链接 context 闭集的每个 context 必须在 `state: default` 上携带 `text_decoration` 事实（`underline`，或 `none` 且 `negative: true`）。
4. scope 内名称命中 `select | combobox | dropdown | dropdown-menu` 的组件必须携带 `anatomy` 事实（闭集语义 `whole-trigger | split-trigger`，component_geometry facet）。

`fidelity.yaml` 的 `mandatory_answers` 覆盖以上全部条目。

#### Scenario: 卡内 header 容器归属沉默

- **WHEN** inset shell scene 声明了 `page-header` slot 但无 `container_role` 事实
- **THEN** capture 报 `chrome-containment:<scene>` 必答缺失，receipt 不为 `captured`

#### Scenario: 侧栏分隔负空间沉默

- **WHEN** inset shell scene 声明了 `nav-group` slot 但无其 `border` 事实
- **THEN** capture 报 `chrome-separation:<scene>` 必答缺失

#### Scenario: 链接默认态装饰沉默

- **WHEN** scope.contexts 含 `navigation-link` 且无 default 态 `text_decoration` 事实
- **THEN** capture 报 `state-decoration:navigation-link` 必答缺失；hover 态事实不构成作答

#### Scenario: 选择类控件触发器解剖沉默

- **WHEN** scope.components 含 `select` 且无 `whole-trigger | split-trigger` anatomy 事实
- **THEN** capture 报 `trigger-anatomy:select` 必答缺失

### Requirement: 嵌套拓扑投影与矛盾拒绝

`container_role` 事实 SHALL 投影为 fidelity layout scene region 的 `parent` 与对应 `contains` 关系（`container_role: root` 保持平级）；`anatomy` 事实 SHALL 投影进 component geometry properties。正向语义值（如 `underline`）标记 `negative: true` SHALL 在 capture（`NEGATIVE_FACT_INVALID`）与投影两层拒绝；sidecar 中同一 state presentation 的 `text_decoration: underline` 与 negative fact 并存 SHALL fail closed（`FIDELITY_STATE_DECORATION_CONFLICT`）；region `parent` 悬空、contains/owns 边 from 与声明 parent 不一致 SHALL fail closed（`FIDELITY_REGION_PARENT_DANGLING` / `FIDELITY_CONTAINMENT_CONFLICT`）。

#### Scenario: 容器归属投影为嵌套

- **WHEN** 采集图含 `page-header` slot 的 `container_role: page-canvas` 事实
- **THEN** fidelity scene 中 `region.<scene>.page-header` 带 `parent: region.<scene>.page-canvas`，且 relations 含 `contains from page-canvas to page-header`

#### Scenario: 正向语义标 negative 被拒绝

- **WHEN** 采集图某 fact 为 `text_decoration: underline` 且 `negative: true`
- **THEN** capture 以 `NEGATIVE_FACT_INVALID` 拒绝该 graph

#### Scenario: sidecar 装饰自相矛盾被拒绝

- **WHEN** fidelity sidecar 某 state presentation `text_decoration: underline` 且 negative_facts 含 `text_decoration`
- **THEN** validator 报 `FIDELITY_STATE_DECORATION_CONFLICT`
