## ADDED Requirements

### Requirement: placement region 位置事实
`placementRegion` MAY 声明 `position`（`static | sticky | fixed`）；置顶 chrome（如卡内置顶 header）SHALL 以 `parent` + `position: sticky` 表达，不得以平级 region 代替。

#### Scenario: 卡内置顶 header
- **WHEN** inset 壳 route 的 `page-header` region 声明 `parent: page-canvas` 与 `position: sticky`
- **THEN** validator 通过，Apply 将 header 实现在 canvas 滚动域内并置顶
