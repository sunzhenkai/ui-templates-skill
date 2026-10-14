---
name: filter-search
when: 列表上方的搜索、筛选、排序
blocks: [blocks/router, ui/input-group, ui/select, ui/dropdown-menu]
decisions:
  - key: filter.placement
    options: [toolbar, sidebar]
    default: toolbar
self_review:
  - 所有筛选、搜索词、排序都在 URL 里（useUrlState），可分享、可回退；URL 里有 sort 时它是排序的唯一来源，传给 DataTable 的 `sorting`（见 collection）
  - 搜索输入 debounce 250ms，不是每次按键请求
  - 有激活筛选时显示「清除筛选」
  - 工具栏在窄容器下换行而不是溢出
---

# Filter & Search

```tsx
const [q, setQ] = useUrlState("q")
const [status, setStatus] = useUrlState("status", "all")
const [draft, setDraft] = React.useState(q)
React.useEffect(() => { const t = setTimeout(() => setQ(draft), 250); return () => clearTimeout(t) }, [draft])

<Toolbar>
  <InputGroup className="w-64 max-w-full">
    <InputGroupAddon><SearchIcon /></InputGroupAddon>
    <InputGroupInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="搜索名称" aria-label="搜索" />
  </InputGroup>
  <Select value={status} onValueChange={setStatus}>
    <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
    <SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="failed">失败</SelectItem></SelectContent>
  </Select>
  {(q || status !== "all") && <Button variant="ghost" size="sm" onClick={() => { setDraft(""); setQ(""); setStatus("all") }}>{vocab.copy.clearFilters}</Button>}
</Toolbar>
```

规则
- 工具栏用 `Toolbar`，放在表格上方（Page 的 gap 负责间距），不放进 PageHeader。
- 筛选维度 ≤ 3 个外露；更多放「筛选」下拉。
- 查询 key 包含全部 URL 参数：`["jobs", { q, status }]`。
- 筛选变化时重置分页游标。
