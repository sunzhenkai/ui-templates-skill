## MODIFIED Requirements

### Requirement: Official package certification evidence
官方 Template Package 的 publish、version upgrade 或 catalog replacement SHALL 附带通过的 Template Certification Gate 结果；结果 SHALL 绑定 **被提升** package 的 id、version 与 contract digest、固定 Visual Oracle revision、固定 prompts digest、build identity 和全部必需 Pattern Equivalence Records。promotion guard SHALL 校验报告状态字段与认证 schema 的取值一致（`passed | failed` 与独立的 accepted 标记不得互为条件），并 SHALL 校验 catalog 与生产模板库一致；`build` 打包前 SHALL 拒绝携带过期或不一致的 catalog 副本。

#### Scenario: promotion request
- **WHEN** 用户请求把 certified candidate 切换到生产 catalog
- **THEN** release gate 校验认证结果与当前 candidate digest 一致后才允许切换

#### Scenario: candidate changed after certification
- **WHEN** candidate package、固定 prompts 或 oracle revision 在认证后变化
- **THEN** 旧认证结果过期，release gate 阻止 promotion 并要求重新认证

#### Scenario: 认证绑定到其他版本
- **WHEN** catalog 待提升的 package version 或 contract digest 与认证报告绑定的不一致
- **THEN** promotion 以 `CERTIFICATION_PACKAGE_MISMATCH` 失败，不得以旧版本的认证结果放行

#### Scenario: 状态字段不一致
- **WHEN** promotion guard 以认证 schema 不可能取到的状态值作为通过条件
- **THEN** guard 自身判定为无效实现，测试必须以 `CERTIFICATION_STATUS_INVALID` 覆盖并阻断发布

#### Scenario: catalog 与生产库漂移
- **WHEN** 生产模板库的 published package 与 catalog 副本不一致
- **THEN** `build` 拒绝打包并以 `CATALOG_STALE` 报告不一致文件，不得静默发布旧 catalog
