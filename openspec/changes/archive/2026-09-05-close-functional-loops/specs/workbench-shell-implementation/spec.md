## ADDED Requirements

### Requirement: 实例附录边界
本规格 SHALL 只作为 `workbench-shell` 的实例附录。通用 skill 与其他模板 SHALL 不把它当作产品级必选契约。对该模板的保真修复 SHALL 走 Authoring/Apply/模板回写与重生，SHALL NOT 特例化修改生成 web。

#### Scenario: 生成页面与 multica 不一致
- **WHEN** 对照可部署 multica 发现壳或组件差异
- **THEN** 更新 workbench-shell 模板或对应 skill，并用干净 Apply 重生验证，不得直接改 example web
