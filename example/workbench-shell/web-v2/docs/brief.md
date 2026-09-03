# Implementation Brief — web-v2 (Workbench Shell / 软件交付与运维事件协作中心)

> 按 ui-template-apply 阶段产物要求落盘；不复制现有 web-v1 业务代码。

## Implementation Brief

- **模板**：`workbench-shell`（来源：multica @ 879d0de…；coverage 见 `templates/workbench-shell/meta.yaml`）。
- **目标**：构建软件交付与运维事件协作中心前端。包含 7 个工作区：收件箱 / 事件列表 / 事件看板 / 服务目录 / 值班日历 / 交付分析 / 工作区设置。
- **平台**：Web（Vite + SPA），与模板 `platforms/web.md` 路径一致。
- **技术栈**：Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (radix-nova) + React Router v7 + TanStack Query + Zustand + Zod + react-hook-form + @dnd-kit + cmdk + sonner + recharts + date-fns + react-day-picker + lucide-react + Vitest + Playwright + oxlint。
- **包管理器**：pnpm。
- **页面范围**：
  - **本次实现**：全部 7 个工作区；App Shell 全局功能（侧栏、搜索、创建、反馈、快捷键）；mock 数据；URL 状态恢复；3 个视口响应式；双主题。
  - **不实现**：真实后端、SSO 登录、Webhook 真实发送、付费/账单、国际化切换（非中文文档化键，但界面文案用中文）。
- **现有约束**：本仓无既有前端项目，独立 `web-v2/` 目录；不依赖 `web-v1/` 业务代码；遵循 `AGENTS.md` 中"不要参考现有 web 内容"。
- **成功标准**（关键流程）：
  1. 跨工作区切换 → 路由与侧栏激活态刷新。
  2. 创建事件 → 列表 / 看板 / 收件箱 / 服务统计同步更新。
  3. 拖动看板卡片变更状态 → 持久化于当前会话。
  4. 全局搜索 `⌘K` → 分类结果 → Enter 跳转并打开详情。
  5. 筛选事件 → URL 携带参数，刷新后恢复。
  6. 设置修改 → 保存反馈 → 危险操作二次确认。
  7. 处理空状态 / 重试失败请求。
- **非目标**：不实现生产部署、不接 CI、不接 OpenAPI codegen（mock 全部使用本地 Promise + 模拟延迟/失败）。

## Taste commitment

- **Mood**：紧凑、工具感、克制品牌蓝、高信息密度。
- **First glance priority**：侧栏激活项 + 当前页 PageHeader 标题 + 主操作按钮。
- **Must stay quiet**：背景、分割线、阴影。
- **Anti-patterns**：居中卡片流、渐变 hero、AI 紫色、emoji 装饰、过多圆角、模糊毛玻璃阴影。
- **Trade-off**：密度 > 装饰；产品界面统一 14px；图表与空态图标可达即可，不追求插画风。

## Token map（templates → 项目）

| 模板角色 | 项目 token | 来源 |
| --- | --- | --- |
| `app-shell` | `--app-shell` | source |
| `page-canvas` / `background` | `--background` | source |
| `surface` / `card` | `--card` | source |
| `surface-raised` / `popover` | `--popover` | source |
| `foreground` / `muted-foreground` | `--foreground` / `--muted-foreground` | source |
| `brand` | `--brand` | default（light）/ source（dark） |
| `success / warning / info / destructive` | 同名 token | source |
| `sidebar*` | `--sidebar*` | source |
| `border / input / ring` | 同名 token | source |
| 字号 10 档 | `--text-*`（micro→display） | source |
| 间距白名单 13 档 | `--space-*` | source |
| 圆角 8 档 | `--radius-*` | source |
| 阴影 surface / menu / floating | `--shadow-*` | source |

## Design direction

- Theme：light + dark 双主题，CSS 变量驱动。
- Type：Inter（fallback PingFang/Microsoft YaHei）+ Geist Mono。
- Density：紧凑；PageHeader/Toolbar 48px；侧栏默认 256px，可拖 200–360；列表行 48px、表头 36px、看板列内卡片 16px gap。
- Radius：控件 6–10px；卡片 14px；徽章胶囊 26px；FAB 9999px。
- Elevation：文档流无阴影；菜单 menu-shadow；弹层 floating-shadow。
- Motion：~150–220ms 过渡；导航进度 2px brand；reduced motion 关闭非必要过渡。

## Route inventory

| Route | 模式 | 说明 |
| --- | --- | --- |
| `/` | A 集合 | 重定向到当前工作区首个 tab |
| `/inbox` | A 集合 | 收件箱 |
| `/events` | A 集合 | 事件列表（表格 + 视图切换） |
| `/events/board` | A 集合 | 事件看板（dnd-kit 列拖动） |
| `/events/:id` | B 主从（弹层） | 事件详情（Sheet） |
| `/services` | A 集合 | 服务目录 |
| `/services/:id` | B 主从（弹层） | 服务详情 |
| `/oncall` | C/D 自定义 | 值班日历（月/周/班次） |
| `/analytics` | E 聚合网格 | 交付分析（指标卡 + 图表） |
| `/settings/*` | C 设置页签 | 基本信息/成员/团队/通知/集成/个人偏好 |

## 状态与数据

- 全部 mock 数据于 `src/lib/mock/`；通过 `src/lib/api/` 模拟 Promise 行为（可控延迟 + 关键字触发失败）。
- Zustand store 持有工作区切换 / 当前用户 / 偏好 / UI 状态。
- TanStack Query 包裹所有"读取"，提供 5s staleTime、retry 1。
- 表单 Zod schema 校验，提交失败保留输入。

## 验收门禁（quality-gates 14 项）

见 ui-template-apply/references/quality-gates.md；本目录用 Playwright + vitest + oxlint + computed style 检查脚本兑现。
