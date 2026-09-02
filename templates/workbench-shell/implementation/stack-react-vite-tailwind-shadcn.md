# workbench-shell · React + Vite + Tailwind + shadcn Adapter

本文是 workbench-shell 的默认技术栈 adapter。`../spec.md` 仍然是设计规则唯一入口;本文只解释该组合下的目录映射、组件选型、样式 token、常见冲突和工程检查。

> 这不是模板的唯一技术栈。Vue、Svelte、Angular、服务端渲染或其他原生栈仍可使用 workbench-shell,只需自行提供同等 stack adapter,并满足 [quality.md](quality.md)。

## 1. 技术栈职责

| Layer | 默认选择 | 职责 | 不负责 |
| --- | --- | --- | --- |
| Framework | React 18/19 | 组件树、route UI、交互状态 | 全局业务规则 |
| Build | Vite | dev server、build、环境变量 | 设计 token 定义 |
| Styling | Tailwind CSS v4 | utility 组合、theme variables、responsive utilities | API 请求、路由 |
| Components | shadcn / Base UI / Radix 风格组件 | accessible primitives 和交互模型 | 业务字段、API 调用 |
| State | React Query/TanStack Query + 轻量 store | server cache、跨页 shell state | 替代 URL 状态 |
| Router | React Router / TanStack Router / 自研 hash router | route 匹配、导航、历史 | 决定页面布局 |
| Test | Vitest + Testing Library + Playwright | unit/component/browser verification | 替代人工 review |

实际版本由消费项目决定;模板不强制锁定版本。

## 2. 目录映射

默认目录见 [`code-structure.md`](code-structure.md)。React 组合下的映射:

```text
src/
├── app/
│   ├── App.tsx                       # providers + router outlet
│   ├── providers/QueryProvider.tsx
│   ├── providers/ThemeProvider.tsx
│   ├── router/routes.tsx
│   └── global-overlay/OverlayHost.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SidebarNavLink.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── PageHeader.tsx
│   │   ├── Toolbar.tsx
│   │   └── NavigationDrawer.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── checkbox.tsx
│       ├── badge.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       └── tooltip.tsx
├── features/
│   ├── inbox/
│   │   ├── pages/InboxPage.tsx
│   │   ├── components/InboxList.tsx
│   │   ├── components/InboxDetail.tsx
│   │   └── hooks/useInboxSelection.ts
│   ├── incidents/
│   │   ├── pages/EventsPage.tsx
│   │   ├── pages/IncidentDetailPage.tsx
│   │   ├── components/IncidentTable.tsx
│   │   └── components/IncidentKanbanCard.tsx
│   ├── settings/
│   │   ├── pages/SettingsPage.tsx
│   │   └── components/SettingsTabs.tsx
│   └── ...
├── lib/
│   ├── cn.ts
│   ├── format/date.ts
│   └── url-state/
├── stores/
│   └── shell-store.ts
├── services/
│   ├── api-client.ts
│   └── endpoints/incidents.ts
├── mocks/
│   ├── data/incidents.ts
│   ├── handlers/incidents.ts
│   └── README.md
└── styles/
    ├── tokens.css
    ├── base.css
    └── utilities.css
```

### React 映射规则

1. route-level page 放在 `features/<domain>/pages/`,只做 layout 组装和数据 hook 调用。
2. `components/ui/` 不直接调用 API,不包含 incident、service、oncall 等业务字段。
3. `components/layout/` 通过 props/slots 接收 workspace、navigation 和 header 内容。
4. feature 组件只在同域内复用;跨域复用前先泛化 props,再提升。
5. global overlay host 挂在画布卡片内,不挂在根 body。
6. server state 用 query cache;sidebar width、collapsed、theme 等跨页 UI state 才放 store。
7. URL state 通过 `lib/url-state/` 集中解析和序列化。

## 3. Vite 约定

### 环境与路径

- 使用 `@/` alias 指向 `src/`,避免多层相对路径。
- public 资源只放静态文件;设计 token 不放 public。
- API base URL 使用环境变量,但 mock 数据不依赖真实后端。

### Dev/build

消费项目应至少定义:

```bash
pnpm dev        # 本地开发
pnpm build      # type check + production build
pnpm preview    # 构建产物验证
pnpm lint       # static analysis
pnpm test       # unit/component tests
```

命令名可以随项目变化,但 README 或 implementation brief 必须写清实际命令。模板不新增强制依赖。

## 4. Tailwind CSS v4 adapter

### Token 组织

推荐使用三层:

```css
/* styles/tokens.css */
:root {
  --background: ...;
  --foreground: ...;
  --sidebar: ...;
  --sidebar-accent: ...;
  --surface: ...;
  --surface-hover: ...;
  --surface-selected: ...;
  --border: ...;
  --brand: ...;
}

.dark {
  --background: ...;
  --foreground: ...;
}
```

```css
/* app entry or styles/index.css */
@import "tailwindcss";
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/utilities.css";
```

Tailwind v4 可用 `@theme inline` 暴露颜色:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-sidebar: var(--sidebar);
  --color-surface: var(--surface);
}
```

### 九档字号 utility

优先直接暴露模板语义:

```css
@layer utilities {
  .font-micro      { font-size: 11px; line-height: 15px; }
  .font-caption    { font-size: 12px; line-height: 16px; }
  .font-label      { font-size: 13px; line-height: 18px; }
  .font-body       { font-size: 14px; line-height: 20px; }
  .font-body-lg    { font-size: 15px; line-height: 22px; }
  .font-title-sm   { font-size: 16px; line-height: 24px; }
  .font-title      { font-size: 18px; line-height: 28px; }
  .font-title-lg   { font-size: 20px; line-height: 28px; }
  .font-display-sm { font-size: 24px; line-height: 32px; }
}
```

> 推荐使用 `font-*` 而不是 `text-*` 命名字号 utility,以降低与 Tailwind 颜色类合并冲突的概率。项目已有 `text-*` token 时必须额外配置 class merger。

### Tailwind 使用规则

1. 颜色、间距、圆角、阴影优先映射到 theme token,不在页面散写 arbitrary value。
2. `h-12` 这类 utility 只有在明确映射模板 48px 时使用。
3. `overflow-hidden` 只放在 App Shell 和明确需要裁剪的面板。
4. 长滚动列表加 `scrollbar-gutter: stable`。
5. `truncate` 的父链必须有 `min-width: 0`。
6. 状态色 tint 使用低透明度或专用状态 token,不引入第 4 级文字灰度。

## 5. `tailwind-merge` / class merger 风险

### 已知风险

`tailwind-merge` 会按 Tailwind class group 合并冲突类。自定义类如果使用 `text-*`,可能被解析成颜色或字号组。典型错误:

```ts
cn(
  "text-body text-sidebar-foreground",
  active && "text-sidebar-foreground"
)
```

最终 DOM 可能只剩 `text-sidebar-foreground`,导致 `text-body` 消失,实际 `font-size` 回落到 16px。源码里写了 token 不代表最终 computed style 正确。

### 处理方式

任选一种,并在 quality gate 中验证:

1. **推荐**自定义 utility 不使用 `text-*` 命名字号,例如 `font-body`、`font-caption`。
2. 配置 `tailwind-merge` 的 custom class group,把模板 token 明确归类。
3. 不把冲突 token 经过 `cn()`;直接拆分到子元素。
4. 在 review 中读取最终 DOM class 和 `getComputedStyle().fontSize`,不只检查源码。

### 检查脚本思路

消费项目可以用 Playwright 或 browser-use 采样以下元素:

| 元素 | 期望 | 检查 |
| --- | --- | --- |
| sidebar nav row | 14px / 20px | `fontSize`, `lineHeight`, DOM class |
| page description | 12px / 16px | 同上 |
| metric value | 24px / 32px | 同上 |
| dialog title | 16px / 24px | 同上 |
| dialog description | 12px / 16px | 同上 |

若 actual 与 expected 不一致,先检查最终 class,再检查 CSS layer 和 class merger。

## 6. shadcn 选型与适配

### 选型顺序

1. **Use as-is**:组件语义和交互满足模板,只替换颜色 token。
2. **Adapt**:修改高度、圆角、字号、焦点环、边框、hover/selected。
3. **Compose**:用 Dialog、Popover、Command、Table 等 primitives 组装 SearchPalette、PageHeader、KanbanCard。
4. **Custom**:模板行为特殊且 shadcn 组合成本高于收益时自研,但必须补齐 a11y。

### 常见映射

| workbench 需求 | shadcn 起点 | 适配重点 |
| --- | --- | --- |
| NavLink | Link + custom | `<a href>`、`aria-current`、sidebar hover/current |
| PageHeader | custom + Button | 48px、truncate、action shrink-0 |
| NavigationDrawer | Sheet/Dialog | dialog 语义、focus return、route close |
| DataTable | Table + custom | `<table>`、scope、sortable control、selection |
| KanbanCard | custom | draggable 替代操作、selected、moving state |
| SearchPalette | Command + Dialog | listbox/option、loading、empty、Enter/Arrow |
| WorkspaceSwitcher | DropdownMenu | menu semantics、selected workspace、brand dot |
| ConfirmDialog | AlertDialog | dangerous action、focus、Esc |
| Toast | Toast/Sonner | role、retry action、不遮挡关键操作 |
| Form controls | Input/Select/Checkbox/Switch | label、description、error、disabled、saving |

### 适配禁例

1. 不要为了视觉把 `<a>` 改成 `<button>`。
2. 不要删除 Radix/Base UI 的 focus、`aria-*` 或 keyboard 行为。
3. 不要让 icon-only 组件只依赖 tooltip 提供 accessible name。
4. 不要把业务 API 调用放进 `components/ui/`。
5. 不要为单个页面提前抽象 shared component。

## 7. 路由与 URL state

### 推荐

- 用 router 的 path 定义 workspace、resource 和 detail。
- 用 search params 保存 `id`、`tab`、`view`、`q`、`status`、`severity`、`page`、`sort`。
- 选中实体用 push;筛选输入可用 replace 防止历史爆炸。
- 刷新、前进、后退必须恢复。

### React 实现要点

1. `useSearchParams` 或 router 等价 API 作为 URL source of truth。
2. 在 route component 初始化时 parse + validate,不使用未校验字符串。
3. 更新选中项时同步 sidebar/drawer 状态。
4. 无效枚举映射默认值;无效 id 渲染 not found。
5. 一次性 intent query 在成功或失败后移除。

## 8. 状态与数据

### Server state

使用 React Query/TanStack Query 或等价方案:

```text
services/endpoints/incidents.ts   fetch/create/update
features/incidents/hooks/useIncidents.ts
features/incidents/pages/EventsPage.tsx
```

query key 包含 workspace、filters、pagination 等真实依赖。mutation 成功后更新 cache、invalidate 相关 query 或显式刷新。

### Client state

只有跨页面 shell state 放 Zustand/store:

- sidebar width
- sidebar collapsed
- mobile drawer open
- theme
- 当前 workspace(如未放入 route)

页面选中项、tab、view、form draft 不应默默放入 global store;它们属于 URL state 或 page state。

## 9. 可访问性实现要点

1. NavLink 使用 `<Link>` 且最终渲染 `<a href>`。
2. 当前 route 通过 router 匹配后设置 `aria-current="page"`。
3. NavigationDrawer 使用 dialog semantics,`aria-modal="true"`。
4. route change 后关闭 drawer。
5. icon-only Button 用 `aria-label` 或 `sr-only` 文本。
6. tabs 保持 tablist/tab/tabpanel 关系。
7. table header 使用 `scope` 或等价 ARIA;sort 控件说明当前方向。
8. async error 使用 `role="alert"` 或 `aria-live="polite"`。
9. focus-visible ring 不被 `overflow-hidden` 裁剪。

## 10. 工程检查

### 静态与单元

消费项目应配置:

1. TypeScript strict。
2. ESLint/oxlint。
3. Prettier 或等效 format check。
4. Vitest unit/component tests。
5. Testing Library 检查 role、label、keyboard。

最低测试:

- URL parse/serialize。
- Sidebar current route。
- drawer route close。
- PageHeader truncation 和 action。
- table row selection 与 open 分离。
- dialog focus return。
- custom font utility computed style。

### Browser verification

使用 Playwright 或 browser-use 验证:

1. 1440×900。
2. 900×900。
3. 390×844 或 480×900。
4. console 无 error。
5. AX tree name/role。
6. 关键 computed style。
7. URL refresh/back/forward。
8. loading/empty/error/not found。

### Definition of Done

- [ ] TypeScript build 通过。
- [ ] lint/format 通过。
- [ ] unit/component tests 通过。
- [ ] browser matrix 通过。
- [ ] Tailwind token 没有被 class merger 移除。
- [ ] shadcn 组件语义没有被视觉适配破坏。
- [ ] 没有把业务 API 放进 shared UI。
