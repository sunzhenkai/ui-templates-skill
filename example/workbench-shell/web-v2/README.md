# web-v2 — Workbench Shell / 软件交付与运维事件协作中心

按 [`workbench-shell`](../../../templates/workbench-shell/) 模板实现的 UI Template Apply 样例，业务方向为「软件交付与运维事件协作中心」。

> 本目录不依赖 `web-v1/` 的业务代码；仅按模板 `spec.md` / `tokens.yaml` / `routes-and-layouts.md` / `components.md` / `platforms/web.md` / `apply/playbook.md` / `apply/quality.md` 落盘。

## 技术栈

- Vite + React 19 + TypeScript
- Tailwind CSS v4（`@tailwindcss/vite`）
- shadcn/ui（radix-nova）+ radix-ui 一体包 + lucide-react 图标
- React Router v7（`createBrowserRouter`）
- TanStack Query（异步 mock）+ Zustand（应用 UI 状态，含 `persist` 持久化）
- @dnd-kit（事件看板拖拽）+ cmdk（命令面板）
- recharts（分析图表）+ date-fns + react-day-picker
- react-hook-form + Zod（创建事件表单）
- sonner（Toast）+ lucide-react（图标）+ Geist Variable（字体）
- Vitest（单测）+ @testing-library/react + Playwright（E2E）+ oxlint

## 目录约定

```text
src/
  main.tsx              # 根渲染入口
  App.tsx               # RouterProvider + QueryClientProvider
  routes.tsx            # BrowserRouter 路由表
  index.css             # Tailwind v4 + tokens.css（来自 workbench-shell/tokens.yaml）
  lib/
    utils.ts            # cn / formatDate / formatRelativeTime / pluralize / uid
    types/index.ts      # 领域类型定义
    mock/seed.ts        # deterministic mock seed（workspaces, teams, members, services, incidents, inbox, shifts, metrics, integrations, rules）
    api/mock-api.ts     # 本地 Promise API（可控延迟、forceFail 触发失败）
    api/index.ts        # 重新导出
    stores/app-store.ts # Zustand：当前工作区、侧栏宽度/折叠、命令面板、创建弹窗、帮助、主题（persist）
    hooks/use-keyboard-shortcuts.ts  # 全局快捷键（自动避开输入框）
    hooks/use-debounced-value.ts     # 输入去抖
  components/
    ui/                 # Button / Input / Textarea / Label / Badge / Card / Dialog / Sheet / Tabs / DropdownMenu / Checkbox / Switch / Select / Tooltip / Popover / Separator / Avatar / Skeleton / Command / Collapsible
    app-shell/          # AppShell / Sidebar / PageHeader / Toolbar / WorkspaceSwitcher / ThemeToggle / SearchPalette / CreateIncidentDialog / ShortcutsHelp / NavigationProgress
    shared/             # SeverityBadge / StatusBadge / EmptyState / ErrorState / Skeletons / ConfirmDialog
  pages/
    inbox/              # 收件箱
    events/             # 事件列表 / 事件看板 / 详情 Sheet
    services/           # 服务目录 / 详情 Sheet
    oncall/             # 值班日历（月/周视图、班次编辑、冲突检测）
    analytics/          # 交付分析（指标卡 + 4 个图表 + 排行榜）
    settings/           # 工作区设置（6 个页签 + 邀请成员 / 通知规则 / 集成 / 个人偏好）
  test/setup.ts         # Vitest jsdom 环境 + jest-dom
  test/smoke.test.ts    # 14 个单测（utils + mock api + 状态机）
e2e/smoke.spec.ts       # 8 个 Playwright 用例 × 3 视口 = 24 个 E2E
playwright.config.ts     # 视口：desktop 1440、compact 980、Pixel 7
vitest.config.ts        # Vitest 配置
```

## 命令

```bash
pnpm install
pnpm dev               # http://localhost:5173
pnpm build             # tsc -b && vite build
pnpm preview           # http://localhost:4173
pnpm typecheck         # tsc -b --noEmit
pnpm lint              # oxlint
pnpm test              # vitest run（14 个单测）
pnpm test:e2e:install  # 首次需要下载 chromium
pnpm test:e2e          # playwright test（24 个 E2E）
```

## 模板契约对照

- 表面层级：`app-shell` / `page-canvas` / `surface` / `surface-raised` 严格分层（`src/index.css` 中 `--app-shell` / `--background` / `--surface` / `--surface-raised` / `--popover`）。
- 字号阶梯：只使用 `tokens.yaml` 的 10 档（`--text-micro` 至 `--text-display`）；窄屏可编辑文本 ≥ 16px（见 `index.css` 的 `@media`）。
- 文本灰度：只用 `--foreground` 与 `--muted-foreground`；`--faint-foreground` 仅用于图标 / 占位。
- 双主题：light / dark 角色键一致；通过 `<html class="dark">` 切换（`useAppStore.theme` 持久化）。
- 间距白名单：4px 基数 + 13 档（`tokens.yaml` 的 `spacing.allowed`）。
- 圆角：6–26px 范围 + 胶囊（9999px）。
- 阴影：surface-shadow / menu-shadow / floating-shadow 三档，文档流无阴影。
- App Shell 几何：48px PageHeader / Toolbar；256px 侧栏（可拖 200–360）；16px 页左距；窄屏 288px 抽屉。
- 4 类集合页头 / 工具栏几何：标题左对齐 16px gutter；动作 `flex: 1` 推右。
- URL 状态：搜索 / 筛选 / 排序 / 视图切换 / 设置页签都进 URL（`useSearchParams`）。
- 滚动归属：根 `overflow: hidden`；滚动只发生在面板 / 列表 / 看板列。
- 焦点环：3px ring + 2px offset；icon-only 有 `aria-label`。
- 减少动效：`@media (prefers-reduced-motion: reduce)` 降级过渡。

## 全局系统

- **搜索面板**（`⌘K` / `Ctrl+K`）：跨事件、服务、成员、变更；分组结果；上下选择 + Enter + Esc；分类筛选；模拟加载 / 错误 / 重试。
- **创建事件**（`C`）：标题、影响服务、严重等级、当前状态、负责人、团队、描述、标签、关联变更；Zod schema 校验；提交成功 → 事件计数同步；提交失败 → 保留输入 + 重试。
- **快捷键帮助**（`Shift+?`）：列出 `⌘K` / `C` / `?` / `G I/E/B/S/O/A/,`。
- **导航进度条**：URL 变化时 2px brand 进度；完成后淡出。
- **危险操作二次确认**：`ConfirmDialog` 组件；删除集成 / 通知规则 / 移除成员都走确认。
- **Toast**：成功 / 失败 / 错误；失败带可选重试。
- **置顶事件**：侧栏可折叠分组；列表行可切换置顶。

## 关键流程

1. **跨工作区切换**：侧栏切换器 → 数据上下文刷新但保持当前功能区。
2. **创建事件 → 同步计数**：C 键 / 右上按钮 → 填表 → 提交 → 列表 / 看板 / 收件箱 / 服务统计同步（mock 内存态）。
3. **拖动看板卡片变更状态**：在 `/events/board` 拖动 → optimistic update → TanStack Query cache 即时刷新。
4. **全局搜索**：⌘K → 输入关键字 → 分类结果 → Enter 跳转并打开详情。
5. **URL 状态恢复**：刷新或分享 URL → 筛选 / 视图 / 设置页签全部恢复。
6. **设置修改**：基本信息 / 邀请成员 / 通知规则 / 集成 / 个人偏好 → 保存中 / 成功 / 失败 / 取消 / 未保存提示齐全。
7. **空状态 / 重试失败请求**：每个列表页都覆盖 loading / empty / error + 重试按钮；mock API 支持 `forceFail: true` 注入失败。

## 测试覆盖

### 单测（`pnpm test`，14 个）

- `cn` / `formatRelativeTime` / `formatDate` / `pluralize`
- `api.services()` / `api.listIncidents()` 读 mock
- `api.listIncidents({ severity: 'SEV1' })` 过滤
- `api.listIncidents({ forceFail: true })` 抛错
- `api.createIncident` 新增并更新计数
- `api.updateIncidentStatus` / `assignIncident` / `pinIncident` 写入状态
- `api.upsertShift` 冲突检测
- `api.markInbox` 批量更新

### E2E（`pnpm test:e2e`，24 个）

| 用例 | 视口 |
| --- | --- |
| 侧栏渲染所有路由 + 默认重定向到收件箱 | desktop / compact / mobile |
| 全局键盘：`C` 打开创建事件 + Esc 关闭 | ×3 |
| 搜索面板：`⌘K` 打开 + 输入 + 显示分类结果 | ×3 |
| 事件列表筛选 + 刷新保留 URL 状态 | ×3 |
| 事件看板：5 列布局 + 首卡片渲染 | ×3 |
| 事件详情 Sheet：行点击 → 路由 → 详情 | ×3 |
| 设置页签切换 + URL 持久化 | ×3 |
| 快捷键帮助：`?` 打开对话框 | ×3 |

## 模板反馈（apply 端观察）

1. `apply/quality.md` 的"列表骨架必须复制最终布局"在 `@dnd-kit` 看板里成本较高；当列数 ≥ 5 时，骨架与实际宽度需用相同 `grid-cols-5` 容器，避免过渡抖动。模板当前没有给看板骨架示例，建议回写到 `apply/quality.md`。
2. `components.md` 的 Button"几何：默认文字 14px medium、水平内边距 10px"中文字号与按钮实际字号 14px 一致但 32px 高度的 `padding-block` ≈ 6px，与"水平内边距 10px"组合后 `default` 变体的实际 hit area 与 prose 略偏。建议在模板补一行"按钮 text-sm 默认值 = 14px / 20px，与 token `--text-body` 对齐"。
3. 模板 `components.md` 没有显式给出"行内 checkbox / 菜单 / 按钮不能放在同一行 anchor"的具体反例，建议在 `routes-and-layouts.md §5` 加一个最小反例（events 列表的 pin 按钮 + 标题 link 必须分两个单元格）。
4. 模板默认推荐 dark 主题品牌蓝使用 `oklch(0.65 0.16 255)`；本实现侧栏选中态使用 `sidebar-accent` 而非 `brand/12`，与 `routes-and-layouts.md` 一致；如果消费者需要品牌色选中态，建议在模板 `routes-and-layouts.md` 中说明两者的使用边界。

> 上述反馈仅在 apply 期间观察到的可复用规则缺口；当前业务实现问题已就地解决，未污染模板。

## 设计取舍

- **未引入 SSR / Next.js**：与模板 `platforms/web.md` 的 SPA 路径一致。
- **未引入真实后端 / 真实 SSO / 真实 Webhook**：mock 数据与可控 Promise 全部本地化；失败注入由 `forceFail: true` 触发。
- **未引入额外的状态库**（Redux / Recoil）：TanStack Query 覆盖服务端状态，Zustand 覆盖 UI 状态，React Hook Form 覆盖表单状态。
- **未引入 CSS-in-JS**：完全使用 Tailwind v4 + CSS 变量。
- **图标使用 lucide-react**：与模板现有组件库一致。
