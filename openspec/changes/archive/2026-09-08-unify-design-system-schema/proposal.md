## Why

Author、Design、Apply 当前分别依赖 schema v2 template 与 design-freeze v1，语义真相分裂且靠投影弥补。需要先冻结统一的 `design-system/v1` 机器契约和单一 validator，才能安全改造三个公开 skill。

## What Changes

- 新增 `design-system/v1` manifest、七层 portable core、project binding、Token Projection、migration receipt 和 vendor manifest 的 schema family。
- 新增 `design-system/v1` 的 canonical digest、Stable Entity ID、引用闭合、capability、freeze 状态与 fail-closed 校验规则。
- 新增统一 `scripts/validate_design_system.py` 验证入口，供 Author、Design、Apply runtime 复用；本子 change 不移除 schema v2 消费能力。
- 新增 contract、migration、capability 和 vendor manifest 的治理 fixtures 与 deterministic eval。

## Capabilities

### New Capabilities

- `design-system-contract`: 统一 Design System Contract 的机器结构、身份、引用、迁移和验证行为。

### Modified Capabilities

## Impact

- 新增 `schemas/design-system/v1/`、`scripts/validate_design_system.py`、fixtures 和 contract evals。
- 影响 `tests/`、`scripts/template_validation/`、三个 skill 的后续 runtime，但本子 change 不改生产 skill 正文或既有发布行为。
- 这是 `unify-design-system-*` 序列的公共依赖；后续四个子 change 依赖其 schema 与 validator。
