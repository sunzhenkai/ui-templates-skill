## Purpose

定义统一 Design System Contract 的 breaking release、官方 catalog 切换、验收证据与回滚语义。

## ADDED Requirements

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
- **THEN**生产 `templates/` 与 catalog 不切换，candidate 保持可审查状态

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
