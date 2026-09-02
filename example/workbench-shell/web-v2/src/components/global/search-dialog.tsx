import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { Dialog } from '@/components/ui/overlay'
import { Badge, Button, Input, SegmentedControl, StateView } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

type SearchType = 'all' | 'incident' | 'service' | 'member' | 'change'
type Result = { id: string; type: Exclude<SearchType, 'all'>; title: string; detail: string; to: string }

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, workspaceId } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<SearchType>('all')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('ready')
  const [active, setActive] = useState(0)
  const [nonce, setNonce] = useState(0)

  useEffect(() => { if (open) setState('ready') }, [open])
  useEffect(() => {
    if (!open || !query) { setState('ready'); return }
    setState('loading')
    const timer = window.setTimeout(() => setState(query === 'fail-search' ? 'error' : 'ready'), 450)
    return () => window.clearTimeout(timer)
  }, [nonce, open, query])

  const results = useMemo<Result[]>(() => {
    if (!data || state === 'error') return []
    const keyword = query.trim().toLowerCase()
    const match = (value: string) => !keyword || value.toLowerCase().includes(keyword)
    const all: Result[] = [
      ...data.incidents.filter(item => match(`${item.key} ${item.title}`)).map(item => ({ id: item.id, type: 'incident' as const, title: item.title, detail: item.key, to: `/events/${item.id}` })),
      ...data.services.filter(item => match(`${item.name} ${item.key}`)).map(item => ({ id: item.id, type: 'service' as const, title: item.name, detail: item.key, to: `/services/${item.id}` })),
      ...data.members.filter(item => match(`${item.name} ${item.email}`)).map(item => ({ id: item.id, type: 'member' as const, title: item.name, detail: item.email, to: `/settings?tab=members` })),
      ...data.changes.filter(item => match(`${item.key} ${item.title}`)).map(item => ({ id: item.id, type: 'change' as const, title: item.title, detail: item.key, to: `/analytics?change=${item.id}` })),
    ]
    return all.filter(item => type === 'all' || item.type === type)
  }, [data, query, state, type])

  useEffect(() => { setActive(0) }, [query, type, state])
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(value => Math.min(results.length - 1, value + 1)) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(value => Math.max(0, value - 1)) }
      if (event.key === 'Enter' && results[active]) { navigate({ pathname: results[active].to, search: `ws=${workspaceId}` }); onClose() }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [active, navigate, onClose, open, results, workspaceId])

  const counts = {
    incident: results.filter(item => item.type === 'incident').length,
    service: results.filter(item => item.type === 'service').length,
    member: results.filter(item => item.type === 'member').length,
    change: results.filter(item => item.type === 'change').length,
  }

  return (
    <Dialog open={open} onClose={onClose} title="全局搜索" description="搜索事件、服务、成员和变更记录，使用上下键选择" size="lg">
      <div className="grid gap-3">
        <Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="输入关键字，fail-search 可触发失败" aria-label="搜索关键字" />
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl label="结果类型" value={type} onChange={setType} options={[
            { value: 'all', label: `全部 ${results.length}` },
            { value: 'incident', label: `事件 ${counts.incident}` },
            { value: 'service', label: `服务 ${counts.service}` },
            { value: 'member', label: `成员 ${counts.member}` },
            { value: 'change', label: `变更 ${counts.change}` },
          ]} />
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => setNonce(value => value + 1)} disabled={!query}>重新搜索</Button>
          </div>
        </div>
        <div aria-live="polite" className="min-h-52">
          {state === 'loading' ? (
            <div className="grid gap-2 p-2" aria-label="搜索中">
              {[0, 1, 2].map(index => <div key={index} className="h-11 animate-pulse rounded-card bg-muted" />)}
            </div>
          ) : state === 'error' ? (
            <StateView tone="danger" icon="!" title="搜索失败" description="本地搜索模拟失败，可重试。" action={<Button variant="primary" onClick={() => setNonce(value => value + 1)}>重试</Button>} />
          ) : results.length === 0 ? (
            <StateView icon="⌕" title="没有匹配结果" description="尝试更换关键字或清除类型筛选。" />
          ) : (
            <ul className="grid gap-1" role="listbox" aria-label="搜索结果">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => { navigate({ pathname: result.to, search: `ws=${workspaceId}` }); onClose() }}
                    className={cn('flex w-full items-center gap-3 rounded-card border border-transparent px-3 py-2 text-left hover:bg-surface-hover aria-selected:border-border aria-selected:bg-surface-selected')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body">{result.title}</span>
                      <span className="numeric block truncate font-caption text-muted-foreground">{result.detail}</span>
                    </span>
                    <Badge>{result.type}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  )
}
