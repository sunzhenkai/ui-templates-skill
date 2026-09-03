# web 平台壳

Web 是本模板的基准平台；颜色、字体、字号与组件值以 [`../spec.md`](../spec.md) 和 [`../tokens.yaml`](../tokens.yaml) 为准。

## 结构

```text
body（h-svh / overflow hidden）
└─ SidebarProvider（h-svh / app-shell）
   ├─ Sidebar（inset）
   └─ SidebarInset（relative / overflow hidden）
      ├─ NavigationProgress
      ├─ 当前页面
      ├─ Modal registry
      └─ FloatingChat
```

- 根壳背景为 `app-shell`；`SidebarInset` 是 `page-canvas` 语义的内容画布。
- 常驻侧栏使用 inset 变体；页面画布不再额外叠加阴影。
- `body` 保持 `overflow: hidden`；滚动只出现在页面列、列表、看板、详情、设置或表格容器。

## 响应

- `<1024px`：侧栏是 288px 覆盖 Sheet；页头提供导航触发器。
- `1024–1279px`：侧栏自动折叠，页头触发器保持可达。
- `1280px+`：侧栏默认展开；主从 / 设置 / 聊天布局保持独立滚动。
- 触控或窄屏下的可编辑文本渲染 16px。

## Web 专属规则

- 浏览器路由是状态唯一来源；刷新、后退和深链接必须恢复页签、视图、过滤、设置页签与选中项。
- URL 改变时在 content canvas 顶部显示 2px brand 进度条；完成后淡出。
- 浮动聊天关闭时，右下角仍为 FAB 预留 56px；批量工具条与最后内容滚动时避开该净空。
- 全局搜索、通知和 toast 可挂壳级，但视觉弹层与页面画布对齐，不得破坏四层表面语义。
