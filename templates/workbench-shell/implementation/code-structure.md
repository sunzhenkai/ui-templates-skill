# workbench-shell · Code Structure

本文定义消费项目中的目录、命名和边界约定。技术栈无关的视觉与交互规则以 [`../spec.md`](../spec.md) 为准;React + Vite + Tailwind + shadcn 的默认落地见 [`stack-react-vite-tailwind-shadcn.md`](stack-react-vite-tailwind-shadcn.md)。

## 1. 目录契约

默认采用 feature-first + shared UI 的结构:

```text
src/
├── app/
│   ├── App.tsx
│   ├── providers/
│   ├── router/
│   ├── routes/
│   ├── error-boundary/
│   └── global-overlay/
├── components/
│   ├── layout/
│   │   ├── app-shell/
│   │   ├── sidebar/
│   │   ├── page-header/
│   │   ├── toolbar/
│   │   └── drawer/
│   └── ui/
│       ├── button/
│       ├── input/
│       ├── select/
│       ├── checkbox/
│       ├── badge/
│       ├── table/
│       ├── tabs/
│       └── dialog/
├── features/
│   ├── inbox/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── incidents/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── services/
│   ├── oncall/
│   ├── analytics/
│   ├── settings/
│   └── search/
├── lib/
│   ├── format/
│   ├── url-state/
│   ├── a11y/
│   └── cn.ts
├── stores/
├── services/
│   ├── api-client/
│   └── endpoints/
├── mocks/
│   ├── handlers/
│   ├── data/
│   └── README.md
├── styles/
│   ├── tokens.css
│   ├── base.css
│   └── utilities.css
└── test/
    ├── setup.ts
    ├── browser/
    └── fixtures/
```

目录职责:

| 目录 | 只允许放 | 不允许放 |
| --- | --- | --- |
| `app/` | 应用入口、providers、router、global boundary、全局 overlay 编排 | 业务表单、卡片、表格 |
| `components/layout/` | AppShell、Sidebar、PageHeader、Toolbar、Drawer、Resize control | 只属于一个业务域的卡片或表单 |
| `components/ui/` | 跨域 primitives:Button、Input、Badge、Dialog 等 | API 调用、业务实体字段、workspace 专属文案 |
| `features/<domain>/pages/` | route-level 页面组装 | 可复用的通用 Button/Input |
| `features/<domain>/components/` | 只属于该业务域的 composed component | 其他域直接引用的通用控件 |
| `features/<domain>/hooks/` | 该域数据、筛选、选中、拖拽 hook | 跨域全局状态 |
| `lib/` | 纯工具、format、URL state、class merge helper | React 组件、API 请求 |
| `stores/` | 跨页面 client state | server cache 的重复真相源 |
| `services/` | API client、endpoint、类型化请求 | UI 样式或 toast 文案 |
| `mocks/` | mock 数据、延迟、失败开关 | 生产逻辑依赖的实现细节 |
| `styles/` | tokens、reset、base、utility | 页面专属一次性样式 |
| `test/` | setup、fixtures、browser helpers | 生产逻辑 |

## 2. 归属判断

### 组件归属

按以下顺序判断:

1. 是否只是命令或输入 primitive,且不包含业务字段?  
   → `components/ui/`。
2. 是否是 App Shell、页面 chrome、导航、工具栏或 drawer?  
   → `components/layout/`。
3. 是否只服务于一个 route/domain?  
   → `features/<domain>/components/`。
4. 是否被两个以上 domain 复用,且业务语义可以泛化?  
   → 先抽象 props,再放入 `components/ui/` 或 `components/layout/`。
5. 是否只是某个页面的私有子组件?  
   → 放在同域 `components/`,不要提前提升。

### Hook 归属

- 只服务一个 domain 的数据、筛选、选中、拖拽: `features/<domain>/hooks/`。
- URL 解析、序列化、焦点恢复、media query: `lib/` 或 `components/layout/` 内部。
- 跨页面 shell state: `stores/`。
- server data 的 cache/query hook: `features/<domain>/hooks/`,但请求函数在 `services/`。

### 状态归属

| 状态类型 | 归属 | 示例 |
| --- | --- | --- |
| URL state | route/search params | `?id=`、`?tab=`、`?view=`、`?page=` |
| server state | query/cache + `services/` | 事件列表、服务详情、成员 |
| cross-page client state | `stores/` | sidebar width、collapsed、drawer open、theme |
| page-local state | page/component state | 本地草稿、临时展开、未确认选择 |
| form state | form library 或 local form state | 创建事件、设置表单 |

不要把 server response 原样复制进 global store;除非确实需要跨页面共享和手动更新。

## 3. 命名约定

### 文件与目录

- 目录使用 kebab-case:`page-header/`、`url-state/`。
- 组件文件使用 PascalCase:`PageHeader.tsx`、`KanbanCard.tsx`。
- hook 文件使用 camelCase 并以 `use` 开头:`useIncidentFilters.ts`。
- 普通工具文件使用 camelCase:`formatDate.ts`。
- 测试文件与被测对象同名:`PageHeader.test.tsx`、`useUrlState.test.ts`。

### 组件命名

| 类型 | 规则 | 示例 |
| --- | --- | --- |
| App Shell | `AppShell` | `components/layout/app-shell/AppShell.tsx` |
| 页面 chrome | `XxxHeader` / `XxxToolbar` | `PageHeader.tsx`、`EventsToolbar.tsx` |
| Primitive | 通用名,不带业务 | `Button.tsx`、`DataTable.tsx` |
| 业务组件 | `<Domain><Thing>` | `IncidentKanbanCard.tsx`、`ServiceHealthCard.tsx` |
| 页面 | `<Thing>Page` | `EventsPage.tsx`、`SettingsPage.tsx` |

### Route 命名

- path 使用 kebab-case:`/on-call`、`/notification-rules`。
  项目若选择复数资源名,应全局一致,如 `/events`、`/services`。
- route id 使用点分层级:`inbox`、`events.detail`、`settings.members`。
- query 参数使用 snake/camel 中的一种,全局统一,例如 `?selectedId=` 或 `?selected_id=`。

### State 与 API 命名

- query hook:`useIncidents`、`useServiceDetail`。
- mutation hook:`useCreateIncident`、`useUpdateNotificationRule`。
- selector:`selectActiveWorkspace`、`selectSidebarWidth`。
- API function:`fetchIncidents`、`createIncident`、`updateIntegration`。
- mock handler:`mockIncidentList`、`mockIncidentDetail`。

## 4. API、mock 与数据边界

### 分层

```text
UI component
  → feature hook
    → service endpoint
      → api client / mock handler
```

规则:

1. 页面不直接 `fetch()`。
2. `services/` 只处理请求、类型、错误归一化,不写 UI 文案。
3. `mocks/` 实现与 service 相同的接口;延迟和失败开关只在 mock 层。
4. 错误分为:network、unauthorized、forbidden、not found、validation、unknown。
5. UI 根据 error kind 渲染不同状态;不得把原始 exception 直接展示给用户。
6. 类型定义靠近数据边界,可共享的基础类型放 `services/` 或 `types/`;业务视图类型放 feature。

### Mock 要求

- 至少准备正常数据、空数据、失败响应和权限不足数据。
- 模拟延迟足够观察 skeleton。
- 提供显式失败开关,并记录触发方式。
- 写操作会更新内存数据,使列表、看板、计数和详情保持一致。

## 5. URL state 边界

推荐集中实现:

```text
lib/url-state/
├── parse.ts
├── serialize.ts
├── schema.ts
└── README.md
```

规则:

1. 每个 route 定义允许的 params、默认值、枚举和校验器。
2. parse 失败时返回默认值或 not found 意图,不产生半初始化页面。
3. serialize 保持稳定顺序,避免每次 render 改写历史记录。
4. 更新 URL 时决定 replace/push:筛选输入用 replace,显式选中/打开用 push。
5. 一次性意图参数消费后删除。

## 6. 样式与 token 边界

### 放置

- 设计 token、主题变量: `styles/tokens.css`。
- element reset、base typography: `styles/base.css`。
- 模板 utility:`styles/utilities.css`。
- 组件局部样式优先使用 Tailwind utility;确实重复时才提取组件或 utility。

### Tailwind 注意

自定义字号、密度或状态 utility 必须避免与 Tailwind 命名空间冲突。若使用 `tailwind-merge`,应配置自定义 class group,或在实现后批量比对源码 class 与最终 DOM class、computed style。典型风险是 `text-body` 被颜色类 `text-foreground` 之类合并移除。

详见 [`stack-react-vite-tailwind-shadcn.md`](stack-react-vite-tailwind-shadcn.md)。

## 7. 测试组织

| 类型 | 位置 | 目标 |
| --- | --- | --- |
| unit | 与实现同目录或 `features/<domain>` | URL parse/serialize、format、reducer |
| component | 与组件同目录 | 渲染、状态、keyboard、a11y 基础 |
| route/page flow | `features/<domain>/pages/` | loading、empty、error、选中恢复 |
| shell flow | `components/layout/` | drawer、route link、aria-current、宽度持久化 |
| browser matrix | `test/browser/` | 多视口、console、computed style、截图 |

测试不追求覆盖所有 DOM 细节;优先覆盖模板最容易被破坏的规则:路由语义、状态恢复、滚动归属、可访问名称和响应式。

## 8. 提升/下沉规则

### 提升到 shared

只有同时满足以下条件才提升:

1. 两个以上不相关 domain 需要。
2. props 可以用通用语言描述,不包含业务实体字段。
3. 有清晰的 variants、states、a11y 和测试。

### 从 shared 下沉

出现以下情况时下沉到 feature:

1. 组件包含 workspace、incident、service 等业务字段。
2. 只有单一页面使用。
3. props 大量暴露业务枚举或 API 类型。
4. 修改它只影响一个业务页,但迫使其他消费方理解无关逻辑。

### 禁止

- 把 `components/ui/` 当作未分类目录。
- 为了“以后可能复用”提前抽象。
- 在 shared UI 中直接调用 API。
- 在 layout 组件中硬编码业务列表。
- 绕过 `services/` 在页面组件中拼装 mock 请求。
