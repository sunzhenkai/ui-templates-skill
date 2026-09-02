import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { PageHeader, Toolbar } from '@/components/layout/page-header'
import { Badge, Button, Checkbox, Input, Select, Skeleton, StateView } from '@/components/ui/primitives'
import { ConfirmDialog, DropdownMenu, MenuItem } from '@/components/ui/overlay'
import { CreateIncidentDialog } from '@/components/global/create-incident-dialog'
import { createExport } from '@/mocks/api'
import { useSimulatedLoad } from '@/lib/page-load'
import { usePersistentState } from '@/lib/storage'
import { formatDateTime, relativeTime } from '@/lib/utils'
import type { Incident, IncidentStatus, Severity } from '@/types'

const statuses: IncidentStatus[] = ['pending', 'processing', 'waiting', 'resolved', 'archived']
const severities: Severity[] = ['sev1', 'sev2', 'sev3', 'sev4']
const allColumns = ['key', 'title', 'status', 'severity', 'serviceId', 'assigneeId', 'createdAt', 'resolvedAt', 'updatedAt'] as const
type Column = typeof allColumns[number]
const labels: Record<Column, string> = { key: '编号', title: '标题', status: '状态', severity: '严重等级', serviceId: '影响服务', assigneeId: '负责人', createdAt: '开始时间', resolvedAt: '解决时间', updatedAt: '更新时间' }

export function EventsPage() {
  const { data, updateData, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('events')
  const [selected, setSelected] = useState<string[]>([])
  const [confirm, setConfirm] = useState<'delete' | 'archive' | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [columns, setColumns] = usePersistentState<Column[]>('workbench.event-columns', ['key', 'title', 'status', 'severity', 'serviceId', 'assigneeId', 'updatedAt'])
  const [columnWidths, setColumnWidths] = usePersistentState<Partial<Record<Column, number>>>('workbench.event-widths', {})

  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    if (!['page', 'sort'].includes(Object.keys(values)[0])) next.delete('page')
    setParams(next)
  }
  const get = (key: string) => params.get(key) ?? ''
  const multi = (key: string) => get(key) ? get(key).split(',') : []
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const pageSize = Math.min(50, Math.max(5, Number(params.get('pageSize') ?? 10) || 10))
  const sort = params.get('sort') ?? '-updatedAt'
  const rowsAll = data?.incidents ?? []
  const filtered = useMemo(() => {
    const q = get('q').toLowerCase()
    const result = rowsAll.filter(item => {
      if (q && !`${item.key} ${item.title} ${item.summary}`.toLowerCase().includes(q)) return false
      if (multi('status').length && !multi('status').includes(item.status)) return false
      if (multi('severity').length && !multi('severity').includes(item.severity)) return false
      if (get('serviceId') && item.serviceId !== get('serviceId')) return false
      if (get('assigneeId') && item.assigneeId !== get('assigneeId')) return false
      if (get('reporterId') && item.reporterId !== get('reporterId')) return false
      if (multi('tag').length && !multi('tag').some(tag => item.tagIds.includes(tag))) return false
      if (get('range') === '7d' && new Date(item.createdAt).getTime() < Date.now() - 7 * 86400000) return false
      return true
    })
    const direction = sort.startsWith('-') ? -1 : 1
    const field = (sort.startsWith('-') ? sort.slice(1) : sort) as keyof Incident
    return result.sort((left, right) => {
      const a = String(left[field] ?? ''); const b = String(right[field] ?? '')
      return a.localeCompare(b) * direction
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsAll, params, sort])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize)

  const bulk = (action: 'delete' | 'archive') => {
    if (!confirm) return
    updateData(current => ({
      ...current,
      incidents: current.incidents.flatMap(item => {
        if (!selected.includes(item.id)) return [item]
        if (action === 'delete') return []
        return [{ ...item, status: 'archived', updatedAt: new Date().toISOString() }]
      }),
    }))
    showToast({ tone: 'success', title: action === 'delete' ? '事件已删除' : '事件已归档', description: `处理了 ${selected.length} 条记录。` })
    setSelected([]); setConfirm(null)
  }

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><div className="grid gap-3"><Skeleton className="h-12" /><Skeleton className="h-12" />{[0,1,2,3,4,5].map(index => <Skeleton key={index} className="h-11" />)}</div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="事件加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data) return null
  const activeFilters = [
    get('q') && { label: `搜索: ${get('q')}`, clear: 'q' }, ...multi('status').map(value => ({ label: `状态: ${value}`, clear: `status:${value}` })),
    ...multi('severity').map(value => ({ label: `等级: ${value}`, clear: `severity:${value}` })), get('serviceId') && { label: '服务', clear: 'serviceId' },
    get('assigneeId') && { label: '负责人', clear: 'assigneeId' }, get('reporterId') && { label: '创建人', clear: 'reporterId' },
  ].filter(Boolean) as { label: string; clear: string }[]

  const removeFilter = (value: string) => {
    const next = new URLSearchParams(params)
    if (value.includes(':')) {
      const [key, item] = value.split(':')
      next.set(key, (next.get(key) ?? '').split(',').filter(entry => entry !== item).filter(Boolean).join(','))
      if (!next.get(key)) next.delete(key)
    } else next.delete(value)
    setParams(next)
  }
  const sortColumn = (column: Column) => {
    const direction = sort === column ? '-' : ''
    patch({ sort: `${direction}${column}`, page: '1' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="事件列表"
        description={`${filtered.length} 条事件`}
        icon="▤"
        left={<NavigationTrigger />}
        actions={
          <>
            <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>新建事件</Button>
            <Button size="sm" onClick={() => createExport(filtered.map(item => Object.fromEntries(allColumns.map(column => [labels[column], (item as unknown as Record<Column, unknown>)[column] ?? '']))), 'events.csv')}>导出</Button>
            <Button size="sm" onClick={load.reload} aria-label="刷新数据">⟳</Button>
          </>
        }
      />
      <Toolbar>
        <Input className="w-44" value={get('q')} onChange={event => patch({ q: event.target.value })} placeholder="搜索事件" aria-label="搜索事件" />
        <Select className="w-auto" aria-label="状态筛选" value={multi('status').at(-1) ?? ''} onChange={event => patch({ status: event.target.value })}>
          <option value="">全部状态</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}
        </Select>
        <Select className="w-auto" aria-label="严重等级" value={multi('severity').at(-1) ?? ''} onChange={event => patch({ severity: event.target.value })}>
          <option value="">全部等级</option>{severities.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
        </Select>
        <Select className="w-auto" aria-label="影响服务" value={get('serviceId')} onChange={event => patch({ serviceId: event.target.value })}>
          <option value="">全部服务</option>{data.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
        </Select>
        <Select className="w-auto" aria-label="负责人" value={get('assigneeId')} onChange={event => patch({ assigneeId: event.target.value })}>
          <option value="">全部负责人</option>{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
        </Select>
        <Select className="w-auto" aria-label="时间范围" value={get('range')} onChange={event => patch({ range: event.target.value })}>
          <option value="">全部时间</option><option value="7d">最近 7 天</option>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu trigger={({ toggle }) => <Button size="sm" onClick={toggle}>显示列</Button>}>
            {allColumns.map(column => <MenuItem key={column} onSelect={() => setColumns(current => current.includes(column) ? current.filter(value => value !== column) : [...current, column])}>{columns.includes(column) ? '✓ ' : ''}{labels[column]}</MenuItem>)}
          </DropdownMenu>
        </div>
      </Toolbar>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <span className="font-caption text-muted-foreground">已生效：</span>
          {activeFilters.map(filter => (
            <button key={filter.clear} type="button" onClick={() => removeFilter(filter.clear)} className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5 font-caption hover:bg-surface-hover">
              {filter.label}<span aria-hidden>×</span>
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setParams(new URLSearchParams({ ws: params.get('ws') ?? '' }))}>清空</Button>
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-selected px-4 py-2">
          <span className="numeric font-caption">已选 {selected.length}</span>
          <Button size="sm" onClick={() => { updateData(current => ({ ...current, incidents: current.incidents.map(item => selected.includes(item.id) ? { ...item, assigneeId: data.members[0].id } : item) })); showToast({ tone: 'success', title: '批量分派完成' }) }}>分派</Button>
          <Button size="sm" onClick={() => { updateData(current => ({ ...current, incidents: current.incidents.map(item => selected.includes(item.id) ? { ...item, status: 'processing' } : item) })); showToast({ tone: 'success', title: '状态已更新' }) }}>修改状态</Button>
          <Button size="sm" onClick={() => { updateData(current => ({ ...current, incidents: current.incidents.map(item => selected.includes(item.id) ? { ...item, tagIds: [...new Set([...item.tagIds, 'bulk'])] } : item) })); showToast({ tone: 'success', title: '标签已添加' }) }}>添加标签</Button>
          <Button size="sm" onClick={() => setConfirm('archive')}>归档</Button>
          <Button size="sm" variant="danger" onClick={() => setConfirm('delete')}>删除</Button>
        </div>
      )}
      <div className="scroll-stable min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-240 border-collapse">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2"><Checkbox label="" aria-label="全选当前结果" checked={rows.length > 0 && rows.every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? rows.map(item => item.id) : [])} /></th>
              {columns.filter(column => column !== 'title' || true).map(column => (
                <th key={column} className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground" style={{ width: columnWidths[column] }}>
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => sortColumn(column)}>
                    {labels[column]}<span aria-hidden>{sort === column ? '↑' : sort === `-${column}` ? '↓' : '↕'}</span>
                  </button>
                  <span
                    role="separator" tabIndex={0} aria-label={`调整 ${labels[column]} 列宽`} aria-orientation="vertical" aria-valuenow={columnWidths[column] ?? 120}
                    className="ml-2 inline-block h-3 w-1 cursor-col-resize bg-border"
                    onKeyDown={event => { const delta = event.key === 'ArrowLeft' ? -12 : event.key === 'ArrowRight' ? 12 : 0; if (delta) setColumnWidths(current => ({ ...current, [column]: Math.min(360, Math.max(80, (current[column] ?? 120) + delta)) })) }}
                    onPointerDown={event => {
                      const startX = event.clientX; const startWidth = columnWidths[column] ?? 120
                      const move = (moveEvent: PointerEvent) => setColumnWidths(current => ({ ...current, [column]: Math.min(360, Math.max(80, startWidth + moveEvent.clientX - startX)) }))
                      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
                      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id} className="border-b border-surface-border hover:bg-surface-hover">
                <td className="px-3 py-2"><Checkbox label="" aria-label={`选择 ${item.key}`} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(value => value !== item.id))} /></td>
                {columns.map(column => (
                  <td key={column} className="px-3 py-2 font-body">
                    {column === 'key' ? <Link to={`/events/${item.id}?ws=${params.get('ws') ?? ''}`} className="numeric rounded-sm font-micro text-brand underline-offset-2 hover:underline">{item.key}</Link>
                      : column === 'title' ? <Link to={`/events/${item.id}?ws=${params.get('ws') ?? ''}`} className="line-clamp-2 rounded-sm hover:underline">{item.title}</Link>
                      : column === 'status' ? <Badge tone={item.status === 'resolved' ? 'success' : item.status === 'archived' ? 'muted' : item.status === 'waiting' ? 'warning' : 'brand'}>{item.status}</Badge>
                      : column === 'severity' ? <Badge tone={item.severity === 'sev1' ? 'danger' : item.severity === 'sev2' ? 'warning' : 'muted'}>{item.severity.toUpperCase()}</Badge>
                      : column === 'serviceId' ? <Link to={`/services/${item.serviceId}?ws=${params.get('ws') ?? ''}`} className="rounded-sm hover:underline">{data.services.find(service => service.id === item.serviceId)?.name}</Link>
                      : column === 'assigneeId' ? <Link to={`/settings?tab=members&member=${item.assigneeId}&ws=${params.get('ws') ?? ''}`} className="rounded-sm hover:underline">{data.members.find(member => member.id === item.assigneeId)?.name}</Link>
                      : column === 'resolvedAt' ? (item.resolvedAt ? formatDateTime(item.resolvedAt) : '—')
                      : column === 'createdAt' ? formatDateTime(item.createdAt)
                      : <span title={formatDateTime(item.updatedAt)}>{relativeTime(item.updatedAt)}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <StateView icon="▤" title="暂无事件" description="尝试清除筛选或创建第一条事件。" action={<Button variant="primary" onClick={() => setCreateOpen(true)}>新建事件</Button>} />}
      </div>
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-border px-4">
        <Button size="sm" variant="ghost" disabled={current <= 1} onClick={() => patch({ page: String(current - 1) })}>上一页</Button>
        <div className="flex items-center gap-2 font-caption">
          <span className="numeric">{current} / {totalPages}</span>
          <label>跳转<Input className="h-7 w-16" type="number" min={1} max={totalPages} value={current} onChange={event => patch({ page: event.target.value })} aria-label="跳转页码" /></label>
          <label>每页<Select className="h-7 w-18" value={String(pageSize)} onChange={event => patch({ pageSize: event.target.value, page: '1' })} aria-label="每页条数">{[10,20,50].map(value => <option key={value} value={value}>{value}</option>)}</Select></label>
          <Button size="sm" variant="ghost" onClick={() => { const next = new URLSearchParams(params); navigator.clipboard?.writeText(window.location.href); showToast({ tone: 'success', title: '链接已复制', description: next.toString() }) }}>复制查询</Button>
        </div>
        <Button size="sm" variant="ghost" disabled={current >= totalPages} onClick={() => patch({ page: String(current + 1) })}>下一页</Button>
      </div>
      <ConfirmDialog open={confirm === 'delete'} title="删除事件" message={`将永久删除 ${selected.length} 条事件，该操作不可撤销。`} confirmLabel="删除" onClose={() => setConfirm(null)} onConfirm={() => bulk('delete')} />
      <ConfirmDialog open={confirm === 'archive'} title="归档事件" message={`将归档 ${selected.length} 条事件。`} confirmLabel="归档" onClose={() => setConfirm(null)} onConfirm={() => bulk('archive')} />
      <CreateIncidentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
