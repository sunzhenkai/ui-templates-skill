---
name: shell
when: 应用骨架：侧边导航、顶栏、整体滚动与画布
blocks: [blocks/app-shell, blocks/theme, blocks/theme-menu, blocks/router, ui/sidebar, ui/sonner, blocks/confirm]
decisions:
  - key: shell.sidebar
    options: [inset, sidebar, floating]
    default: inset
  - key: shell.canvas
    options: [app-shell, background]
    default: app-shell
self_review:
  - 文档（document）是唯一滚动容器；页面里没有 h-screen / 100vh / overflow-auto 包裹整页
  - 当前导航项 aria-current="page"，折叠为图标时仍有 tooltip
  - 768px 以下侧栏变成 sheet，内容不被挤压
  - Toaster、ConfirmProvider、ThemeProvider、TooltipProvider 各只挂一次，在根部
  - 侧栏与内容画布靠底色区分（app-shell 底 vs 内容 background），深色下差异仍可见
---

# Shell

一个应用一个 `AppShell`。顺序固定：`ThemeProvider > ConfirmProvider > TooltipProvider > Router`，`<Toaster />` 与路由并列。
TooltipProvider 必须有：折叠侧栏的 tooltip 依赖它。

```tsx
// src/app/root.tsx
import { Outlet } from "react-router"
import { FolderIcon, SettingsIcon } from "lucide-react"
import { AppShell, ShellBrand } from "@/components/blocks/app-shell"

const nav = [
  { items: [{ label: "项目", to: "/projects", icon: FolderIcon }] },
  { label: "系统", items: [{ label: "设置", to: "/settings", icon: SettingsIcon }] },
]

export function Root() {
  return (
    <AppShell brand={<ShellBrand title="产品名" subtitle="环境" />} nav={nav} footer={<ThemeMenu />}>
      <Outlet />
    </AppShell>
  )
}
```

```tsx
// src/main.tsx
createRoot(el).render(
  <ThemeProvider><ConfirmProvider><TooltipProvider>
    <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
    <Toaster position="bottom-right" />
  </TooltipProvider></ConfirmProvider></ThemeProvider>,
)
```

规则
- 导航只放真实的业务入口：不放演示/示例路由（如“空状态示例”）、不放创建动作（放页头主操作）、不重复同一资源。
- 导航分组 ≤ 3 组、每组 ≤ 7 项；超过就该有二级导航（settings 的 SectionLayout），而不是更长的侧栏。
- 路由的 `errorElement` 用 `RouteError`，`*` 路由用 `NotFound`（blocks/app-errors）。
- 主题切换用 `<ThemeMenu />`（blocks/theme-menu）放侧栏 footer：浅色 / 深色 / 跟随系统；文案用 `labels` 改，不要再手写菜单。
- 侧栏宽度、圆角、画布颜色都来自 theme.css；不要在 shell 上写颜色或尺寸。
- 命令面板（可选）：`<CommandDialog open onOpenChange><Command><CommandInput/><CommandList>…</CommandList></Command></CommandDialog>`。
  `CommandDialog` 只是外壳，少了内层 `<Command>` 打开即崩溃；⌘K 切换、输入框聚焦时不响应单键快捷键。
- 品牌区用 `ShellBrand`，侧栏状态行用 `ShellNote`；原型见 `reference/src/root.tsx`。
