## ADDED Requirements

### Requirement: Shell chrome composition records
每个 included structural **shell** scene SHALL 在 layout topology 之外记录 chrome composition：闭集 `shell_variant`（`inset | flush`）、该 scene 内有序 `slots[]`（稳定 ID、闭集 role、所属 region）、以及 header-trigger 与 chat-fab 的 region 锚点。同级 `contains` 关系 SHALL 带稳定顺序，不得只声明无序归属。精确几何值 SHALL 继续只引用 `tokens.yaml`。槽位 role 闭集至少包含 `workspace-switcher`、`search`、`compose`、`nav-group`、`pin-list`、`rail`、`header-trigger`、`footer-utility`、`chat-fab`、`page-header`、`page-toolbar`、`page-canvas`。来源无法唯一裁决变体、顺序或锚点时 SHALL 进入 unresolved，不得把该 shell 标为 observed structural。

#### Scenario: inset 壳与页头 trigger
- **WHEN** 来源 shell 使用内缩画布，且导航覆盖触发器位于 page-header 而非画布角
- **THEN** profile 记录 `shell_variant: inset`、`header-trigger` 锚在 page-header region，且不得把该 trigger 记为 page-canvas overlay

#### Scenario: 侧栏槽位顺序可观察
- **WHEN** 来源 sidebar header 按工作区切换器、搜索、创建动作排列
- **THEN** profile 以该顺序写出对应 slots；颠倒顺序的记录与来源冲突并不得标 observed

#### Scenario: 只有横向排列没有 chrome
- **WHEN** included shell scene 只声明 `arrangement: horizontal` 和根不滚动，没有 variant、有序槽位或 trigger/FAB 锚点
- **THEN** 该 scene 不得标 observed structural；Authoring/validation 报告 chrome composition 不完整

#### Scenario: flush 与 inset 冲突
- **WHEN** 同一 shell scene 的 usages 对 `shell_variant` 给出 inset 与 flush
- **THEN** 两条 fact 进入 unresolved，模板不得发布其中任一条为 observed
