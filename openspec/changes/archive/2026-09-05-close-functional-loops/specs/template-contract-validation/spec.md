## ADDED Requirements

### Requirement: INDEX 生命周期状态
validator SHALL 解析 `templates/INDEX.md` 的名称、风格描述、来源类型、采集日期与状态。状态 SHALL 仅为 `published` 或 `retired`。前四列 SHALL 与对应 `meta.yaml` 一致。INDEX 中的每一行 SHALL 有同名模板目录；每个被校验的模板目录 SHALL 有 INDEX 行。

#### Scenario: published 行列齐全
- **WHEN** INDEX 行为五列且状态 published，目录与 meta 一致
- **THEN** 索引校验通过

#### Scenario: 非法状态
- **WHEN** INDEX 状态不是 published 或 retired，或缺少状态列
- **THEN** validator 以稳定 issue code 失败

#### Scenario: 孤儿 published 行
- **WHEN** INDEX 列出 published 模板但目录不存在
- **THEN** validator 报告 orphan 并失败
