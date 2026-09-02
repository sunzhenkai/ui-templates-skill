import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { DetailHeader } from '@/components/layout/page-header'
import { Badge, Button, Skeleton, StateView } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/overlay'
import { ServiceFormDialog } from './service-form'
import { useSimulatedLoad } from '@/lib/page-load'
import { formatDateTime, relativeTime } from '@/lib/utils'

export function ServiceDetailPage() {
  const { serviceId } = useParams()
  const { data, updateData, showToast } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const load = useSimulatedLoad('service-detail', 220, [serviceId])
  const [editOpen, setEditOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const service = data?.services.find(item => item.id === serviceId)
  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_320px]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="服务详情加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data || !service) return <StateView icon="?" className="flex-1" title="服务不存在" description="可能已被删除或地址无效。" action={<Button onClick={() => navigate('/services')}>返回服务目录</Button>} />

  const healthTone = service.health === 'healthy' ? 'success' : service.health === 'degraded' ? 'warning' : service.health === 'down' ? 'danger' : 'muted'
  const incidents = data.incidents.filter(item => item.serviceId === service.id)
  const changes = data.changes.filter(item => item.serviceId === service.id)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailHeader title={service.name} backTo={`/services?ws=${params.get('ws') ?? ''}`} backLabel="服务目录" breadcrumb={[{ label: '服务目录', to: `/services?ws=${params.get('ws') ?? ''}` }, { label: service.name }]} actions={<><Button size="sm" onClick={() => setEditOpen(true)}>编辑</Button><Button size="sm" variant="danger" onClick={() => setConfirm(true)}>{service.status === 'active' ? '停用' : '恢复'}</Button></>} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <main className="scroll-stable min-h-0 flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
          <div className="mx-auto grid max-w-224 gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={healthTone}>{service.health}</Badge><Badge>{service.environment}</Badge><Badge>{service.status}</Badge>
              <span className="numeric font-caption text-muted-foreground">{service.key}</span>
            </div>
            <p className="font-body-lg text-muted-foreground">{service.description}</p>
            <section className="rounded-card border border-border p-4"><h2 className="font-title-sm">基本信息</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2 font-body"><div><dt className="font-caption text-muted-foreground">负责人</dt><dd>{data.members.find(member => member.id === service.ownerId)?.name}</dd></div><div><dt className="font-caption text-muted-foreground">所属团队</dt><dd>{data.teams.find(team => team.id === service.teamId)?.name}</dd></div><div><dt className="font-caption text-muted-foreground">仓库</dt><dd><a className="text-brand hover:underline" href={service.repository}>{service.repository}</a></dd></div><div><dt className="font-caption text-muted-foreground">文档</dt><dd><a className="text-brand hover:underline" href={service.documentation}>{service.documentation}</a></dd></div></dl></section>
            <section className="rounded-card border border-border p-4"><h2 className="font-title-sm">依赖关系</h2>{service.dependencyIds.length ? <ul className="mt-2 grid gap-2">{service.dependencyIds.map(id => <li key={id}><Link className="rounded-card border border-border p-2 hover:bg-surface-hover" to={`/services/${id}?ws=${params.get('ws') ?? ''}`}>{data.services.find(item => item.id === id)?.name}</Link></li>)}</ul> : <StateView className="py-6" icon="◇" title="无依赖关系" />}</section>
            <section className="rounded-card border border-border p-4"><h2 className="font-title-sm">最近事件</h2>{incidents.length ? <ul className="mt-2 grid gap-2">{incidents.slice(0,5).map(item => <li key={item.id}><Link to={`/events/${item.id}?ws=${params.get('ws') ?? ''}`} className="block rounded-card border border-border p-2 hover:bg-surface-hover"><span className="numeric font-micro text-brand">{item.key}</span><span className="block font-caption">{item.title}</span></Link></li>)}</ul> : <StateView className="py-6" icon="✓" title="无关联事件" />}</section>
            <section className="rounded-card border border-border p-4"><h2 className="font-title-sm">最近变更</h2>{changes.length ? <ul className="mt-2 grid gap-2 font-caption">{changes.map(change => <li key={change.id} className="flex items-center justify-between rounded-card border border-border p-2"><span>{change.key} · {change.title}</span><Badge tone={change.status === 'failed' ? 'danger' : change.status === 'running' ? 'brand' : 'success'}>{change.status}</Badge></li>)}</ul> : <StateView className="py-6" icon="◷" title="暂无变更" />}</section>
            <section className="rounded-card border border-border p-4"><h2 className="font-title-sm">健康检查</h2><ul className="mt-2 grid gap-2 font-caption"><li className="flex justify-between"><span>最新状态</span><Badge tone={healthTone}>{service.health}</Badge></li><li className="flex justify-between"><span>检查时间</span><span className="numeric">{formatDateTime(service.lastChangeAt)}</span></li><li className="flex justify-between"><span>相对更新</span><span>{relativeTime(service.lastChangeAt)}</span></li></ul></section>
          </div>
        </main>
        <aside aria-label="服务属性" className="hidden w-80 shrink-0 overflow-y-auto border-l border-border p-4 lg:block"><h2 className="font-title-sm">告警规则</h2>{service.alertRules.length ? <ul className="mt-2 grid gap-2">{service.alertRules.map(rule => <li key={rule} className="rounded-card border border-border p-2 font-caption">{rule}</li>)}</ul> : <p className="font-caption text-faint">暂无告警规则</p>}</aside>
      </div>
      <ServiceFormDialog open={editOpen} service={service} onClose={() => setEditOpen(false)} />
      <ConfirmDialog open={confirm} title={service.status === 'active' ? '停用服务' : '恢复服务'} message={`确认${service.status === 'active' ? '停用' : '恢复'} ${service.name}？`} confirmLabel={service.status === 'active' ? '停用' : '恢复'} onClose={() => setConfirm(false)} onConfirm={() => {
        updateData(current => ({ ...current, services: current.services.map(item => item.id === service.id ? { ...item, status: service.status === 'active' ? 'disabled' : 'active', health: service.status === 'active' ? 'disabled' : 'healthy' } : item) }))
        showToast({ tone: 'success', title: service.status === 'active' ? '服务已停用' : '服务已恢复' }); setConfirm(false)
      }} />
    </div>
  )
}
