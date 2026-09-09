## ADDED Requirements

### Requirement: Official package certification evidence
官方 Template Package 的 publish、version upgrade 或 catalog replacement SHALL 附带通过的 Template Certification Gate 结果；结果 SHALL 绑定 candidate package digest、固定 Visual Oracle revision、固定 prompts digest、build identity 和全部必需 Pattern Equivalence Records。

#### Scenario: promotion request
- **WHEN** 用户请求把 certified candidate 切换到生产 catalog
- **THEN** release gate 校验认证结果与当前 candidate digest 一致后才允许切换

#### Scenario: candidate changed after certification
- **WHEN** candidate package、固定 prompts 或 oracle revision 在认证后变化
- **THEN** 旧认证结果过期，release gate 阻止 promotion 并要求重新认证
