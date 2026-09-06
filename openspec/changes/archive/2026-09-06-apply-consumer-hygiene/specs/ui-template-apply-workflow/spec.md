## ADDED Requirements

### Requirement: 全新实现必须先确认技术架构
`ui-template-apply` SHALL 在 Phase 0 将实现现场判定为 `greenfield` 或 `existing`。输出根不存在、为空、或只有 git 占位文件（`README` / `LICENSE` / `.gitignore` / `.git`），或用户明确要求从零/全新搭建时，SHALL 判定为 `greenfield`。已有依赖清单或实质源码时 SHALL 判定为 `existing`。`greenfield` 且用户未冻结合法闭集层时，SHALL 先走技术架构选型并得到用户确认，SHALL NOT 猜测栈，SHALL NOT 把任何一套框架写成 Apply 官方默认。未确认前 SHALL NOT 写应用源码、依赖清单或工程配置；只允许写 `.ui-template-apply/`。`existing` SHALL 只记录观察到的栈，SHALL NOT 静默换栈。选型结果是消费仓决定，SHALL NOT 回写模板或 catalog。Phase 1 token map 与 Phase 3 目录约定 SHALL 只消费已确认架构；架构变更使 Phase 0 失效。

#### Scenario: 空仓未确认不得开栈
- **WHEN** 用户在空目录要求用 published 模板从零实现页面，且未指定各架构层
- **THEN** Apply 停止在 Phase 0 选型，展示闭集层候选并等待确认；不得创建 `package.json` 或页面源码

#### Scenario: 用户已点名栈则记录后继续
- **WHEN** greenfield 请求已冻结合法闭集（例如指定 UI 框架、bundler、styling）
- **THEN** Apply 将选择写入 Phase 0 architecture artifact，`confirmed_by_user` 为真后进入后续 phase，不得改成另一套默认栈

#### Scenario: 已有项目不跑选型
- **WHEN** 目标已有 `package.json` 或等价依赖清单
- **THEN** Intake 记录观察到的栈，不进入选型访谈，不替换现有框架

### Requirement: Phase 9 closed 后提示删除会话目录
当 Phase 9 通过且 `.ui-template-apply/feedback/` 没有未处置 `proposed` 记录时，Apply 会话 SHALL 视为 `closed`。最终汇报 SHALL 明确提示：可以删除整个 `.ui-template-apply/`；删除后生成页面不受影响；再次 Apply 视为新 Intake。若本次未领养项目库，汇报 SHALL 同时说明本仓不应存在 `templates/`。Apply SHALL NOT 自动删除 `.ui-template-apply/` 或项目 `templates/`。

#### Scenario: 完成收尾必须提示可删
- **WHEN** Phase 8/9 通过且 inbox 无 proposed feedback
- **THEN** 最终汇报含可删除 `.ui-template-apply/` 的说明，以及未领养时不应有 `templates/` 的说明

#### Scenario: 不自动删除
- **WHEN** 会话刚 closed
- **THEN** `.ui-template-apply/` 仍在磁盘上，除非用户随后自行删除

#### Scenario: 未 closed 不得宣称可删会话账本
- **WHEN** Phase 9 未通过或仍有 proposed feedback
- **THEN** 汇报不得说会话可删，也不得宣称完成

## MODIFIED Requirements

### Requirement: 拒绝退役模板
`ui-template-apply` SHALL 在 Intake 解析目标模板：项目 INDEX 行为 `retired` 时 SHALL 以非 0 停止且不得进入 Phase 1，SHALL NOT 用 catalog 覆盖或救回该行。项目没有该行时 SHALL 按 catalog pin 规则 resolve，SHALL NOT 为了通过检查而播种项目库。项目与 catalog 都没有可消费的 published 模板时 SHALL 停止且不得进入 Phase 1。

#### Scenario: 消费 retired 模板
- **WHEN** 用户要求用项目 INDEX 中 status=retired 的模板实现页面
- **THEN** Apply 拒绝开始并提示先由 Authoring 恢复 published 或另选模板；不得用 catalog 覆盖用户 retired 行

#### Scenario: 空项目没有 INDEX
- **WHEN** 消费项目没有 `templates/INDEX.md`，但已安装 Author catalog 含 published `workbench-shell`
- **THEN** Apply 以 catalog pin resolve 成功并进入 Phase 0，不得因缺项目 INDEX 直接失败，也不得因此创建项目 `templates/`

### Requirement: 安装后可消费官方 catalog
`ui-template-apply` SHALL 在消费项目缺少目标 published 模板时，解析已安装 `ui-template-author` 的只读 catalog。若 catalog 有该名称且状态为 published，SHALL 只读该副本并把 name / version / digest / `origin=catalog` pin 到 `.ui-template-apply/`，SHALL NOT 写入项目 `templates/` 或 INDEX。仅当项目库与 catalog 都没有该 published 模板时，SHALL 以“没有模板”停止并移交 Authoring。SHALL NOT 在空项目上把缺项目 `templates/` 当成最终失败。项目已有同名 `published` 行或目录时 SHALL 只消费项目库（`origin=project`），SHALL NOT 覆盖为 catalog 副本。

#### Scenario: 空项目按官方模板实现
- **WHEN** 用户在只安装了双公开 skill 的空项目要求用 `workbench-shell` 做页面
- **THEN** Apply 只读 catalog 中的 published 模板并进入 Phase 0，不得停成“没有模板”，也不得创建项目 `templates/`

#### Scenario: catalog 与项目都没有目标模板
- **WHEN** 用户点名的模板在项目 INDEX 与 Author catalog 都不存在或都不是 published
- **THEN** Apply 停止并移交 Authoring，不得猜测视觉规则

#### Scenario: 项目已有同名模板
- **WHEN** 项目 `templates/<name>/` 或 INDEX 已有该名称
- **THEN** Apply 只消费项目库该条目，不覆盖为 catalog 副本
