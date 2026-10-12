# Layers

Token → Primitive → Pattern → Page Type。后一层不得重新决定前一层。

## Token

语义色与间距、字体、半径、层级、运动的精确值只写在设计系统 token 文件（如 `tokens.css`）。禁止 `text-gray-500`、`bg-red-500`、未映射 hex、任意 `p-5`。`red ≠ error`。有 published 模板则映射其 `tokens.yaml`；没有则项目级 token 经用户确认后 freeze，不得伪装成 schema v2 模板。已选型组件体系的原生 theming 文件（如 Tailwind/shadcn CSS variables、antd `ConfigProvider` token）是唯一载体的合法形态；不得另建并行第二套 token，也不得要求把已承接原生 theming 的精确值复制到独立 token 文件。

## Primitive

最小控件：Button、Input、Badge、Dialog 等。只消费 token。实现按复用降级阶梯：复用组件体系已有组件并做样式调整 > 组合封装 > fork 源码并承接原生 theming > 从零手写；跳级须有组件体系缺失所需组件的事实依据。混装即换栈：引入第二套组件体系须重开 Architecture gate。复用不豁免注册：停在「安装了 shadcn」不算完成。每个 Primitive 列出 variants / sizes / states（含 disabled、loading、focus-visible）。业务页禁止手写底层 HTML 控件冒充 Primitive。

### Primitive anatomy（内容槽位）

Primitive 不仅是尺寸/颜色的组合，也是**内容槽位的闭集**：`anatomy[]` 列出每个槽位（icon/label/count/shortcut/avatar/status/chevron/…）及顺序、是否必现、内容类型、尺寸 token。无内容的容器用 `anatomy_exempt` 写明理由。图标系统（库、描边、默认尺寸）是 Token 基础层，与字体同级。实现时根元素加 `data-primitive`、槽位加 `data-slot`，Gallery 与 Apply 用同一约定机检。

### 交互 primitive 与主题

tooltip、菜单、右键菜单、可折叠导航等 overlay/disclosure 也是 Primitive，需声明 `interaction`（触发、关闭、放置、覆盖的交互类）与 `open` 状态。源有多主题时 Token 层用 `themes.variants` 给出完整主题与各自的对比度对；实现必须提供主题切换并在每个主题下验证。

## Pattern（主交付）

页面级结构：Page、PageHeader、PageToolbar、PageContent、FilterBar、DataTable/List、Pagination、EmptyState、ErrorState、LoadingState、MasterDetail、DetailPanel、FormSection。

每项声明：slots、允许的 Primitive、禁止组合、数据状态、断点、运动、对应 Page Type。Agent 组装时只选 Pattern，不得重排壳或复制 PageHeader。特殊需求先升级 Pattern，再回填已迁移页。

## Page Type（闭集）

1. List  2. Detail  3. Master-Detail  4. Dashboard  5. Form  6. Settings  7. Wizard

每个纳入范围的路由恰好一个类型。增补必须改 Constitution 并回归。归属歧义记 unresolved，不得静默挑选。禁止为单页 fork `ListPage2`。
