# Phase 3 Project structure

现场边界（模板不提供 adapter）：

| 边界 | 路径 | 职责 |
| --- | --- | --- |
| shell | `src/components/shell/app-shell.tsx`、`src/components/shell/shell-chrome-context.tsx` | App Shell、侧栏槽位、搜索、创建、帮助 FAB、快捷键、PageHeader overlay trigger 上下文 |
| page | `src/pages/*` | A–E 页面模式 |
| shared chrome | `src/components/shared/chrome.tsx` | PageHeader / Toolbar / empty / error / skeleton |
| ui primitives | `src/components/ui/` | shadcn 生成物，不放业务 |
| state | `src/stores/prefs-store.ts` | 主题、侧栏宽度、失败开关、列配置 |
| data | `src/mock/db.ts` + `src/lib/api/client.ts` | 内存 mock + 延迟/失败注入 |
| query | `src/lib/query.ts` | TanStack Query keys / invalidation |
| styling | `src/index.css` | 模板 token → CSS 变量 |
| testing | `src/test/*`, `e2e/*` | Vitest + Playwright |

命令：

- `pnpm dev` 开发
- `pnpm build` 类型检查 + 生产构建
- `pnpm test` Vitest
- `pnpm test:e2e` Playwright（需 `pnpm exec playwright install`）
- `pnpm lint` oxlint

数据/状态不绕过 `client.ts`；样式不绕过 CSS 变量。
