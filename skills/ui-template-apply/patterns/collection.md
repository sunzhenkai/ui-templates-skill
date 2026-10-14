---
name: collection
when: 资源列表、表格、主从选择
blocks: [blocks/data-table, blocks/row-link, blocks/status-badge, blocks/format, blocks/state-boundary]
decisions:
  - key: collection.frame
    options: [bordered, flush]
    default: bordered
  - key: collection.row_height
    options: [36, 44]
    default: 36
  - key: collection.paging
    options: [load_more, pages]
    default: load_more
  - key: collection.row_action
    options: [navigate, select]
    default: navigate
self_review:
  - 每列声明了 meta.kind；除 primary 外的列都考虑过 priority（2/3 会在窄容器隐藏）
  - 行导航用 rowHref（真实链接），没有 tr onClick / navigate()
  - 时间、数字、ID、状态全部走 Time / Num / Id / StatusBadge
  - 列数 ≤ 7；更多信息去详情页
  - 480px 容器宽度下是两行列表，不出现横向滚动
  - 列表没有自己的滚动容器
  - 表格是一个可辨认的区域：默认 frame=bordered（外框、圆角、表头底色、行分割线）；已在 Card/Sheet 里时用 frame="flush"，不出现双层边框
  - 空态 / 加载态占据表格的位置（同宽、同起点），不会让页面结构跳动
---

# Collection

列的**语义**决定渲染：`kind` 控制对齐、截断、等宽数字；`priority` 控制在多窄时隐藏。
不要写宽度、不要写颜色；primary 列吸收剩余宽度。原型：`reference/src/pages/collection.tsx`（`Page` → `Toolbar` → DataTable），空集原型 `empty.tsx`。

```tsx
const columns: ColumnDef<Job>[] = [
  { accessorKey: "name", header: "名称", meta: { kind: "primary" } },
  { accessorKey: "status", header: "状态", meta: { kind: "status" }, cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  { accessorKey: "id", header: "ID", meta: { kind: "id", priority: 3 }, cell: ({ getValue }) => <Id value={getValue<string>()} /> },
  { accessorKey: "count", header: "条数", meta: { kind: "number", priority: 2 }, cell: ({ getValue }) => <Num value={getValue<number>()} /> },
  { accessorKey: "updatedAt", header: "更新于", meta: { kind: "time" }, cell: ({ getValue }) => <Time value={getValue<string>()} /> },
  { id: "actions", header: "", meta: { kind: "actions" }, cell: ({ row }) => <RowMenu job={row.original} /> },
]

const jobs = useInfiniteQuery({
  queryKey: ["jobs", filters], queryFn: ({ pageParam }) => api.listJobs({ ...filters, cursor: pageParam }),
  initialPageParam: undefined as string | undefined, getNextPageParam: (last) => last.nextCursor,
  select: (d) => ({ items: d.pages.flatMap((p) => p.items), total: d.pages[0]?.total }), // 拍平，StateBoundary 拿到的就是一页
})

<StateBoundary query={jobs} isEmpty={(page) => page.items.length === 0} empty={{ title: "还没有任务", action: <Button size="sm">新建任务</Button> }}>
  {(page) => (
    <DataTable label="任务" columns={columns} data={page.items} getRowId={(j) => j.id}
      rowHref={(j) => `/jobs/${j.id}`}
      paging={{ total: page.total, hasMore: jobs.hasNextPage, loadingMore: jobs.isFetchingNextPage, onLoadMore: () => jobs.fetchNextPage() }} />
  )}
</StateBoundary>
```

规则
- `paging` 必填，按接口如实声明：
  - 接口一次返回整个集合（无 limit、无游标）→ `paging="complete"`；
  - 有游标 → useInfiniteQuery，`total` 用接口给的总数（列表接口没有时用同一数据源的计数接口，筛选后拿不到就不传）；
  - 只有 `limit` 没有游标 → `useLimitPaging(step, max)`：满页即“还有更多”，加载更多 = 加大 limit，到接口上限显示“已达上限，请筛选”；
  - 接口按 `offset`（或 `page`）取页并返回筛选后总数 → `paging={{ mode: "pages", page, pageSize, total, onPage }}`：页脚显示真实总数 +
    `第 n / 共 P 页` + 上一页/下一页（可选 `pageSizeOptions` 每页选择）；`total` 必须是接口返回的总数（不许用已加载行数）；
    页码与筛选都进 URL，筛选变化回第 1 页；请求进行中传 `loading`（翻页按钮禁用）。
- 底部永远不把已加载数当总数：`共 m 项` / `已加载 n / 共 m 项` / `已加载 n 项，还有更多`；有更多时同时有「加载更多」按钮和滚到底自动加载的哨兵；
  pages 模式的页脚写接口给的总数，`data-has-more` 由 `page < pageCount` 得出。

```tsx
// pages 模式（接口：GET /jobs?offset=&limit=&status=… → { items, total }）
const jobs = useQuery({ queryKey: ["jobs", { status, page }], queryFn: () => api.listJobs({ status, offset: (page - 1) * 100, limit: 100 }), placeholderData: keepPreviousData })
<DataTable label="任务" columns={columns} data={[...jobs.data.items]} getRowId={(j) => j.id} rowHref={(j) => `/jobs/${j.id}`}
  paging={{ mode: "pages", page, pageSize: 100, total: jobs.data.total, loading: jobs.isFetching, onPage: (next) => setPage(String(next)) }} />
```
- 表头在滚动区里吸顶（DataTable 内建，不透明、无缝）；表格容器不横向滚动（列按优先级隐藏）。
- 超过 200 行（`VIRTUALIZE_ABOVE`）DataTable 自动窗口化：TanStack Virtual，滚动元素是外层 `data-scroll-region`，DOM 里只有可见行 + overscan，
  空隙用 `[data-spacer]` 占位行；吸顶表头、RowLink、焦点行（保持挂载）、aria-rowindex、加载更多哨兵都照常。`virtualize` 可强制开/关；
  行高固定（表格 40px），不要在行里放会改变高度的内容。check_rendered R19：已加载 >200 行时 DOM 行数必须 ≤200。
- check_rendered R17（吸顶表头）、R18（页脚计数 / 接口报告还有更多时必须有加载更多）兜底。
- 排序：只给真正有用的列开 `enableSorting`。排序归属二选一，不混用：
  - 数据全部在内存（或只排已加载行可以接受）→ 不传 `sorting`，DataTable 客户端排序。
  - 数据在客户端但分批显示（mock / 已全量拉取，只是 load more 展示）→ 先对完整数组排序再切片：
    `const sorted = useMemo(() => sortRows(all, sorting), [all, sorting]); <DataTable data={sorted.slice(0, shown)} sorting={sorting} onSortingChange={…} />`，
    排序变化时 `shown` 回到第一批；不要只对已显示的行排序。
  - 分页 / 加载更多 / 服务端排序 → URL 是唯一来源：`sorting={parseSort(sort)} onSortingChange={(s) => setSort(formatSort(s))}`，
    sort 进查询 key 与请求参数；传了 `sorting` 后表格不再自己重排。
- 行内操作 ≤ 1 个图标按钮 + 溢出菜单；操作列 `kind: "actions"` 会自动浮在 RowLink 之上。
- 主从布局（左列表右详情）用 `selectedId + onSelect`，并把选中 id 写进 URL。
- 空集区分两种：从未有数据（EmptyState + 创建入口）与筛选无结果（`vocab.copy.noResults` + 清除筛选）。
- 卡片网格只用于以图片/预览为主的资源；文字资源一律表格。
