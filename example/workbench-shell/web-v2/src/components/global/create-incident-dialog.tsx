import { useEffect, useState } from 'react'
import { useApp } from '@/app/app-context'
import { Dialog } from '@/components/ui/overlay'
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/primitives'
import { uniqueId } from '@/lib/utils'
import type { Incident, Severity } from '@/types'

export function CreateIncidentDialog({ open, onClose, defaultStatus = 'pending' }: { open: boolean; onClose: () => void; defaultStatus?: Incident['status'] }) {
  const { data, updateData, showToast } = useApp()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    title: '', serviceId: '', severity: 'sev2' as Severity, status: defaultStatus, assigneeId: '',
    teamIds: [] as string[], occurredAt: new Date().toISOString().slice(0, 16), description: '', tags: '', changeIds: [] as string[], files: [] as string[],
  })
  const [lastForm, setLastForm] = useState(form)

  useEffect(() => { if (open) setForm(current => ({ ...current, status: defaultStatus })) }, [defaultStatus, open])
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(current => ({ ...current, [key]: value }))
  if (!data) return null

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = '请输入标题'
    if (!form.serviceId) next.serviceId = '请选择影响服务'
    if (!form.severity) next.severity = '请选择严重等级'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setLastForm(form); setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 700))
    if (form.title.includes('失败')) {
      setSubmitting(false)
      showToast({ tone: 'error', title: '创建失败', description: '模拟写入失败，输入已保留。', action: { label: '重试', onClick: () => void submit() } })
      return
    }
    const id = uniqueId('incident')
    const now = new Date().toISOString()
    updateData(current => ({
      ...current,
      incidents: [{
        id,
        key: `NEW-${current.incidents.length + 1}`,
        title: form.title, summary: form.description || form.title, status: form.status, severity: form.severity,
        serviceId: form.serviceId, assigneeId: form.assigneeId, reporterId: current.members[0]?.id ?? '',
        teamIds: form.teamIds, changeIds: form.changeIds, tagIds: form.tags.split(/[,，]/).map(value => value.trim()).filter(Boolean),
        createdAt: now, startedAt: form.occurredAt, updatedAt: now, responseMinutes: 0, restoreMinutes: 0,
        impactedUsers: 0, timeline: [{ id: uniqueId('tl'), at: now, actor: '当前用户', kind: 'status', text: '创建事件。' }],
        comments: [], attachments: form.files.map(name => ({ id: uniqueId('at'), name, size: '1.2 MB', progress: 100, status: 'done' as const })),
        relatedAlertIds: [], pinned: false,
      }, ...current.incidents],
      inbox: [{ id: uniqueId('ib'), key: `IB-${current.inbox.length + 1}`, title: `${form.title} 需要确认`, type: 'alert', severity: form.severity, source: '人工创建', assigneeId: form.assigneeId, createdAt: now, status: 'unread', incidentId: id }, ...current.inbox],
    }))
    setSubmitting(false); onClose(); setForm(lastForm)
    showToast({ tone: 'success', title: '事件已创建', description: '列表、看板和收件箱计数已同步。' })
  }

  const multi = <K extends 'teamIds' | 'changeIds'>(key: K, value: string) => {
    setForm(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }))
  }

  return (
    <Dialog open={open} onClose={onClose} title="创建事件" description="标题、影响服务和严重等级为必填" size="lg" footer={
      <>
        <Button onClick={() => { setForm({ ...form, title: '', description: '', tags: '', files: [] }); setErrors({}) }}>清空</Button>
        <Button onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={() => void submit()} loading={submitting}>创建事件</Button>
      </>
    }>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit() }} noValidate>
        <Field label="标题" required error={errors.title} htmlFor="incident-title">
          <Input id="incident-title" autoFocus value={form.title} onChange={event => set('title', event.target.value)} aria-invalid={!!errors.title} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="影响服务" required error={errors.serviceId} htmlFor="incident-service">
            <Select id="incident-service" value={form.serviceId} onChange={event => set('serviceId', event.target.value)}>
              <option value="">请选择</option>
              {data.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
            </Select>
          </Field>
          <Field label="严重等级" required htmlFor="incident-severity">
            <Select id="incident-severity" value={form.severity} onChange={event => set('severity', event.target.value as Severity)}>
              {['sev1', 'sev2', 'sev3', 'sev4'].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </Select>
          </Field>
          <Field label="当前状态" htmlFor="incident-status">
            <Select value={form.status} onChange={event => set('status', event.target.value as Incident['status'])}>
              {['pending', 'processing', 'waiting', 'resolved', 'archived'].map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="负责人" htmlFor="incident-assignee">
            <Select id="incident-assignee" value={form.assigneeId} onChange={event => set('assigneeId', event.target.value)}>
              <option value="">未分派</option>
              {data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </Select>
          </Field>
          <Field label="发生时间" htmlFor="incident-time">
            <Input id="incident-time" type="datetime-local" value={form.occurredAt.slice(0, 16)} onChange={event => set('occurredAt', event.target.value)} />
          </Field>
        </div>
        <Field label="参与团队">
          <div className="flex flex-wrap gap-3 rounded-control border border-border p-3">
            {data.teams.map(team => (
              <Checkbox key={team.id} label={team.name} checked={form.teamIds.includes(team.id)} onChange={() => multi('teamIds', team.id)} />
            ))}
          </div>
        </Field>
        <Field label="描述" htmlFor="incident-description">
          <Textarea id="incident-description" value={form.description} onChange={event => set('description', event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="标签" hint="使用逗号分隔" htmlFor="incident-tags">
            <Input id="incident-tags" value={form.tags} onChange={event => set('tags', event.target.value)} />
          </Field>
          <Field label="附件" hint="选择文件后模拟上传">
            <input type="file" multiple aria-label="上传附件" className="h-9 w-full rounded-control border border-border bg-surface px-2 file:mr-2 file:border-0" onChange={event => set('files', Array.from(event.target.files ?? []).map(file => file.name))} />
            {form.files.length > 0 && <ul className="mt-2 grid gap-1 font-caption text-muted-foreground">{form.files.map(file => <li key={file}>📎 {file} · 上传完成</li>)}</ul>}
          </Field>
        </div>
        <Field label="关联变更">
          <div className="scroll-stable flex max-h-28 flex-wrap gap-3 overflow-auto rounded-control border border-border p-3">
            {data.changes.map(change => (
              <Checkbox key={change.id} label={`${change.key}`} checked={form.changeIds.includes(change.id)} onChange={() => multi('changeIds', change.id)} />
            ))}
          </div>
        </Field>
      </form>
    </Dialog>
  )
}
