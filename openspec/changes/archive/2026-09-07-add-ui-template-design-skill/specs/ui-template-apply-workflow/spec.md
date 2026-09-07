## ADDED Requirements

### Requirement: 可选投影 design freeze
当消费项目存在可解析且身份匹配的 design freeze 时，`ui-template-apply` SHALL 把该 freeze 投影为结构层约束（token 语义、Primitive/Pattern 边界、Page Type），SHALL NOT 在 Phase 1–4 重新发明壳、原语或页面类型。freeze 缺失、digest 不匹配或 schema 不受支持时，Apply SHALL 保持现行 Phase 0–9，SHALL NOT 把缺少 Design skill 或 freeze 当作失败。Apply SHALL NOT 硬依赖 Design runtime；只读取消费项目 freeze 记录。

#### Scenario: 有匹配 freeze 则禁止发明结构
- **WHEN** `.ui-template-design/freeze.yaml`（或约定等价路径）存在、digest 匹配，且用户要求按模板实现页面
- **THEN** Apply 校验并投影 freeze；不得另造 PageHeader/ListPage 或未映射 token

#### Scenario: 无 freeze 保持现行工作流
- **WHEN** 消费项目没有 design freeze
- **THEN** Apply 按现行 Phase 0–9 执行，不要求先运行 Design

#### Scenario: freeze 身份过期
- **WHEN** freeze digest 与当前设计系统本体不一致
- **THEN** Apply 停止并要求重新 freeze 或忽略过期 freeze 并经用户确认后走现行工作流，不得静默混用
