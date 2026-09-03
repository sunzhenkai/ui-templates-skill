import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Server, Users, GitBranch, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandShortcut,
} from '@/components/ui/command'
import { useAppStore } from '@/lib/stores/app-store'
import type { Change, Incident, Member, Service } from '@/lib/types'

type Group = {
  label: string
  items: { id: string; title: string; subtitle?: string; icon: React.ReactNode; onSelect: () => void }[]
}

export function SearchPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [data, setData] = useState<{ incidents: Incident[]; services: Service[]; members: Member[]; changes: Change[] }>({
    incidents: [], services: [], members: [], changes: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setError(null)
      setLoading(true)
      Promise.all([api.listIncidents(), api.services(), api.members(), api.changes()])
        .then(([incidents, services, members, changes]) => {
          setData({ incidents, services, members, changes })
        })
        .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
        .finally(() => setLoading(false))
    }
  }, [open])

  const groups: Group[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (s: string) => !q || s.toLowerCase().includes(q)
    const inc = data.incidents
      .filter((i) => match(i.title) || match(i.number) || i.tags.some(match))
      .slice(0, 6)
      .map((i) => ({
        id: i.id,
        title: `${i.number} · ${i.title}`,
        subtitle: `事件 · ${i.severity}`,
        icon: <Inbox className="size-4 text-brand" />,
        onSelect: () => { setOpen(false); navigate(`/events/${i.id}`) },
      }))
    const svc = data.services
      .filter((s) => match(s.name) || match(s.description))
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        title: s.name,
        subtitle: s.description,
        icon: <Server className="size-4 text-info" />,
        onSelect: () => { setOpen(false); navigate(`/services/${s.id}`) },
      }))
    const mem = data.members
      .filter((m) => match(m.name) || match(m.email))
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        title: m.name,
        subtitle: m.email,
        icon: <Users className="size-4 text-muted-foreground" />,
        onSelect: () => { setOpen(false); navigate('/settings?tab=members') },
      }))
    const chg = data.changes
      .filter((c) => match(c.title))
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: `变更 · ${c.status}`,
        icon: <GitBranch className="size-4 text-warning" />,
        onSelect: () => { setOpen(false); navigate('/events') },
      }))
    const result: Group[] = []
    if (inc.length) result.push({ label: '事件', items: inc })
    if (svc.length) result.push({ label: '服务', items: svc })
    if (mem.length) result.push({ label: '成员', items: mem })
    if (chg.length) result.push({ label: '变更', items: chg })
    return result
  }, [data, query, navigate, setOpen])

  const empty = !loading && !error && groups.every((g) => g.items.length === 0)
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="搜索事件、服务、成员、变更…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading ? (
          <div className="py-6 text-center text-caption text-muted-foreground">加载中…</div>
        ) : error ? (
          <div role="alert" className="p-4">
            <div className="text-body text-destructive">{error}</div>
            <button
              type="button"
              className="mt-2 text-caption text-brand underline-offset-4 hover:underline"
              onClick={() => setOpen(false)}
            >
              关闭
            </button>
          </div>
        ) : empty ? (
          <CommandEmpty>
            没有匹配的结果
            <div className="mt-1 text-micro text-muted-foreground">试试切换关键字或清除筛选</div>
          </CommandEmpty>
        ) : (
          <>
            <div className="px-3 py-1.5 text-micro text-muted-foreground tabular">
              {total} 条结果
            </div>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem key={item.id} value={`${group.label}-${item.title}`} onSelect={item.onSelect}>
                    {item.icon}
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.subtitle ? (
                      <span className="truncate text-micro text-muted-foreground">{item.subtitle}</span>
                    ) : null}
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <div className="border-t border-border p-2 text-micro text-muted-foreground">
              <CommandShortcut>↑↓ 选择</CommandShortcut>{'  '}
              <CommandShortcut>Enter 打开</CommandShortcut>{'  '}
              <CommandShortcut>Esc 关闭</CommandShortcut>
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
