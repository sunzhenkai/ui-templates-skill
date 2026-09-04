## ADDED Requirements

### Requirement: Workbench layout 置信度诚实降级
在 `templates/workbench-shell/` 无 chrome-complete `fidelity.yaml` 期间，`meta.confidence.layout` SHALL 不高于 `medium`。Authoring/治理 SHALL NOT 为满足 high 而伪造 source-direct sidecar，SHALL NOT 向用户索要 source-001/source-002 的本地绝对路径。该降级是 portable 契约，不改变 core v2 可消费性。

#### Scenario: 无 sidecar 时 layout 不得为 high
- **WHEN** maintainer 校验当前无 sidecar 的 workbench-shell
- **THEN** `confidence.layout` 为 medium 或更低，portable validator 不因 layout-high-without-chrome 失败

#### Scenario: 不得靠编造 sidecar 恢复 high
- **WHEN** 本会话没有与声明 revision 一致的 session source
- **THEN** 不得写入声称 observed 的 chrome records 或把 locator 指回模板自身以恢复 `layout: high`

### Requirement: A–E 是映射不是壳配方
workbench-shell 的 `routes-and-layouts.md` 与 `apply/playbook.md` SHALL 把 A–E 标明为 Apply 验收映射。壳层级说明 SHALL 区分「来源 chrome 槽位（若有 profile）」与「页面模式验收」。无 sidecar 时 prose SHALL NOT 暗示 A–E 等于上游 App Shell 视觉配方，也 SHALL NOT 把 Web 路径写成与来源 inset 冲突的唯一合法形态，除非同时声明 structural chrome unavailable。

#### Scenario: 阅读 routes-and-layouts
- **WHEN** consumer 打开 `routes-and-layouts.md`
- **THEN** 能区分 A–E 验收模式与壳 chrome；不会把五种页面模式误认为侧栏槽位顺序

#### Scenario: Web 平台文档
- **WHEN** consumer 阅读 `platforms/web.md` 且模板仍无 chrome sidecar
- **THEN** 文档不把 flush 硬切标为已验证的来源壳变体；inset 仅在后续 source-direct records 存在时成为 profile 约束

## MODIFIED Requirements

### Requirement: Structural 正向实例由 fixtures 承担
Board non-wrap/non-shrink、主从独立滚动、overlay scope、Dialog 四向 padding、四类 link context，以及 **shell chrome composition**（inset vs flush、有序槽位、header-trigger 与 chat-fab 锚点）的 source-direct structural 机器证据 SHALL 由非 example 固定 revision fixtures 提供，而不是把已发布 workbench 模板重新绑定到外部 checkout。仅当用户后续会话明确提供与 meta 声明 revision 一致的 session source 时，才允许对 workbench 做 Generate-from-source 并写入含 chrome records 的 `fidelity.yaml`。

#### Scenario: Fixture 覆盖非常规 layout
- **WHEN** contract eval 运行 repo-capture fixture
- **THEN** Board 横向 non-wrap、主从独立 scroll owner、overlay scope 与 inset chrome 槽位图作为 fixture records 可重复，而不要求本机存在 multica checkout

#### Scenario: 后续会话才允许 source-direct sidecar
- **WHEN** 用户为本会话提供与声明 revision 一致的可读 session source
- **THEN** Authoring 可按 Generate-from-source 为 workbench 补含 chrome composition 的 structural sidecar；该路径不是无 source 时的完成条件

#### Scenario: Chrome mutation 不依赖 workbench checkout
- **WHEN** fixture 将 header-trigger 改锚到 page-canvas 或将 variant 改为 flush
- **THEN** eval/validator 失败且不读取 `templates/workbench-shell/` 或 `example/**` 作为修复依据
