## MODIFIED Requirements

### Requirement: 全新实现必须先确认技术架构
`ui-template-apply` SHALL 在 Phase 0 将**本次前端输出根**判定为 `greenfield` 或 `existing`。判定对象 SHALL 是将写入应用源码的目录，SHALL NOT 是仓库根、`.ui-template-apply/` 或兄弟应用。输出根不存在、为空、只有空子目录、或只有 git 占位文件（`README` / `LICENSE` / `.gitignore` / `.git`），或用户明确要求从零/全新搭建时，SHALL 判定为 `greenfield`。该输出根已有依赖清单或实质源码时 SHALL 判定为 `existing`。仓库已初始化但输出根仍是新应用时 SHALL 仍为 `greenfield`。`00-architecture.yaml` SHALL 记录相对消费项目根的 `output_root`；checker SHALL 对 `output_root` 复跑探测，`site` 不一致则失败。`greenfield` 且用户未在本会话把闭集层当作架构选择点名或确认时，SHALL 先走技术架构选型并得到用户确认，SHALL NOT 猜测栈，SHALL NOT 把任何一套框架写成 Apply 官方默认，SHALL NOT 把兄弟应用、workspace 约定或功能规格里的技术提及当作确认。未确认前 SHALL NOT 写应用源码、依赖清单或工程配置；只允许写 `.ui-template-apply/`。`existing` SHALL 只记录观察到的栈，SHALL NOT 静默换栈。选型结果是消费仓决定，SHALL NOT 回写模板或 catalog。Phase 1 token map 与 Phase 3 目录约定 SHALL 只消费已确认架构；架构变更使 Phase 0 失效。

#### Scenario: 空仓未确认不得开栈
- **WHEN** 用户在空目录要求用 published 模板从零实现页面，且未指定各架构层
- **THEN** Apply 停止在 Phase 0 选型，展示闭集层候选并等待确认；不得创建 `package.json` 或页面源码

#### Scenario: 仓库已初始化但输出根是新应用
- **WHEN** 消费仓库已有依赖清单或其他应用，但本次输出根不存在、为空或只有空子目录
- **THEN** Intake 判定 `greenfield`，停止在 Phase 0 选型并等待确认；不得因仓库已初始化而记录 `existing` 或跳过选型

#### Scenario: 用户已点名栈则记录后继续
- **WHEN** greenfield 请求已由用户把闭集层当作架构选择冻结（例如明确指定 UI 框架、bundler、styling）
- **THEN** Apply 将选择写入 Phase 0 architecture artifact，`confirmed_by_user` 为真后进入后续 phase，不得改成另一套默认栈

#### Scenario: 功能规格或兄弟栈不得自动确认
- **WHEN** 产品功能规格、ADR、兄弟应用或 workspace 清单提及某套技术栈，但用户未在本会话确认这些层
- **THEN** Apply 只把它们当作候选或 `observed_constraints`，保持未确认并停留在选型；不得写 `confirmed_by_user: true`

#### Scenario: 已有输出根不跑选型
- **WHEN** 本次输出根已有 `package.json` 或等价依赖清单或实质源码
- **THEN** Intake 记录观察到的栈，不进入选型访谈，不替换现有框架
