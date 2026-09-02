import { useEffect, useState } from 'react'
import { useApp } from '@/app/app-context'
import { Dialog } from '@/components/ui/overlay'
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/primitives'
import type { Service } from '@/types'

type Form = Omit<Service, 'lastChangeAt'> & { alertRuleText: string }

export function ServiceFormDialog({ open, service, onClose }: { open: boolean; service?: Service; onClose: () => void }) {
  const { data, updateData, showToast } = useApp()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const empty: Form = {
    id: '', name: '', key: '', description: '', teamId: data?.teams[0]?.id ?? '', ownerId: data?.members[0]?.id ?? '',
    environment: 'production', repository: '', documentation: '', health: 'healthy', dependencyIds: [], alertRules: [], status: 'active', alertRuleText: '',
  }
  const [form, setForm] = useState<Form>(empty)
  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(service ? { ...service, alertRuleText: service.alertRules.join(', ') } : empty)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service])

  if (!data) return null
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(current => ({ ...current, [key]: value }))

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = '请输入名称'
    if (!form.key.trim()) next.key = '请输入标识'
    else if (data.services.some(item => item.key === form.key.trim() && item.id !== service?.id)) next.key = '服务标识必须唯一'
    if (!form.teamId) next.teamId = '请选择所属团队'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    const saved: Service = { ...form, key: form.key.trim(), alertRules: form.alertRuleText.split(/[,，]/).map(value => value.trim()).filter(Boolean), lastChangeAt: new Date().toISOString() }
    updateData(current => ({
      ...current,
      services: service ? current.services.map(item => item.id === service.id ? saved : item) : [{ ...saved, id: `service-${current.services.length + 1}` }, ...current.services],
      teams: current.teams.map(team => team.id === saved.teamId ? { ...team, serviceIds: [...new Set([...team.serviceIds, saved.id])] } : team),
    }))
    setSaving(false); onClose()
    showToast({ tone: 'success', title: service ? '服务已更新' : '服务已创建' })
  }

  return (
    <Dialog open={open} onClose={onClose} title={service ? `编辑 ${service.name}` : '新建服务'} description="服务标识必须唯一" size="lg" footer={<><Button onClick={onClose}>取消</Button><Button variant="primary" loading={saving} onClick={() => void submit()}>保存</Button></>}>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="名称" required error={errors.name} htmlFor="service-name"><Input id="service-name" autoFocus value={form.name} onChange={event => set('name', event.target.value)} /></Field>
          <Field label="标识" required error={errors.key} hint="例如 payment-api" htmlFor="service-key"><Input id="service-key" value={form.key} onChange={event => set('key', event.target.value)} /></Field>
        </div>
        <Field label="描述" htmlFor="service-desc"><Textarea id="service-desc" value={form.description} onChange={event => set('description', event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="所属团队" required error={errors.teamId}><Select value={form.teamId} onChange={event => set('teamId', event.target.value)} aria-label="所属团队">{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select></Field>
          <Field label="负责人"><Select value={form.ownerId} onChange={event => set('ownerId', event.target.value)} aria-label="服务负责人">{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Select></Field>
          <Field label="环境"><Select value={form.environment} onChange={event => set('environment', event.target.value as Service['environment'])} aria-label="运行环境">{['production','staging','development'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="仓库地址" htmlFor="repo"><Input id="repo" value={form.repository} onChange={event => set('repository', event.target.value)} /></Field>
          <Field label="文档地址" htmlFor="docs"><Input id="docs" value={form.documentation} onChange={event => set('documentation', event.target.value)} /></Field>
        </div>
        <Field label="依赖服务">
          <div className="scroll-stable max-h-28 overflow-auto rounded-control border border-border p-3">
            {data.services.filter(item => item.id !== service?.id).map(item => (
              <Checkbox key={item.id} className="mr-3" label={item.name} checked={form.dependencyIds.includes(item.id)} onChange={() => set('dependencyIds', form.dependencyIds.includes(item.id) ? form.dependencyIds.filter(id => id !== item.id) : [...form.dependencyIds, item.id])} />
            ))}
            {data.services.length <= 1 && <p className="font-caption text-faint">没有可选服务</p>}
          </div>
        </Field>
        <Field label="告警规则" hint="使用逗号分隔" htmlFor="alerts"><Input id="alerts" value={form.alertRuleText} onChange={event => set('alertRuleText', event.target.value)} /></Field>
      </form>
    </Dialog>
  )
}
