import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { PageHeader } from '@/components/layout/page-header'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { Badge, Button, Checkbox, Input, Select, Skeleton, StateView } from '@/components/ui/primitives'
import { DropdownMenu, MenuItem } from '@/components/ui/overlay'
import { useSimulatedLoad } from '@/lib/page-load'
import { usePersistentState } from '@/lib/storage'
import { formatDateTime, relativeTime } from '@/lib/utils'
import type { InboxItem } from '@/types'

const types = ['alert', 'assignment', 'approval'] as const
const severities = ['sev1', 'sev2', 'sev3', 'sev4'] as const
const statuses = ['unread', 'read', 'closed'] as const
const sources = ['Cloud Monitor', 'Delivery Pipeline', '人工创建'] as const

export function InboxPage() {
  const { data, updateData, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('inbox')
  const [selected, setSelected] = useState<string[]>([])
  const [listWidth, setListWidth] = usePersistentState('workbench.inbox-width', 320)
  const [savedFilters, setSavedFilters] = usePersistentState<Record<string, Record<string, string>>>('workbench.inbox-saved-filters', {})
  const listRef = useRef<HTMLDivElement>(null)
  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    if (!('page' in values)) next.delete('page')
    setParams(next)
  }

  const filters = {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    severity: params.get('severity') ?? '',
    source: params.get('source') ?? '',
    assigneeId: params.get('assigneeId') ?? '',
    range: params.get('range') ?? '',
    status: params.get('status') ?? '',
    page: Math.max(1, Number(params.get('page') ?? 1) || 1),
    pageSize: Math.min(50, Math.max(5, Number(params.get('pageSize') ?? 10) || 10)),
  }
  const activeId = params.get('id')
  const all = data?.inbox ?? []
  const filtered = useMemo(() => all.filter(item => {
    if (filters.q && !`${item.key} ${item.title}`.toLowerCase().includes(filters.q.toLowerCase())) return false
    if (filters.type && item.type !== filters.type) return false
    if (filters.severity && item.severity !== filters.severity) return false
    if (filters.source && item.source !== filters.source) return false
    if (filters.assigneeId && item.assigneeId !== filters.assigneeId) return false
    if (filters.status && item.status !== filters.status) return false
    if (filters.range === 'today' && new Date(item.createdAt).getTime() < Date.now() - 86400000) return false
    return true
  }), [all, filters.assigneeId, filters.q, filters.severity, filters.source, filters.status, filters.type, filters.range])
  const totalPages = Math.max(1, Math.ceil(filtered.length / filters.pageSize))
  const page = Math.min(filters.page, totalPages)
  const rows = filtered.slice((page - 1) * filters.pageSize, page * filters.pageSize)
  const activeItem = all.find(item => item.id === activeId) ?? null
  const activeIndex = filtered.findIndex(item => item.id === activeId)

  const mutateItem = (id: string, changes: Partial<InboxItem>) => updateData(current => ({ ...current, inbox: current.inbox.map(item => item.id === id ? { ...item, ...changes } : item) }))
  const mutateSelected = (changes: Partial<InboxItem>, message: string) => {
    updateData(current => ({ ...current, inbox: current.inbox.map(item => selected.includes(item.id) ? { ...item, ...changes } : item) }))
    showToast({ tone: 'success', title: message, description: `已处理 ${selected.length} 项。` })
    setSelected([])
  }

  if (load.loading) return <LoadingState />
  if (load.error) return <ErrorState message={load.error.message} onRetry={load.reload} />
  if (!data) return null

  return (
    <div className="flex min-h-0 flex-1">
      <section aria-label="收件箱列表" className={`relative min-h-0 flex-col border-r border-border ${activeId ? 'hidden' : 'flex'} lg:flex`} style={{ width: listWidth, minWidth: 240, maxWidth: 480 }}>
        <PageHeader
          title="收件箱"
          description={`${filtered.length} 项待处理`}
          left={<NavigationTrigger />}
          actions={
            <DropdownMenu trigger={({ toggle, open }) => <Button size="sm" aria-expanded={open} onClick={toggle}>筛选</Button>}>
              <MenuItem onSelect={() => {
                setSavedFilters(current => ({ ...current, [new Date().toLocaleString('zh-CN')]: Object.fromEntries(params.entries()) }))
                showToast({ tone: 'success', title: '筛选已保存', description: '当前浏览器可重复使用。' })
              }}>保存当前筛选</MenuItem>
              {Object.entries(savedFilters).map(([name, values]) => (
                <MenuItem key={name} onSelect={() => setParams(new URLSearchParams({ ...values, id: activeId ?? '' }))}>应用：{name}</MenuItem>
              ))}
              <MenuItem onSelect={() => { setParams(new URLSearchParams({ ws: params.get('ws') ?? '', id: activeId ?? '' })) }}>重置筛选</MenuItem>
            </DropdownMenu>
          }
        />
        <div className="grid shrink-0 gap-2 border-b border-border p-3">
          <Input value={filters.q} onChange={event => patch({ q: event.target.value })} placeholder="搜索编号或标题" aria-label="搜索收件箱" />
          <div className="grid grid-cols-2 gap-2">
            <Select aria-label="事项类型" value={filters.type} onChange={event => patch({ type: event.target.value })}>
              <option value="">全部类型</option>{types.map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
            <Select aria-label="严重等级" value={filters.severity} onChange={event => patch({ severity: event.target.value })}>
              <option value="">全部等级</option>{severities.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </Select>
            <Select aria-label="来源" value={filters.source} onChange={event => patch({ source: event.target.value })}>
              <option value="">全部来源</option>{sources.map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
            <Select aria-label="负责人" value={filters.assigneeId} onChange={event => patch({ assigneeId: event.target.value })}>
              <option value="">全部负责人</option>{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </Select>
            <Select aria-label="时间范围" value={filters.range} onChange={event => patch({ range: event.target.value })}>
              <option value="">全部时间</option><option value="today">最近 24 小时</option><option value="week">最近 7 天</option>
            </Select>
            <Select aria-label="处理状态" value={filters.status} onChange={event => patch({ status: event.target.value })}>
              <option value="">全部状态</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-selected p-2">
            <span className="numeric font-caption">已选 {selected.length} 项</span>
            <Button size="sm" onClick={() => mutateSelected({ status: 'read' }, '已批量标记已读')}>标记已读</Button>
            <Button size="sm" onClick={() => mutateSelected({ status: 'closed' }, '已批量关闭')}>批量关闭</Button>
            <Button size="sm" onClick={() => mutateSelected({ assigneeId: data.members[0].id }, '已批量分派')}>分派给 {data.members[0].name}</Button>
            <Button size="sm" onClick={() => { const incidentId=data.incidents[0]?.id; mutateSelected({ incidentId, status: 'read' }, '已批量加入事件'); }}>加入事件</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>取消</Button>
          </div>
        )}

        <div ref={listRef} className="scroll-stable min-h-0 flex-1 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <StateView icon="◉" title="没有通知" description="调整筛选或等待新告警。" />
          ) : rows.map(item => (
            <div key={item.id} className={`mb-1 flex items-start gap-2 rounded-card border border-transparent p-2 hover:bg-surface-hover ${item.id === activeId ? 'border-border bg-surface-selected' : ''}`}>
              <Checkbox label="" aria-label={`选择 ${item.key}`} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(value => value !== item.id))} />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => patch({ id: item.id })}>
                <span className="flex items-center gap-2">
                  {item.status === 'unread' && <span aria-hidden className="size-2 rounded-full bg-brand" />}
                  <span className="truncate font-body">{item.title}</span>
                  {item.status !== 'unread' && <span className="font-caption text-faint">{item.status}</span>}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone={item.severity === 'sev1' ? 'danger' : item.severity === 'sev2' ? 'warning' : 'muted'}>{item.severity.toUpperCase()}</Badge>
                  <Badge>{item.type}</Badge>
                  <span className="numeric font-caption text-muted-foreground">{item.key}</span>
                  <span className="font-caption text-faint">{relativeTime(item.createdAt)}</span>
                </span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border px-3">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => patch({ page: String(page - 1) })}>上一页</Button>
          <label className="flex items-center gap-1 font-caption">
            每页
            <Select className="h-7 w-16" value={String(filters.pageSize)} onChange={event => patch({ pageSize: event.target.value, page: '1' })}>
              {[10, 20, 50].map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
          </label>
          <span className="numeric font-caption">{page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => patch({ page: String(page + 1) })}>下一页</Button>
        </div>

        <div
          role="separator" aria-orientation="vertical" tabIndex={0} aria-label="调整收件箱列表宽度" aria-valuenow={listWidth} aria-valuemin={240} aria-valuemax={480}
          className="absolute inset-y-0 right-0 w-2 cursor-col-resize"
          onKeyDown={event => { if (event.key === 'ArrowLeft') setListWidth(Math.max(240, listWidth - 12)); if (event.key === 'ArrowRight') setListWidth(Math.min(480, listWidth + 12)) }}
          onPointerDown={event => {
            const host = listRef.current?.closest('section') as HTMLElement | null
            if (!host) return
            const startX = event.clientX; const startWidth = listWidth
            const move = (moveEvent: PointerEvent) => setListWidth(Math.min(480, Math.max(240, startWidth + moveEvent.clientX - startX)))
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
            window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
          }}
        />
      </section>

      <section aria-label="事项详情" className={`min-h-0 min-w-0 flex-1 flex-col lg:flex ${activeId ? 'flex' : 'hidden'}`}>
        {!activeItem ? (
          <StateView className="h-full" icon="✉" title="选择一个事项" description="详情、处理动作和上下文会在这里展示。" />
        ) : (
          <>
            <PageHeader
              breadcrumb={[{ label: '收件箱', to: `/inbox?ws=${params.get('ws') ?? ''}` }, { label: activeItem.key }]}
              title={activeItem.title}
              actions={
                <>
                  <Button size="sm" disabled={activeIndex <= 0} onClick={() => patch({ id: filtered[activeIndex - 1].id })} aria-label="上一条">←</Button>
                  <Button size="sm" disabled={activeIndex < 0 || activeIndex >= filtered.length - 1} onClick={() => patch({ id: filtered[activeIndex + 1].id })} aria-label="下一条">→</Button>
                </>
              }
            />
            <div className="scroll-stable min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mx-auto max-w-200 grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={activeItem.severity === 'sev1' ? 'danger' : activeItem.severity === 'sev2' ? 'warning' : 'muted'}>{activeItem.severity.toUpperCase()}</Badge>
                  <Badge>{activeItem.type}</Badge>
                  <Badge tone={activeItem.status === 'unread' ? 'brand' : activeItem.status === 'closed' ? 'muted' : 'success'}>{activeItem.status}</Badge>
                  <span className="numeric font-caption text-muted-foreground">{activeItem.key}</span>
                </div>
                <dl className="grid gap-3 rounded-card border border-border p-3 sm:grid-cols-2">
                  <div><dt className="font-caption text-muted-foreground">来源</dt><dd className="font-body">{activeItem.source}</dd></div>
                  <div><dt className="font-caption text-muted-foreground">负责人</dt><dd className="font-body">{data.members.find(member => member.id === activeItem.assigneeId)?.name ?? '未分派'}</dd></div>
                  <div><dt className="font-caption text-muted-foreground">创建时间</dt><dd className="numeric font-body">{formatDateTime(activeItem.createdAt)}</dd></div>
                  <div><dt className="font-caption text-muted-foreground">关联事件</dt><dd className="font-body">{activeItem.incidentId ?? '无'}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => { mutateItem(activeItem.id, { status: 'read' }); showToast({ tone: 'success', title: '事项已确认' }) }}>确认</Button>
                  <Select aria-label="分派负责人" className="w-auto" value={activeItem.assigneeId} onChange={event => { mutateItem(activeItem.id, { assigneeId: event.target.value }); showToast({ tone: 'success', title: '已分派' }) }}>
                    {data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </Select>
                  <Button onClick={() => { mutateItem(activeItem.id, { status: 'read' }); showToast({ tone: 'success', title: '已标记为已读' }) }}>标记已读</Button>
                  <Button onClick={() => showToast({ tone: 'success', title: '已转为事件', description: activeItem.incidentId ? `关联 ${activeItem.key}` : '已创建新处理上下文。' })}>转为事件</Button>
                  <Button variant="danger" onClick={() => { mutateItem(activeItem.id, { status: 'closed' }); showToast({ tone: 'success', title: '事项已关闭' }) }}>关闭</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid min-h-0 flex-1 gap-3 p-4 lg:grid-cols-[320px_1fr]">
      <div className="grid gap-2"><Skeleton className="h-12" />{[0, 1, 2, 3, 4].map(index => <Skeleton key={index} className="h-16" />)}</div>
      <div className="hidden grid-rows-[auto_1fr] gap-3 lg:grid"><Skeleton className="h-12" /><Skeleton className="h-full" /></div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <StateView tone="danger" className="flex-1" icon="!" title="收件箱加载失败" description={message} action={<Button variant="primary" onClick={onRetry}>重试</Button>} />
}
