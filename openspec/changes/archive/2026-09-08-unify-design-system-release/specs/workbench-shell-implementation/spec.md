## ADDED Requirements

### Requirement: Workbench design-system package identity
`workbench-shell` 当前 official package SHALL 使用 `design-system/v1`、name `workbench-shell`、version `3.0.0` 和 `capability: page-system`；生产模板、Author catalog 与 INDEX metadata SHALL 保持 identity、description、source type、capture date 和 status 一致。

#### Scenario: official catalog reconciliation
- **WHEN** release 构建对比生产模板与 Author catalog
- **THEN** identity、version、digest、INDEX 行和 status 完全一致

#### Scenario: migration candidate promotion
- **WHEN** schema v2 workbench-shell 迁移 candidate 通过验证但未获得单独发布授权
- **THEN** 生产 `templates/workbench-shell/` 与 catalog 不切换

#### Scenario: page-system capability enforcement
- **WHEN** Apply 领养 official workbench-shell
- **THEN** package 必填七层完整，Apply 可据此执行 bootstrap 而不需要隐式补语义
