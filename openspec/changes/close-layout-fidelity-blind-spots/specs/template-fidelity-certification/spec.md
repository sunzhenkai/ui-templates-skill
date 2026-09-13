## MODIFIED Requirements

### Requirement: Certification gate is a publish precondition
Template Certification Gate SHALL 是官方 Template Package publish 和 upgrade 的必要治理步骤；gate 未通过或证据缺失时，生产 INDEX 与 catalog SHALL 不切换。对声明 shell chrome composition 的模板（shell-bearing），catalog promotion 或 replacement SHALL 额外要求当前 accepted 的 certification report；缺失时 promotion SHALL 拒绝并指明所需认证输入。认证对照 SHALL 只发生在认证链路（固定 Visual Oracle revision、source-blind 干净 Apply、Pattern Equivalence Records），SHALL NOT 将 oracle identity 或对照产物注入 Apply checkpoint。

#### Scenario: candidate passes certification
- **WHEN** candidate package 的全部 certification inventory 成员都有有效 `passed` Pattern Equivalence Records
- **THEN** gate 输出 accepted 结果，并将 candidate 标记为可等待用户单独确认发布

#### Scenario: evidence missing
- **WHEN** 任一必需 Pattern 没有 current-build record、oracle record 或必要 assertions
- **THEN** gate 失败，生产 INDEX 与 catalog 保持原状

#### Scenario: shell-bearing 模板缺认证直提 catalog
- **WHEN** 声明 shell chrome composition 的模板候选在无当前 accepted certification report 的情况下请求 catalog promotion
- **THEN** promotion 拒绝并报告缺失的认证前置，catalog 保持原状

#### Scenario: 认证不污染 Apply
- **WHEN** 认证链路完成对照并产出 Equivalence Records
- **THEN** 记录停留在认证工件内；Apply checkpoint 校验继续拒绝 oracle identity 或 source-compare 输入进入实现会话
