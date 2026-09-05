## ADDED Requirements

### Requirement: 变更集合更新
`ui-template-author` SHALL 在从源创建或更新时冻结本次变更集合（路径和/或组件名单；L0–L6 仅作标签）。未纳入集合的文件 SHALL 保持原字节。抽样“代表组件”不得作为完成标准。声称常用组件已覆盖时，这些组件 SHALL 为 observed 或 unsupported，不得仅靠 defaulted 宣称高度一致。

#### Scenario: 只更新声明的组件文件
- **WHEN** 用户声明本次只改 `components.md` 且给出 session source
- **THEN** Authoring 可改该文件与对应 coverage/evidence，不得重写未声明的 chrome sidecar 或 token 精确值

#### Scenario: 未冻结变更集合
- **WHEN** 用户要求从源更新但未声明路径或组件集合
- **THEN** Authoring 停在 Intake，不进入 Generate-from-source

### Requirement: 模板库生命周期
`ui-template-author` SHALL 提供创建、从源更新、反馈更新、portable 更新、浏览、退役与删除。生产 INDEX 每行 SHALL 包含状态 `published` 或 `retired`。draft 是未进 INDEX 的候选目录，不是 INDEX 状态。`retired` 模板 SHALL 保留目录直到删除。删除 SHALL 同时移除 INDEX 行与模板目录，且只允许 draft 或已 retired 模板。

#### Scenario: 退役已发布模板
- **WHEN** 用户要求 retire 某个 published 模板
- **THEN** INDEX 状态变为 retired，目录保留，Authoring 报告成功且生产 INDEX 与 meta 前四列仍一致

#### Scenario: 直接删除 published 模板
- **WHEN** 用户要求 delete 一个仍为 published 的模板
- **THEN** 操作失败，要求先 retire

#### Scenario: 删除已退役模板
- **WHEN** 用户 delete 一个 retired 模板
- **THEN** INDEX 行与 `templates/<name>/` 都被移除，随后 portable validate 通过
