import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/stores/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppStore as _useAppStore } from '@/lib/stores/app-store' // ensure tree-shake safe
import { toast } from 'sonner'

const SEVERITY_OPTIONS = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const
const STATUS_OPTIONS = ['triggered', 'acknowledged', 'investigating', 'mitigated'] as const

const schema = z.object({
  title: z.string().min(4, '标题至少 4 个字符'),
  serviceId: z.string().min(1, '请选择影响服务'),
  severity: z.enum(SEVERITY_OPTIONS),
  status: z.enum(STATUS_OPTIONS),
  assigneeId: z.string().nullable(),
  teamIds: z.array(z.string()),
  description: z.string(),
  tags: z.string(),
  changeIds: z.array(z.string()),
})

type FormState = z.infer<typeof schema>

const initial: FormState = {
  title: '',
  serviceId: '',
  severity: 'SEV2',
  status: 'triggered',
  assigneeId: null,
  teamIds: [],
  description: '',
  tags: '',
  changeIds: [],
}

export function CreateIncidentDialog() {
  const open = useAppStore((s) => s.createIncidentOpen)
  const setOpen = useAppStore((s) => s.setCreateIncidentOpen)
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const services = useQuery({ queryKey: ['services'], queryFn: api.services, enabled: open })
  const members = useQuery({ queryKey: ['members'], queryFn: api.members, enabled: open })
  const changes = useQuery({ queryKey: ['changes'], queryFn: api.changes, enabled: open })

  useEffect(() => {
    if (!open) {
      setForm(initial)
      setErrors({})
      setSubmitting(false)
    }
  }, [open])

  async function handleSubmit() {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState
        next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const data = parsed.data
      const created = await api.createIncident({
        title: data.title,
        severity: data.severity,
        status: data.status,
        serviceId: data.serviceId,
        assigneeId: data.assigneeId,
        teamIds: data.teamIds,
        description: data.description,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
        changeIds: data.changeIds,
      })
      toast.success(`事件已创建：${created.number}`)
      setOpen(false)
    } catch (e) {
      toast.error('创建失败', {
        description: e instanceof Error ? e.message : '请稍后重试',
        action: { label: '重试', onClick: () => handleSubmit() },
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[480px] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>创建事件</DialogTitle>
          <DialogDescription>标题、影响服务与严重等级为必填；其它可在事件详情中继续补充。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ci-title">标题</Label>
            <Input
              id="ci-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              aria-invalid={!!errors.title}
              placeholder="例：checkout-api 错误率突增"
            />
            {errors.title ? <p className="text-micro text-destructive">{errors.title}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ci-service">影响服务</Label>
              <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })}>
                <SelectTrigger id="ci-service" aria-invalid={!!errors.serviceId}>
                  <SelectValue placeholder="选择服务" />
                </SelectTrigger>
                <SelectContent>
                  {services.data?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceId ? <p className="text-micro text-destructive">{errors.serviceId}</p> : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ci-severity">严重等级</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as FormState['severity'] })}>
                <SelectTrigger id="ci-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ci-status">当前状态</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FormState['status'] })}>
                <SelectTrigger id="ci-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ci-assignee">负责人</Label>
              <Select value={form.assigneeId ?? ''} onValueChange={(v) => setForm({ ...form, assigneeId: v || null })}>
                <SelectTrigger id="ci-assignee">
                  <SelectValue placeholder="未分派" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">未分派</SelectItem>
                  {members.data?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ci-desc">描述</Label>
            <Textarea
              id="ci-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="事件背景、影响面与初步假设…"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ci-tags">标签（逗号分隔）</Label>
            <Input
              id="ci-tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="payments, region:cn-east"
            />
          </div>

          {changes.data && changes.data.length > 0 ? (
            <div className="grid gap-1.5">
              <Label>关联变更（可多选）</Label>
              <div className="flex flex-wrap gap-1.5">
                {changes.data.slice(0, 5).map((c) => {
                  const active = form.changeIds.includes(c.id)
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                      onClick={() => setForm({
                        ...form,
                        changeIds: active
                          ? form.changeIds.filter((id) => id !== c.id)
                          : [...form.changeIds, c.id],
                      })}
                      aria-pressed={active}
                    >
                      <Badge variant={active ? 'brand' : 'outline'} className="cursor-pointer">
                        {c.title}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>取消</Button>
          <Button variant="brand" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中…' : '创建事件'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
