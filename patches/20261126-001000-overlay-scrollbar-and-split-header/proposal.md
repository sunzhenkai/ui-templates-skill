# 0px 覆盖式滚动条与侧栏固定头分离

- target: blocks/surfaces, blocks/list-detail
- packages: quiet-inset 0.6.18, workbench-shell 5.0.30
- patch: 20261126-001000-overlay-scrollbar-and-split-header

## Intent

1. 消除原生占位滚动条对贴边横线（`border-b`）的右侧截断：`ScrollRegion` 隐藏原生槽位（`no-scrollbar`）并提供 0px 占位的绝对定位 `OverlayScrollbar`（滚动/悬停/拖拽时显示，停滚 800ms 后淡出，触屏沿用原生）。
2. 解决侧栏吸顶头与滚动条顶部平齐的问题：`Split` 新增 `sideHeader` 固定区，`ListDetailLayout` 的 `PaneHeader` 移出滚动容器，`PaneSection grow` 承载独立 `ScrollRegion`。
