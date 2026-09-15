## ADDED Requirements

### Requirement: Evidence admission and recurrence consistency

统一 validator SHALL 在 package 与 active 校验中对声明准入与 recurrence 实施交叉校验，任一不一致 SHALL fail closed 并输出稳定错误码。

`design-system-evidence/v1` items SHALL 接受可选 `scope`（闭集 `surface | product`，缺省语义为 `surface`）、可选 `surface`（surface 标识）与可选 `recurrence_refs`（string 数组）字段。distinct surface 判定 SHALL 优先使用显式 `surface`，缺省回退到 `locator`。对 `origin` 为 `source` 或 `computed` 且 `kind` 不属于 `basis`/`default` 的 evidence 条目，validator MUST 要求 `locator` 与 `method`（或非空 `basis`）齐备，且 `target` 解析到已声明的 token 路径（含 group/leaf 与 `token/` 前缀）或 stable entity/rule id；缺失时报告 `CLAIM_ADMISSION_INCOMPLETE`。当 `scope` 为 `product` 时，`recurrence_refs` MUST 解析到 active evidence 且覆盖至少两个 distinct sampled surface；否则报告 `RECURRENCE_UNSUPPORTED`。`origin: default` 的条目 MUST 携带 `basis` 或 `decision_id`，但其不要求被引用。

#### Scenario: 缺 Consequence 的悬空证据

- **WHEN** 一条 `origin: source` 的 token evidence 的 `target` 不解析到任何已声明 token 路径或 stable entity/rule id
- **THEN** 校验以 `CLAIM_ADMISSION_INCOMPLETE` 失败并指出该 evidence id

#### Scenario: 缺少 Observation 或 Basis

- **WHEN** 一条 `origin: computed` 的 evidence 缺少 `locator`，或缺少 `method` 与非空 `basis`
- **THEN** 校验以 `CLAIM_ADMISSION_INCOMPLETE` 失败并指出缺失的证

#### Scenario: product scope recurrence 不足

- **WHEN** 一条 evidence 声明 `scope: product`，但其 `recurrence_refs` 少于两个 distinct surface，或全部指向同一 surface
- **THEN** 校验以 `RECURRENCE_UNSUPPORTED` 失败并指出该 evidence id

#### Scenario: 历史 package 缺 scope 字段

- **WHEN** 既有 package 的 evidence 省略 `scope`
- **THEN** validator 按 `surface` 处理，不因缺字段新增失败，既有 digest 与 stable identity 语义不变

#### Scenario: 合法 recurrence

- **WHEN** 一条 `scope: product` 的 evidence 在两个或以上 distinct sampled surface 的 active recurrence 证据上闭合
- **THEN** 校验通过，且该声明可作为 product scope 发布
