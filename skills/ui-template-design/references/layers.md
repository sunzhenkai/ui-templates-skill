# Layers

Token → Primitive → Pattern → Page Type。后一层不得重新决定前一层。

## Token

语义色与间距、字体、半径、层级、运动的精确值只写在设计系统 token 文件（如 `tokens.css`）。禁止 `text-gray-500`、`bg-red-500`、未映射 hex、任意 `p-5`。`red ≠ error`。有 published 模板则映射其 `tokens.yaml`；没有则项目级 token 经用户确认后 freeze，不得伪装成 schema v2 模板。

## Primitive

最小控件：Button、Input、Badge、Dialog 等。只消费 token。可领养组件库源码，但必须改走本项目 token。停在「安装了 shadcn」不算完成。每个 Primitive 列出 variants / sizes / states（含 disabled、loading、focus-visible）。业务页禁止手写底层 HTML 控件冒充 Primitive。

## Pattern（主交付）

页面级结构：Page、PageHeader、PageToolbar、PageContent、FilterBar、DataTable/List、Pagination、EmptyState、ErrorState、LoadingState、MasterDetail、DetailPanel、FormSection。

每项声明：slots、允许的 Primitive、禁止组合、数据状态、断点、运动、对应 Page Type。Agent 组装时只选 Pattern，不得重排壳或复制 PageHeader。特殊需求先升级 Pattern，再回填已迁移页。

## Page Type（闭集）

1. List  2. Detail  3. Master-Detail  4. Dashboard  5. Form  6. Settings  7. Wizard

每个纳入范围的路由恰好一个类型。增补必须改 Constitution 并回归。归属歧义记 unresolved，不得静默挑选。禁止为单页 fork `ListPage2`。
