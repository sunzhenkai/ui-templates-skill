## Purpose

定义统一 Design System Contract 的 breaking release、官方 catalog 切换、验收证据与回滚语义。

## Requirements

### Requirement: Breaking release atomicity
统一格式切换 SHALL 在 bundle `3.0.0` 中同步更新 compatibility、distribution manifest、三个 public skill、官方 package、迁移入口和派生文档；禁止出现最新 skill 只能消费未发布格式、或 catalog 主线同时保留 schema v2 与 design-system v1 的状态。

#### Scenario: 读取 release manifest
- **WHEN** 用户读取 bundle `3.0.0` 的 compatibility 与 distribution metadata
- **THEN** 当前 template contract family 为 `design-system/v1`，三个 public skill 版本一致为 `3.0.0`

#### Scenario: 部分切换失败
- **WHEN** catalog、manifest 或任一 public skill 未完成切换
- **THEN** release gate 失败，不得发布 bundle `3.0.0`

### Requirement: Official package migration evidence
`workbench-shell` SHALL 先迁移为 candidate package，并生成无 unresolved/errors 的 migration receipt；candidate SHALL 通过统一 validator、相关 eval 和真实重生验收后，才允许用户单独确认发布到生产 catalog。

#### Scenario: 官方迁移通过
- **WHEN** schema v2 workbench-shell 迁移为 design-system v1 candidate
- **THEN** receipt 记录两个 source identity/digest 与 target digest，且 unresolved/errors 为空

#### Scenario: candidate 未确认发布
- **WHEN** migration 通过但用户未请求 publish
- **THEN** 生产 `templates/` 与 catalog 不切换，candidate 保持可审查状态

### Requirement: Reproducible release evidence
Release SHALL 保留两次干净 bundle build 的 checksum 对比、四类 contract fixture 结果、bootstrap 与 increment 各一次干净重生证据、vendor audit 和五条固定治理命令结果；缺失、过期或以 `example/**` 代替的证据 SHALL 阻止 release。

#### Scenario: bundle 双构建
- **WHEN** 相同 source tree 连续执行两次 `make bundle`
- **THEN** bundle manifest 与 checksum 稳定一致

#### Scenario: bootstrap and increment acceptance
- **WHEN** page-system fixture 分别执行干净 bootstrap 与 scoped increment
- **THEN** 两者都有 Active Instance digest、change set、current-build 证据和未声明路径原字节证明

### Requirement: Rollback boundary
Bundle `3.0.0` SHALL 提供回滚到上一个已发布 bundle 的说明与 checksum；回滚 SHALL 恢复旧 skill 与旧 catalog 副本，但 SHALL NOT 自动重写已迁移消费项目的 Active Instance 或生成物。

#### Scenario: 回滚 bundle
- **WHEN** 用户按 rollback 说明恢复上一版本
- **THEN** 安装产物回到已知 checksum，迁移 candidate 与项目 active 状态不被静默销毁

#### Scenario: 新项目使用旧 bundle
- **WHEN** 回滚后创建新 Apply
- **THEN** 消费者看到旧 schema 支持边界，并被显式引导，而不是混合读取新格式

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
