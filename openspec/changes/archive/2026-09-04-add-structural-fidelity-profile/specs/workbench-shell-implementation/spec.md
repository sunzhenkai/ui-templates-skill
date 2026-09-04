## ADDED Requirements

### Requirement: Workbench 已发布模板保持可消费且不索取上游路径
`templates/workbench-shell/` SHALL 继续作为合法 schema v2 模板被 portable 校验与 Apply baseline 消费。`meta.sources[]` SHALL 只作为并列出处身份（固定 repo revision 与已泛化 doc revision）。无本会话 session source 时，模板 SHALL 保持无 `fidelity.yaml` 的 `legacy-baseline`；Authoring/治理 SHALL NOT 向用户索要这两个来源的本地绝对路径，SHALL NOT 扫描 sibling checkout、`/tmp` 或 `example/**`，SHALL NOT 按 provenance ref clone，也 SHALL NOT 用旧模板 snapshot locator 冒充 source-direct observed records。

#### Scenario: 无 session source 时校验 workbench
- **WHEN** maintainer 在未提供上游 checkout 的情况下验证 workbench-shell
- **THEN** portable core v2 与 INDEX 一致性通过；replay 为 not-run 或不适用；不得把缺本地 source root 报告为 blocker

#### Scenario: 禁止把 provenance 当路径请求
- **WHEN** Agent 读取 workbench `meta.yaml` 中的 source-001/source-002
- **THEN** 它不得请求用户提供对应本地绝对路径，也不得将任务 6.1 解释为「没有 checkout 就停下来问路径」

#### Scenario: Example 实现存在差异
- **WHEN**`example/workbench-shell/**` 的生成代码、样式、测试或文档发生变化
- **THEN**workbench 校验与任何后续 profile 生成不读取、不修改也不使用该变化作为来源证据

### Requirement: Structural 正向实例由 fixtures 承担
Board non-wrap/non-shrink、主从独立滚动、overlay scope、Dialog 四向 padding 与四类 link context 的 source-direct structural 机器证据 SHALL 由非 example 固定 revision fixtures 提供，而不是把已发布 workbench 模板重新绑定到外部 checkout。仅当用户后续会话明确提供与 meta 声明 revision 一致的 session source 时，才允许对 workbench 做 Generate-from-source 并写入 `fidelity.yaml`。

#### Scenario: Fixture 覆盖非常规 layout
- **WHEN** contract eval 运行 repo-capture fixture
- **THEN** Board 横向 non-wrap、主从独立 scroll owner 与 overlay scope 作为 fixture records 可重复，而不要求本机存在 multica checkout

#### Scenario: 后续会话才允许 source-direct sidecar
- **WHEN** 用户为本会话提供与声明 revision 一致的可读 session source
- **THEN** Authoring 可按 Generate-from-source 为 workbench 补 structural sidecar；该路径不是无 source 时的完成条件

### Requirement: Workbench profile 质量矩阵在有 sidecar 之前保持 baseline
在 workbench 仍无 `fidelity.yaml` 期间，`apply/quality.md` SHALL 继续按 core v2 rule IDs 工作，SHALL NOT 因为缺 profile record IDs 而要求补上游路径。若未来 sidecar 存在，quality matrix 只引用 record IDs，不复制 token 值或第二套 profile。

#### Scenario: Baseline quality 仍可消费
- **WHEN** consumer 读取当前无 sidecar 的 workbench
- **THEN** Apply 按 legacy-baseline 使用 playbook/quality，并明确 structural profile unavailable

#### Scenario: 只提供整页截图
- **WHEN** consumer 用截图声称结构细节通过但没有 computed/geometry/scroll evidence
- **THEN** 若当时没有 structural records，不得把截图升级为 profile-verified；有 records 时相关 gate 保持 failed，直到提供绑定 current build 的 expected/actual
