import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/app-store"
import { createIncident, fetchMembers, fetchServices } from "@/mocks/api"
import type { Incident, Severity, IncidentStatus } from "@/types"

function CreateIncidentDialog() {
  const store = useAppStore()
  const open = store.dialog === "create-incident"
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [services, setServices] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!open) return
    fetchMembers(store.currentWorkspaceId).then((list) => setMembers(list.map((m) => ({ id: m.id, name: m.name }))))
    fetchServices(store.currentWorkspaceId).then((list) => setServices(list.map((s) => ({ id: s.id, name: s.name }))))
  }, [open, store.currentWorkspaceId])

  const [form, setForm] = useState({
    title: "",
    serviceId: "",
    severity: "high" as Severity,
    status: "open" as IncidentStatus,
    ownerId: "",
    participantIds: [] as string[],
    startedAt: new Date().toISOString().slice(0, 16),
    description: "",
    tags: "",
    changeIds: [] as string[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        serviceId: "",
        severity: "high",
        status: "open",
        ownerId: "",
        participantIds: [],
        startedAt: new Date().toISOString().slice(0, 16),
        description: "",
        tags: "",
        changeIds: [],
      })
      setErrors({})
      setSaving(false)
    }
  }, [open])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = "标题必填"
    if (!form.serviceId) next.serviceId = "影响服务必填"
    if (!form.severity) next.severity = "严重等级必填"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Omit<Incident, "id" | "number" | "createdAt" | "updatedAt" | "comments" | "pinned"> = {
        workspaceId: store.currentWorkspaceId,
        title: form.title,
        description: form.description,
        severity: form.severity,
        status: form.status,
        serviceIds: [form.serviceId],
        ownerId: form.ownerId || undefined,
        participantIds: form.participantIds,
        startedAt: new Date(form.startedAt).toISOString(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        changeIds: form.changeIds,
      }
      const inc = await createIncident(payload)
      store.addToast({ type: "success", title: "事件已创建", description: inc.number })
      store.setDialog(null)
      if (store.page === "events" || store.page === "board" || store.page === "inbox") {
        // 触发表面重刷新由页面自己监听 store 变化，这里不做
      }
    } catch (e) {
      store.addToast({ type: "error", title: "创建失败", description: e instanceof Error ? e.message : "请重试" })
    } finally {
      setSaving(false)
    }
  }

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.name })),
    [members]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && store.setDialog(null)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>创建事件</DialogTitle>
          <DialogDescription>填写事件信息并提交，所有数据保存在本地。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <label className="text-caption text-muted-foreground">标题 <span className="text-destructive">*</span></label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="事件标题" aria-invalid={!!errors.title} />
            {errors.title && <span className="text-caption text-destructive">{errors.title}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-caption text-muted-foreground">影响服务 <span className="text-destructive">*</span></label>
              <Select value={form.serviceId} onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v }))} placeholder="选择服务">
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </Select>
              {errors.serviceId && <span className="text-caption text-destructive">{errors.serviceId}</span>}
            </div>
            <div className="grid gap-1.5">
              <label className="text-caption text-muted-foreground">严重等级 <span className="text-destructive">*</span></label>
              <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as Severity }))}>
                <SelectItem value="critical">P0 严重</SelectItem>
                <SelectItem value="high">P1 高</SelectItem>
                <SelectItem value="medium">P2 中</SelectItem>
                <SelectItem value="low">P3 低</SelectItem>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-caption text-muted-foreground">当前状态</label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as IncidentStatus }))}>
                <SelectItem value="open">待处理</SelectItem>
                <SelectItem value="acknowledged">已确认</SelectItem>
                <SelectItem value="investigating">调查中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-caption text-muted-foreground">负责人</label>
              <Select value={form.ownerId} onValueChange={(v) => setForm((f) => ({ ...f, ownerId: v }))} placeholder="选择负责人">
                {memberOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-caption text-muted-foreground">发生时间</label>
            <Input type="datetime-local" value={form.startedAt} onChange={(e) => setForm((f) => ({ ...f, startedAt: e.target.value }))} />
          </div>

          <div className="grid gap-1.5">
            <label className="text-caption text-muted-foreground">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-caption text-muted-foreground">标签（逗号分隔）</label>
            <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="latency, database" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => store.setDialog(null)} disabled={saving}>取消</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { CreateIncidentDialog }
