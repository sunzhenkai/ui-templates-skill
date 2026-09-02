import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, FileText, LayoutDashboard, Loader2, Search, User, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAppStore, syncUrl } from "@/stores/app-store"
import { search } from "@/mocks/api"
import type { ChangeRecord, Incident, Member, Service } from "@/types"

function SearchDialog() {
  const store = useAppStore()
  const open = store.dialog === "search"
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<{ incidents: Incident[]; services: Service[]; members: Member[]; changes: ChangeRecord[] } | null>(null)
  const [type, setType] = useState<"all" | "incident" | "service" | "member" | "change">("all")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setResults(null)
      setError("")
      setType("all")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults(null)
        return
      }
      setLoading(true)
      setError("")
      try {
        const data = await search(query, store.currentWorkspaceId)
        setResults(data)
        setSelectedIndex(0)
      } catch (e) {
        setError(e instanceof Error ? e.message : "搜索失败")
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query, open, store.currentWorkspaceId])

  const flat = useMemo(() => {
    if (!results) return []
    const items: { type: string; label: string; sub: string; id: string; page: string }[] = []
    if (type === "all" || type === "incident") {
      results.incidents.forEach((i) => items.push({ type: "事件", label: `${i.number} ${i.title}`, sub: i.status, id: i.id, page: "events" }))
    }
    if (type === "all" || type === "service") {
      results.services.forEach((s) => items.push({ type: "服务", label: s.name, sub: s.status, id: s.id, page: "services" }))
    }
    if (type === "all" || type === "member") {
      results.members.forEach((m) => items.push({ type: "成员", label: m.name, sub: m.email, id: m.id, page: "settings" }))
    }
    if (type === "all" || type === "change") {
      results.changes.forEach((c) => items.push({ type: "变更", label: c.title, sub: c.type, id: c.id, page: "analytics" }))
    }
    return items
  }, [results, type])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        store.setDialog(null)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const item = flat[selectedIndex]
        if (item) openResult(item)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, flat, selectedIndex, store])

  const openResult = (item: { page: string; id: string }) => {
    store.setDialog(null)
    store.setPage(item.page as never)
    store.setSelectedId(item.id)
    syncUrl({ page: item.page as never, selectedId: item.id })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && store.setDialog(null)}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>全局搜索</DialogTitle>
          <DialogDescription>搜索事件、服务、成员与变更</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索事件、服务、成员、变更…"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {!loading && (
            <button onClick={() => store.setDialog(null)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="关闭">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 px-3 pt-2">
          {(["all", "incident", "service", "member", "change"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full px-2 py-0.5 text-caption transition-colors",
                type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {t === "all" ? "全部" : t === "incident" ? "事件" : t === "service" ? "服务" : t === "member" ? "成员" : "变更"}
            </button>
          ))}
        </div>

        <div className="max-h-80 min-h-[120px] overflow-y-auto p-2" role="listbox">
          {error && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="size-8 text-destructive" />
              <p className="text-body text-muted-foreground">{error}</p>
              <button onClick={() => search(query, store.currentWorkspaceId).then(setResults).catch((e) => setError(e.message))} className="text-sm text-primary hover:underline">重试</button>
            </div>
          )}

          {!error && !loading && flat.length === 0 && query && (
            <div className="py-8 text-center text-caption text-muted-foreground">未找到“{query}”相关结果</div>
          )}

          {!error && !query && !results && (
            <div className="py-8 text-center text-caption text-muted-foreground">输入关键字开始搜索</div>
          )}

          {flat.map((item, idx) => (
            <button
              key={`${item.type}-${item.id}`}
              role="option"
              aria-selected={idx === selectedIndex}
              onClick={() => openResult(item)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted",
                idx === selectedIndex && "bg-muted"
              )}
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {item.type === "事件" ? <FileText className="size-4" /> : item.type === "服务" ? <LayoutDashboard className="size-4" /> : item.type === "成员" ? <User className="size-4" /> : <AlertCircle className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-body text-foreground">{item.label}</div>
                <div className="text-caption text-muted-foreground">{item.type} · {item.sub}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between border-t px-3 py-1.5 text-micro text-muted-foreground">
          <span>上下选择 · Enter 打开 · Esc 关闭</span>
          <span>{flat.length} 个结果</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { SearchDialog }
