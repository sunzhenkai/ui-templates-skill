import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Inbox as InboxIcon, Filter, Search, X, Archive, CheckCheck, UserPlus, AlertOctagon } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar, ToolbarSection, ToolbarSeparator } from '@/components/app-shell/toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { SkeletonList } from '@/components/shared/skeletons'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { formatRelativeTime } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { toast } from 'sonner'
import type { InboxItem, InboxItemStatus } from '@/lib/types'

const TYPE_LABEL: Record<InboxItem['type'], string> = {
  alert: '告警',
  assignment: '分派',
  mention: '@提及',
  approval: '审批',
  note: '通知',
}

const STATUS_LABEL: Record<InboxItemStatus, string> = {
  unread: '未处理',
  read: '已读',
  archived: '已归档',
  resolved: '已解决',
}

const filterSchema = z.object({
  q: z.string().optional(),
  type: z.enum(['all', 'alert', 'assignment', 'mention', 'approval', 'note']).optional(),
  severity: z.enum(['all', 'SEV1', 'SEV2', 'SEV3', 'SEV4']).optional(),
  status: z.enum(['all', 'unread', 'read', 'archived', 'resolved']).optional(),
})

type FilterValues = z.infer<typeof filterSchema>

export function InboxPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<FilterValues>({
    q: params.get('q') ?? '',
    type: (params.get('type') as FilterValues['type']) ?? 'all',
    severity: (params.get('severity') as FilterValues['severity']) ?? 'all',
    status: (params.get('status') as FilterValues['status']) ?? 'unread',
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const debouncedQ = useDebouncedValue(draft.q, 200)

  const filter = useMemo(() => ({
    q: debouncedQ,
    type: draft.type === 'all' ? undefined : draft.type,
    severity: draft.severity === 'all' ? undefined : draft.severity,
    status: draft.status === 'all' ? undefined : draft.status,
  }), [debouncedQ, draft.type, draft.severity, draft.status])

  // Sync URL when debounced query changes
  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ) next.set('q', debouncedQ)
    if (draft.type !== 'all') next.set('type', draft.type!)
    if (draft.severity !== 'all') next.set('severity', draft.severity!)
    if (draft.status !== 'all') next.set('status', draft.status!)
    setParams(next, { replace: true })
  }, [debouncedQ, draft.type, draft.severity, draft.status, setParams])

  const query = useQuery({
    queryKey: ['inbox', filter],
    queryFn: () => api.inbox(),
  })

  const markMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: InboxItemStatus }) => api.markInbox(ids, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
      setSelected(new Set())
      toast.success('已更新')
    },
    onError: (e) => toast.error('操作失败', { description: e instanceof Error ? e.message : undefined }),
  })

  const items = query.data ?? []
  const filtered = items.filter((i) => {
    if (filter.q && !(i.title.toLowerCase().includes(filter.q.toLowerCase()))) return false
    if (filter.type && i.type !== filter.type) return false
    if (filter.severity && i.severity !== filter.severity) return false
    if (filter.status && i.status !== filter.status) return false
    return true
  })

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))
  const someSelected = filtered.some((i) => selected.has(i.id))
  const unread = items.filter((i) => i.status === 'unread').length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((i) => i.id)))
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function reset() {
    setDraft({ q: '', type: 'all', severity: 'all', status: 'unread' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="收件箱"
        meta={unread ? `${unread} 条未处理` : '全部已处理'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => markMutation.mutate({ ids: Array.from(selected), status: 'read' })} disabled={selected.size === 0}>
              <CheckCheck className="size-4" /> 标记已读
            </Button>
            <Button variant="outline" size="sm" onClick={() => markMutation.mutate({ ids: Array.from(selected), status: 'archived' })} disabled={selected.size === 0}>
              <Archive className="size-4" /> 归档
            </Button>
          </>
        }
      />

      <Toolbar>
        <ToolbarSection className="flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7"
              placeholder="搜索标题、来源…"
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            />
          </div>
          <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as FilterValues['type'] })}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="alert">告警</SelectItem>
              <SelectItem value="assignment">分派</SelectItem>
              <SelectItem value="mention">@提及</SelectItem>
              <SelectItem value="approval">审批</SelectItem>
              <SelectItem value="note">通知</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v as FilterValues['severity'] })}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="等级" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              <SelectItem value="SEV1">SEV1</SelectItem>
              <SelectItem value="SEV2">SEV2</SelectItem>
              <SelectItem value="SEV3">SEV3</SelectItem>
              <SelectItem value="SEV4">SEV4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as FilterValues['status'] })}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="unread">未处理</SelectItem>
              <SelectItem value="read">已读</SelectItem>
              <SelectItem value="resolved">已解决</SelectItem>
              <SelectItem value="archived">已归档</SelectItem>
            </SelectContent>
          </Select>
        </ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection>
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="size-4" /> 重置
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="size-4" /> 保存的筛选
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>已保存的筛选</DropdownMenuLabel>
              <DropdownMenuItem>我负责的 SEV1</DropdownMenuItem>
              <DropdownMenuItem>近期告警</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>保存当前筛选…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ToolbarSection>
      </Toolbar>

      {someSelected ? (
        <div className="flex items-center gap-2 border-b border-border bg-brand/8 px-4 py-2 text-caption">
          <span className="tabular">已选 {selected.size} / {filtered.length}</span>
          <Button variant="ghost" size="sm" onClick={() => markMutation.mutate({ ids: Array.from(selected), status: 'read' })}>
            <CheckCheck className="size-4" /> 标记已读
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast.info('批量分派', { description: '实际项目会弹出选择负责人对话框。' })}>
            <UserPlus className="size-4" /> 批量分派
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast.info('批量关闭', { description: '实际项目需要二次确认。' })}>
            <AlertOctagon className="size-4" /> 批量关闭
          </Button>
          <Button variant="ghost" size="sm" onClick={() => markMutation.mutate({ ids: Array.from(selected), status: 'archived' })}>
            <Archive className="size-4" /> 归档
          </Button>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto" role="region" aria-label="收件箱列表">
        {query.isPending ? (
          <SkeletonList rows={6} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} description={query.error instanceof Error ? query.error.message : undefined} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="size-5" />}
            title={items.length === 0 ? '收件箱暂无事项' : '没有符合条件的事项'}
            description={items.length === 0 ? '新告警、分派和审批会出现在这里。' : '尝试调整关键字或筛选条件。'}
            action={
              items.length > 0 ? (
                <Button variant="outline" size="sm" onClick={reset}>清除筛选</Button>
              ) : undefined
            }
          />
        ) : (
          <table className="w-full table-fixed text-body" role="table">
            <thead>
              <tr className="sticky top-0 z-10 h-9 border-b border-border bg-muted/60 text-left text-micro uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="全选当前结果"
                  />
                </th>
                <th className="w-24 px-3">编号</th>
                <th>事项</th>
                <th className="hidden w-24 px-3 md:table-cell">类型</th>
                <th className="hidden w-24 px-3 md:table-cell">等级</th>
                <th className="hidden w-32 px-3 lg:table-cell">来源</th>
                <th className="hidden w-32 px-3 lg:table-cell">负责人</th>
                <th className="hidden w-24 px-3 md:table-cell">状态</th>
                <th className="hidden w-28 px-3 md:table-cell">时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggle={() => toggleOne(item.id)}
                  onOpen={() => {
                    if (item.refId && (item.type === 'alert' || item.type === 'assignment' || item.type === 'mention')) {
                      navigate(`/events/${item.refId}`)
                    } else if (item.refId && item.type === 'approval') {
                      navigate(`/events`)
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InboxRow({ item, selected, onToggle, onOpen }: {
  item: InboxItem
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  return (
    <tr className="h-12 border-b border-border hover:bg-accent/40">
      <td className="px-3 align-middle">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`选择 ${item.title}`} />
      </td>
      <td className="px-3 align-middle tabular text-caption text-muted-foreground">{item.id}</td>
      <td className="px-3 align-middle">
        <button
          type="button"
          className="-mx-1 flex w-full items-center gap-2 rounded px-1 py-1 text-left text-body font-medium text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          onClick={onOpen}
        >
          {item.status === 'unread' ? <span className="inline-block size-1.5 shrink-0 rounded-full bg-brand" aria-label="未读" /> : <span className="size-1.5 shrink-0" />}
          <span className="truncate">{item.title}</span>
        </button>
      </td>
      <td className="hidden px-3 align-middle md:table-cell">
        <Badge variant="ghost">{TYPE_LABEL[item.type]}</Badge>
      </td>
      <td className="hidden px-3 align-middle md:table-cell">
        {item.severity ? <SeverityBadge severity={item.severity} /> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="hidden px-3 align-middle text-caption text-muted-foreground lg:table-cell">{item.source}</td>
      <td className="hidden px-3 align-middle text-caption text-muted-foreground lg:table-cell">{item.assigneeId ?? '—'}</td>
      <td className="hidden px-3 align-middle md:table-cell">
        <Badge variant={item.status === 'unread' ? 'brand' : 'outline'}>{STATUS_LABEL[item.status]}</Badge>
      </td>
      <td className="hidden px-3 align-middle text-caption tabular text-muted-foreground md:table-cell">{formatRelativeTime(item.createdAt)}</td>
    </tr>
  )
}
