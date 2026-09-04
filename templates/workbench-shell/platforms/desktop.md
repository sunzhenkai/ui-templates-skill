# desktop 平台壳

Desktop 是独立窗口平台路径，与 Web 共享 [`../spec.md`](../spec.md) 的语义角色，但不消费 Web breakpoint 作为窗口 chrome 规则。精确值与 provenance 见 [`../tokens.yaml`](../tokens.yaml) 和 [`../evidence.yaml`](../evidence.yaml)。

## 结构

```text
native window（root-height / overflow hidden / app-shell）
├─ WindowToolbar
├─ resizable Sidebar
├─ MainTopBar（window tabs）
└─ MainCanvas（page-canvas）
   ├─ NavigationProgress
   ├─ 当前 A–E 页面模式
   └─ FloatingChat
```

## 窗口工具栏

- [LAYOUT-012] WindowToolbar 高度映射 shared chrome token；window controls、drag region 与 navigation controls 保持独立 hit region。
- [AX-070] window controls 后依次是 sidebar trigger、back/forward；button、icon 与 hover 使用当前 token scale 和 sidebar 角色。
- [AX-071] drag region 可拖动窗口，内部 buttons 明确排除拖动。
- [AX-072] 外层 toolbar 已提供 sidebar trigger 时，PageHeader 不渲染第二个 trigger。

## 页签

- [LAYOUT-013] MainTopBar、tab label、padding 与 gap 从 shared layout/typography/spacing token 映射。
- [TOKEN-012] active tab 与下方 canvas 使用连续 surface；inactive 与 hover 使用适用主题角色。
- [AX-073] 支持 reorder、pin、close、middle-click 与 context menu；pinned 和普通区域以 token divider/gap 分组。
- [ROUTE-013] 唯一 tab 和 pinned tab 不显示 close；关闭前保证存在可恢复 destination。

## 画布与导航

- [LAYOUT-014] canvas inset 随 sidebar expanded/collapsed 状态变化，但值只从当前 layout/spacing token 映射。
- [LAYOUT-015] canvas radius、ring、shadow 和 overflow 使用当前 token map，不在平台 prose 复制值。
- [ROUTE-014] tab、route 与 workspace switch 支持 back/forward、keyboard shortcut 和 native gesture；destination 未解析前显示结构化 loading。
- [ROUTE-015] 跨 workspace notification/link 切换到正确 workspace，不把 destination 挂到当前 tab group。
- [LAYOUT-016] Modal registry、global search 与 WindowOverlay 位于 tab system 之外；pre-workspace overlay 保留 window controls 与独立 drag region。
