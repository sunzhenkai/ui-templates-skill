# Proposal — 文档阅读壳：pane header 固定 + 右侧目录栏 + header 图标预算

## Intent

文档阅读页（Wiki 详情）暴露三个机制缺口：

1. 主从布局的 pane 本身是滚动容器，`PaneHeader` 无 sticky——列表滚长后标题行被滚走（会话列表同病）。
2. 右侧需要文档目录栏，但 `Split` 只支持左侧栏。
3. 阅读页要把「信息/反链/前向引用/历史」收进 header 图标，`PageHeader` 却把非破坏性动作内联上限写死为 2。

## 改动

- `blocks/list-detail`：`PaneHeader` 补 `sticky top-0 z-10 bg-background`。
- `blocks/surfaces`：`Split` 新增 `sidePosition`（`start` 默认 / `end`）；`end` 时主列在前、侧栏在后
  （`order` + `grid-cols-[minmax(0,1fr)_Nrem]`），分割线画在侧栏左缘；窄屏堆叠行为不变。
- `blocks/page-header`：新增 `inlineMax`（默认 2，注释限定仅 iconOnly 且语义明确时提高）；
  destructive 仍恒进溢出菜单。
- quiet-inset 0.6.11 / workbench-shell 5.0.23。

## Conflict check

- `Split` 默认 `start` 输出与既有完全一致；`SectionLayout` 不受影响。
- `PageHeader` 默认 `inlineMax=2` 与旧契约等价；仅显式提高的消费端变化。
- `PaneHeader` 增加 sticky 只有视觉收益（z-10 覆盖列表内容、bg-background 与画布一致）。
- 无 token / 对比度影响。

## Validation

- `make sync` + `make check`（48 tests）；validate ×2 0 error。
- 消费端：列表长滚动时 pane header 固定；文档页右侧目录栏（`sidePosition="end"`）与 header 5 个图标
  正常；窄屏回退；fidelity 7/7 不变。
