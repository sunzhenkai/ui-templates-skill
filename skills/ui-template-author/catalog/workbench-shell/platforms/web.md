# web 平台壳

Web 是响应式浏览器平台路径。精确 token 与 provenance 分别见 [`../tokens.yaml`](../tokens.yaml) 和 [`../evidence.yaml`](../evidence.yaml)；A–E 与响应规则见 [`../routes-and-layouts.md`](../routes-and-layouts.md)。无 chrome sidecar 时 inset/flush 与 header-trigger 锚点 unavailable，不得把左右硬切写成已验证来源变体。

## 结构

```text
browser viewport（root-height / overflow hidden）
└─ app-shell
   ├─ responsive navigation
   └─ page-canvas（inset 面板：relative / overflow hidden）
      ├─ NavigationProgress
      ├─ 当前 A–E 页面模式
      ├─ Modal registry
      └─ FloatingChat
```

- [LAYOUT-005] 根壳使用 `app-shell`，内容画布使用 `page-canvas`。
- [LAYOUT-006] expanded/collapsed 的常驻导航与 overlay 导航共享同一目的地、当前项和 focus 语义；page-canvas 不叠加未经 token 声明的阴影。
- [LAYOUT-007] 根保持 `overflow: hidden`；滚动只属于页面模式声明的集合、detail、timeline、settings content 或宽数据容器。
- [LAYOUT-017] Web 常驻导航路径使用 inset 画布：`page-canvas` 以 `layout.canvas-inset` 内缩的圆角面板呈现于 `app-shell` 上（圆角 `radius.xl`、描边 `surface-border`、阴影 `shadow.surface`）；expanded 时不内缩导航侧，collapsed 时四周全部内缩；overlay 路径（viewport < `responsive.web.collapsed-min`）画布 flush、不加描边与阴影。PageHeader 位于画布面板内部，不挂在 app-shell 上。

## 响应

断点值由 `responsive.web.*` token 携带，行为统一引用 @RESP-001：

- expanded：viewport 不小于 `responsive.web.expanded-min`，展开常驻导航。
- collapsed：viewport 不小于 `responsive.web.collapsed-min` 且小于 `responsive.web.expanded-min`，折叠导航常驻，核心目的地仍可达。
- overlay：viewport 小于 `responsive.web.collapsed-min`，常驻导航退出布局，PageHeader 提供 accessible trigger 与可关闭覆盖导航。
- viewport 小于 `responsive.web.narrow-content-threshold` 仍是 Web overlay；只收缩 actions、A–E 内容和输入布局，不切换为 [`mobile.md`](mobile.md) 的原生 bottom-tab / navigation-stack shell。

## Web 专属规则

- [ROUTE-010] 浏览器 URL 是可恢复状态来源；refresh、back/forward 与 deep link 恢复 included route 的 view、filter、tab 和 selected item。
- [TOKEN-007] route transition progress 的尺寸与颜色读取 `layout.navigation-progress-height` 和当前主题 `brand`。
- [LAYOUT-008] FloatingChat 的 size/inset/clearance 读取 `layout.chat-fab-*`；最后内容和底部工具条避开该净空。
- [LAYOUT-009] 搜索、通知和 toast 可挂 shell 级，但视觉浮层与 page-canvas 对齐并遵守四层表面语义。
