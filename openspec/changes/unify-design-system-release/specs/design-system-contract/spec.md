## ADDED Requirements

### Requirement: Current release compatibility range
Release `3.0.0` SHALL 声明 `design-system/v1` 为当前 contract family，`schema/v2 template` 与 `design-freeze/v1` 为 migration-only source；两者 SHALL 不作为当前发布格式被默认消费。

#### Scenario: 当前 package 校验
- **WHEN** bundle `3.0.0` 校验 published package
- **THEN** 当前路径使用 `design-system/v1`，并记录 capability 与 contract digest

#### Scenario: 旧格式输入
- **WHEN** runtime 遇到 schema v2 template 或 design-freeze v1
- **THEN** 默认消费停止，并提供显式 migration source 入口

#### Scenario: 未知 family
- **WHEN** 输入声明其他 schema family
- **THEN** fail closed 并报告当前支持范围
