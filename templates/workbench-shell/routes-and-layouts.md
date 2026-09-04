# routes-and-layouts

本文件定义 A–E 页面模式、路由状态和响应行为。精确值由 [`tokens.yaml`](tokens.yaml) 携带，来源按 token path 在 [`evidence.yaml`](evidence.yaml) 查找 active 记录；共享规则入口为 [`spec.md`](spec.md)。

## 1. 壳层级

```text
root（token 驱动的视口高度，overflow hidden）
└─ app-shell
   ├─ platform navigation
   └─ page-canvas（overflow hidden）
      ├─ NavigationProgress
      ├─ 页面列/模式槽位（内部滚动）
      ├─ Modal registry
      └─ FloatingChat / FAB
```

- [LAYOUT-001] Web 与 Desktop 使用固定根壳和内部滚动；Mobile 使用独立安全区与原生导航栈，不把 Web overlay 当作 Mobile shell。
- [LAYOUT-002] 搜索、通知、浮动聊天与 modal registry 属于壳级能力，但视觉覆盖范围在 page-canvas 内。
- [LAYOUT-003] 未认证、工作区解析中或无权限时，整壳替换为结构化 loading/error；不得渲染半个导航。
- [LAYOUT-004] PageHeader、Toolbar 与内容区共享 token 驱动的 chrome 对齐线；模式切换不得改变 chrome 几何或滚动归属。

## 2. 页面 chrome

| 槽位 | token / 行为 |
| --- | --- |
| PageHeader | `layout.page-header-height`、`layout.page-gutter`；标题可截断，动作区不收缩。 |
| Toolbar | `layout.toolbar-height`、`layout.page-gutter`；承载筛选、视图、排序与主动作。 |
| 内容区 | 占据剩余空间且允许内部滚动；浮动净空读取 `layout.chat-fab-clearance`。 |

集合页头、详情/面包屑页头与简单页头共用 @LAYOUT-004。窄屏页头提供 Web overlay 触发器；Desktop 外层 chrome 已提供触发器时不得重复。

## 3. A–E 页面模式

| 模式 | 结构 | 适用与验收重点 |
| --- | --- | --- |
| [ROUTE-005] A. 常驻集合 | PageHeader + Toolbar + 全幅集合区域 | 列表网格、卡片集合、表格、看板或泳道；模式、筛选、排序与视图可恢复。 |
| [ROUTE-006] B. 主从 | master 集合 + detail，分别滚动 | 资产、消息、工单和 legacy 文档详情；紧凑路径降级单列，选中项保留在 URL。 |
| [ROUTE-007] C. 设置页签 | tabs 导航 + settings content | 宽路径纵向 tabs，窄路径横向 tabs；当前 tab 可恢复。 |
| [ROUTE-008] D. 聊天/时间线 | 会话集合 + 内部时间线 + composer | 时间线内部滚动，composer 固定在模式边界，键盘/安全区不破坏当前阅读位置。 |
| [ROUTE-009] E. 聚合网格 | metric/card aggregate grid | 列数由容器与当前 token scale 决定；层级、hover、empty 与 create 入口可验收。 |

每个 included route 必须映射到 @ROUTE-005–@ROUTE-009 之一。legacy route inventory 中的“文档详情”只能映射到 @ROUTE-006 的 detail 槽位；若目标产品没有可解释的 master，则在 Phase 0 Intake 标为 `excluded` 并记录理由，不得创建第六种模式。混合页面拆成可独立验收的 A–E 槽位。

## 4. Web 响应矩阵与容器规则

断点精确值由 `responsive.web.*` token 唯一携带；expanded、collapsed 与 overlay 只按下表的 token 关系解释。

| Web 路径 | viewport 条件 | Shell 行为 |
| --- | --- | --- |
| expanded | `>= responsive.web.expanded-min` | 展开常驻导航，页面模式保持内部滚动。 |
| collapsed | `>= responsive.web.collapsed-min` 且 `< responsive.web.expanded-min` | 折叠导航常驻，主要目的地和触发器可达。 |
| overlay | `< responsive.web.collapsed-min` | 常驻导航退出布局，PageHeader 提供可访问的覆盖导航触发器。 |

- [RESP-001] 所有 Web route 使用同一 expanded/collapsed/overlay shell 矩阵；viewport `< responsive.web.narrow-content-threshold` 仍属于 Web overlay，只进一步收缩动作和模式内容，不得与原生 Mobile 平台混同。Desktop 的外层触发器只适用于独立 Desktop 平台。
- [RESP-002] Toolbar 动作在不足宽度下按优先级收缩为 icon-only，并保留 accessible name。
- [RESP-003] C 设置页签在窄内容容器横向滚动、宽内容容器纵向排列；切换方向不丢失当前 tab。
- [RESP-004] 设置内容宽度从 layout/spacing token 映射；属性型宽表面不得迫使根壳横向滚动。
- [RESP-005] E 聚合网格的列数和 gap 由容器与当前 token scale 决定，不写固定列数。
- [RESP-006] A 列表网格按容器显示核心列或全部启用列；列显隐必须可解释，用户启用列不得因 viewport 静默关闭。

## 5. URL 与状态

- [ROUTE-001] 当前集合视图、筛选、排序、selected item、detail、settings tab 与 Desktop tab 必须由 URL 或等价可恢复路由状态表达。
- [ROUTE-002] C 设置页签切换使用 replace 语义，避免临时 tab 切换污染历史。
- [ROUTE-003] Web overlay / Drawer 内发生真实 route navigation 后关闭，并按 @AX-050 恢复焦点。
- [ROUTE-004] empty 区分没有数据与 filtered empty；后者提供 clear filter。

## 6. 加载与状态

A–E 的 loading skeleton 必须与最终结构共用布局和 token map。empty、error、not-found 使用一致结构但保持适用 role、重试/返回动作与非颜色状态。证据数量由 included routes、coverage 与当前 rule IDs 动态生成，不以固定行数、列数或 checklist 数量代替。
