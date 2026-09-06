## ADDED Requirements

### Requirement: 拒绝退役模板
`ui-template-apply` SHALL 在 Intake 用 `manage_template_index.py require-published` 读取模板集合 INDEX。若目标模板状态为 `retired` 或不存在 INDEX 行，SHALL 以非 0 停止且不得进入 Phase 1。

#### Scenario: 消费 retired 模板
- **WHEN** 用户要求用 INDEX 中 status=retired 的模板实现页面
- **THEN** Apply 拒绝开始并提示先由 Authoring 恢复 published 或另选模板

### Requirement: 干净实现与保真对照分离
Apply 默认只消费模板与用户需求，SHALL NOT 读取原版 checkout、`meta.sources[]` 路径或历史生成 web。当用户明确要求对齐原版时，Apply SHALL 把可部署原版仅当作视觉 oracle，将差异分类为 spec / apply / prompt-or-accept，并写入 `.ui-template-apply/source-compare.yaml`。对照失败 SHALL NOT 通过修改生成物闭合；SHALL 回写对应 skill 或模板后丢弃生成物并至少重生一次。

#### Scenario: 干净实现
- **WHEN** 用户用 published 模板实现 prompts 中的页面且未要求对齐原版
- **THEN** Apply 只读模板与 prompts，完成 Phase 0–9，不打开原版源码

#### Scenario: 对照差异出现在壳几何
- **WHEN** 模式 B 发现 inset/槽位与可部署原版不一致
- **THEN** 记录 spec 分类，不得改生成 CSS/组件来消除差异

#### Scenario: 参考历史 web
- **WHEN** 工作区存在 `example/**/web` 或 `web-v*`
- **THEN** Apply 仍不得把它们当作实现或对照参考
