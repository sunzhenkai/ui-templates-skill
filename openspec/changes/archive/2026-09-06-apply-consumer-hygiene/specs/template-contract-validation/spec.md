## MODIFIED Requirements

### Requirement: catalog 与生产库同一 published 集合
仓库根生产 `templates/` 是官方模板真相源。`ui-template-author` 内 catalog SHALL 是该 published 集合的可校验副本：同一名称、同一 INDEX 前四列与状态、同一必备文件集合，内容摘要一致。validator 或治理检查 SHALL 在发布前同时校验生产库与 catalog；任一 drift、缺文件、INDEX 不一致或 catalog 含非生产 published 名称 SHALL 失败。Apply 只读 catalog pin 时 SHALL NOT 要求消费项目存在 `templates/INDEX.md`。项目库一旦存在（显式 seed / 领养 / 本仓生产库），其 INDEX/目录仍适用现有 INDEX 生命周期与 core 校验。

#### Scenario: catalog 与生产库一致
- **WHEN** 对仓库根 `templates/` 与 Author catalog 运行校验
- **THEN** published 名称集合相同，每项必备文件 digest 一致，INDEX 行一致

#### Scenario: catalog 落后于生产库
- **WHEN** 生产库更新了 `workbench-shell` 或 INDEX，catalog 未同步
- **THEN** 治理/校验以稳定 issue code 失败，不得发布

#### Scenario: catalog 多出非生产模板
- **WHEN** catalog INDEX 含生产库没有的 published 名称
- **THEN** 校验失败

#### Scenario: 播种后的项目库可独立校验
- **WHEN** 项目经显式 seed 或领养从 catalog 写入 `workbench-shell` 后运行 portable validator
- **THEN** 项目 `templates/` 通过现有 INDEX 与 core 校验

#### Scenario: catalog-only Apply 不要求项目 INDEX
- **WHEN** 空消费项目只读 catalog pin 完成 Intake，项目没有 `templates/`
- **THEN** 不得因缺项目 INDEX 判定 Apply 或 portable 消费失败
