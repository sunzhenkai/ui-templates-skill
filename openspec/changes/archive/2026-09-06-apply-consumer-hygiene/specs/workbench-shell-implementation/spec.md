## MODIFIED Requirements

### Requirement: Phase 0 明确 legacy-baseline 且不读 provenance 实现
workbench-shell 的 `apply/playbook.md` Phase 0 SHALL 要求记录 `legacy-baseline` 与 `structural fidelity unavailable`（当前无 sidecar）。Intake SHALL NOT 把 `meta.sources[]`、上游产品名或历史生成物列为实现输入。通用 catalog resolve / pin、greenfield 选型与 Phase 9 closed 提示仍由 Apply skill 执行；模板指南只声明本实例的 coverage / A–E / 平台路径决定，SHALL NOT 要求或复述向项目 `templates/` 播种。

#### Scenario: 无 sidecar 进入 Phase 0
- **WHEN** consumer 用当前 published workbench-shell 开始 Apply
- **THEN** `00-intake.md` 写明 structural fidelity unavailable / legacy-baseline；不得把缺 `fidelity.yaml` 当成要上游绝对路径的理由

#### Scenario: provenance 不是实现参考
- **WHEN** Agent 读取 workbench `meta.sources[]`
- **THEN** 不得打开对应 checkout、按 ref clone，或把出处身份写入 intake 作为实现输入

#### Scenario: 实例指南不要求播种
- **WHEN** consumer 阅读 workbench `apply/playbook.md` Phase 0
- **THEN** 指南不把创建项目 `templates/` 或 INDEX 当作本模板完成条件
