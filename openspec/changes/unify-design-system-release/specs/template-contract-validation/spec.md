## MODIFIED Requirements

### Requirement: 版本化模板 schema
每个当前发布模板 SHALL 声明受支持的 `design-system/v1` contract family、contract version 和 package capability。当前发布路径 SHALL 定义 manifest、七层 core、optional binding、optional `apply/` 及拆分设计文档的结构、闭集枚举和引用关系；schema v2 template SHALL 只作为显式 migration source，未知 version 或未知 family SHALL 被明确拒绝。

#### Scenario: 读取 design-system v1 package
- **WHEN** 模板声明 design-system v1 且所有 capability 必需文件与字段存在
- **THEN** validator 按 v1 契约验证，消费者可读取明确的 contract family、版本、capability 和兼容信息

#### Scenario: 读取 schema v2 模板
- **WHEN** 模板声明 schema v2
- **THEN** 当前发布 runtime 将其识别为 migration-only source，不直接进入 published 消费路径

#### Scenario: 缺少或未知 contract version
- **WHEN** 模板未声明 contract family/version 或声明消费者不支持的 version
- **THEN** validator 和消费者均 fail closed，并报告支持范围与迁移入口

#### Scenario: 缺少或未知 schema version
- **WHEN** 输入缺少 schema declaration 或声明不认识的 schema family/version
- **THEN** validator fail closed，返回支持范围、输入 family 和 migration 入口

#### Scenario: schema 与 prose 冲突
- **WHEN** 机器 schema 和权威格式文档对同一字段给出不同约束
- **THEN** repository validation 失败并要求统一两者，不允许任选其一发布

#### Scenario: schema v2 输入当前消费
- **WHEN** 当前发布 runtime 收到 schema v2 template
- **THEN** 默认消费失败，并指向显式 migration candidate 流程
