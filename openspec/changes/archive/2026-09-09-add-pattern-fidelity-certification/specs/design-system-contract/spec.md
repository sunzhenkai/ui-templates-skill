## ADDED Requirements

### Requirement: Component Family derivation and closure
`page-system` 和 `ui-kit` package SHALL 能从 `Page Type → Pattern → Primitive` 的 Stable Entity ID 引用关系与 evidence 推导 Component Family 闭集；validator SHALL 校验引用存在、ID 唯一、evidence 可解析，并报告悬空、重复、缺证据或 capability 不足。Component Family SHALL 不引入手工第八层清单。

#### Scenario: derive family closure
- **WHEN** validator 读取一个引用闭合且 evidence 完整的 page-system package
- **THEN** 它输出每个 page type 依赖的 Pattern 与 Primitive 闭集，并保持 Stable Entity ID 不变

#### Scenario: dangling pattern reference
- **WHEN** page type 引用未声明的 pattern
- **THEN** validator fail closed 并报告引用位置与目标 ID

#### Scenario: family member lacks evidence
- **WHEN** candidate 的 family 成员没有可解析 evidence 或 provenance 身份
- **THEN** validator 拒绝将其纳入 published Component Family
