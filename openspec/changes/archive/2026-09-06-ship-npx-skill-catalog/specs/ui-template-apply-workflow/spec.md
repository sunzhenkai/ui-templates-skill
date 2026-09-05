## ADDED Requirements

### Requirement: 安装后可消费官方 catalog
`ui-template-apply` SHALL 在消费项目缺少目标 published 模板时，解析已安装 `ui-template-author` 的只读 catalog。若 catalog 有该名称且状态为 published，SHALL 先播种到项目 `templates/`（不覆盖已有同名行/目录），再执行 `require-published`。仅当项目库与 catalog 都没有该 published 模板时，SHALL 以“没有模板”停止并移交 Authoring。SHALL NOT 在空项目上把缺项目 `templates/` 当成最终失败。

#### Scenario: 空项目按官方模板实现
- **WHEN** 用户在只安装了双公开 skill 的空项目要求用 `workbench-shell` 做页面
- **THEN** Apply 能读到 catalog 中的 published 模板（播种后走项目库），并进入 Phase 0，不得停成“没有模板”

#### Scenario: catalog 与项目都没有目标模板
- **WHEN** 用户点名的模板在项目 INDEX 与 Author catalog 都不存在或都不是 published
- **THEN** Apply 停止并移交 Authoring，不得猜测视觉规则

#### Scenario: 项目已有同名模板
- **WHEN** 项目 `templates/<name>/` 或 INDEX 已有该名称
- **THEN** Apply 只消费项目库该条目，不覆盖为 catalog 副本

## MODIFIED Requirements

### Requirement: 拒绝退役模板
`ui-template-apply` SHALL 在 Intake 对**项目库** INDEX 运行 `manage_template_index.py require-published`。若项目缺少该行但 Author catalog 有 published 同名模板，SHALL 先按播种规则写入项目库再检查。若目标模板在项目库状态为 `retired`，或项目与 catalog 都没有可播种的 published 行，SHALL 以非 0 停止且不得进入 Phase 1。

#### Scenario: 消费 retired 模板
- **WHEN** 用户要求用项目 INDEX 中 status=retired 的模板实现页面
- **THEN** Apply 拒绝开始并提示先由 Authoring 恢复 published 或另选模板；不得用 catalog 覆盖用户 retired 行

#### Scenario: 空项目没有 INDEX
- **WHEN** 消费项目没有 `templates/INDEX.md`，但已安装 Author catalog 含 published `workbench-shell`
- **THEN** Apply 播种后 `require-published` 成功，不得因缺项目 INDEX 直接失败
