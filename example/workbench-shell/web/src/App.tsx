import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

type Status = '待确认' | '处理中' | '等待外部' | '已解决' | '已归档'
type Incident = { id: string; title: string; status: Status; severity: 'S1' | 'S2' | 'S3'; service: string; owner: string; updated: string; comments: number; tags: string[] }
type Route = 'inbox' | 'incidents' | 'board' | 'services' | 'oncall' | 'analytics' | 'settings'

const initialIncidents: Incident[] = [
  { id: 'INC-1842', title: '支付网关的 5xx 比例升高', status: '待确认', severity: 'S1', service: 'payments-api', owner: '林墨', updated: '刚刚', comments: 4, tags: ['客户影响'] },
  { id: 'INC-1841', title: '检索索引延迟超过目标', status: '处理中', severity: 'S2', service: 'search-indexer', owner: '周航', updated: '12 分钟前', comments: 7, tags: ['性能'] },
  { id: 'INC-1838', title: '合作方回调等待确认', status: '等待外部', severity: 'S3', service: 'partner-hub', owner: '陈晓', updated: '38 分钟前', comments: 2, tags: ['供应商'] },
  { id: 'INC-1834', title: '移动端发布回归验证', status: '已解决', severity: 'S2', service: 'mobile-bff', owner: '林墨', updated: '昨天', comments: 9, tags: ['发布'] },
]
const nav: { group: string; items: [Route, string, string][] }[] = [
  { group: '个人', items: [['inbox', '收件箱', '6']] },
  { group: '运维', items: [['incidents', '事件', ''], ['board', '事件看板', ''], ['services', '服务目录', ''], ['oncall', '值班日历', ''], ['analytics', '交付分析', '']] },
  { group: '配置', items: [['settings', '工作区设置', '']] },
]
const pageMeta: Record<Route, [string, string]> = {
  inbox: ['收件箱', '处理分派给你的告警与待确认事项'],
  incidents: ['事件', '所有事件的筛选、维护与状态流转'],
  board: ['事件看板', '按当前处理阶段查看工作负载'],
  services: ['服务目录', '服务健康、依赖关系与变更上下文'],
  oncall: ['值班日历', '安排值班、交接与当班事件'],
  analytics: ['交付分析', '事件效率、稳定性与变更趋势'],
  settings: ['工作区设置', '团队、成员、通知和个人偏好'],
}

function App() {
  const [route, setRoute] = useState<Route>('inbox')
  const [incidents, setIncidents] = useState(initialIncidents)
  const [workspace, setWorkspace] = useState('生产运营')
  const [searchOpen, setSearchOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [detail, setDetail] = useState<Incident | null>(null)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState('全部')
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('sidebar-width') ?? 256))
  const dragId = useRef<string | null>(null)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) }
      if (!editing && e.key.toLowerCase() === 'c') { e.preventDefault(); setCreateOpen(true) }
      if (e.key === 'Escape') { setSearchOpen(false); setCreateOpen(false); setDetail(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { localStorage.setItem('sidebar-width', String(sidebarWidth)) }, [sidebarWidth])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) } }, [toast])

  const visible = useMemo(() => incidents.filter(i =>
    (severity === '全部' || i.severity === severity) &&
    `${i.id} ${i.title} ${i.service} ${i.owner}`.toLowerCase().includes(query.toLowerCase())), [incidents, query, severity])
  const navigate = (next: Route) => { setRoute(next); setMobileNav(false); setDetail(null) }
  const moveIncident = (id: string, status: Status) => {
    setIncidents(items => items.map(item => item.id === id ? { ...item, status, updated: '刚刚' } : item))
    setToast(`已将 ${id} 移至「${status}」`)
  }
  const resize = (e: React.PointerEvent) => {
    const startX = e.clientX, start = sidebarWidth
    const move = (event: PointerEvent) => setSidebarWidth(Math.max(216, Math.min(360, start + event.clientX - startX)))
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end)
  }

  return <div className="app-shell" style={{ '--sidebar': `${sidebarWidth}px` } as React.CSSProperties}>
    <aside className={mobileNav ? 'sidebar is-open' : 'sidebar'} aria-label="主导航">
      <button className="workspace" onClick={() => setWorkspace(workspace === '生产运营' ? '平台工程' : '生产运营')} aria-label="切换工作区">
        <span className="workspace-mark">S</span><span><b>{workspace}</b><small>工作区 · 切换</small></span><span>⌄</span>
      </button>
      <button className="search-trigger" onClick={() => setSearchOpen(true)}><span>⌕ 搜索</span><kbd>⌘K</kbd></button>
      <button className="create-trigger" onClick={() => setCreateOpen(true)}>＋ 创建事件 <kbd>C</kbd></button>
      <nav className="nav-scroll">
        {nav.map(group => <section key={group.group}><p className="nav-label">{group.group}</p>
          {group.items.map(([key, label, count]) => <button key={key} className={route === key ? 'nav-item active' : 'nav-item'} onClick={() => navigate(key)}>
            <span>{label}</span>{count && <em>{count}</em>}
          </button>)}
        </section>)}
        <section><p className="nav-label">置顶事件</p>
          {incidents.filter(i => i.severity === 'S1').map(i => <button className="pin" key={i.id} onClick={() => setDetail(i)}><span className="dot danger" />{i.id}<span aria-label="取消置顶">×</span></button>)}
        </section>
      </nav>
      <button className="help" onClick={() => setToast('快捷键：⌘K 搜索 · C 创建 · Esc 关闭')}>? 帮助与快捷键</button>
      <span className="resize-handle" onPointerDown={resize} aria-label="调整侧栏宽度" role="separator" />
    </aside>
    {mobileNav && <button className="scrim" aria-label="关闭导航" onClick={() => setMobileNav(false)} />}
    <main className="canvas">
      <header className="page-header">
        <button className="menu mobile-only" onClick={() => setMobileNav(true)} aria-label="打开导航">☰</button>
        <div><p className="eyebrow">{workspace} / 运维协作</p><h1>{pageMeta[route][0]}</h1></div>
        <div className="header-actions"><button className="icon-button" aria-label="通知" onClick={() => setToast('没有新的通知')}>◌</button><button className="avatar" aria-label="当前用户">LM</button></div>
      </header>
      <section className="toolbar" aria-label="页面工具栏">
        <p>{pageMeta[route][1]}</p>
        <div><button onClick={() => setToast('正在刷新本地 mock 数据…')}>↻ 刷新</button>{route !== 'settings' && <button className="primary" onClick={() => setCreateOpen(true)}>创建事件</button>}</div>
      </section>
      <div className="page-content">
        {route === 'inbox' && <Inbox items={visible} open={setDetail} query={query} setQuery={setQuery} />}
        {route === 'incidents' && <IncidentList items={visible} open={setDetail} query={query} setQuery={setQuery} severity={severity} setSeverity={setSeverity} move={moveIncident} />}
        {route === 'board' && <Board items={visible} open={setDetail} move={moveIncident} dragId={dragId} />}
        {route === 'services' && <Services open={() => setRoute('incidents')} toast={setToast} />}
        {route === 'oncall' && <OnCall toast={setToast} />}
        {route === 'analytics' && <Analytics open={() => setRoute('incidents')} />}
        {route === 'settings' && <Settings toast={setToast} />}
      </div>
    </main>
    <button className="chat-fab" aria-label="打开协作助手" onClick={() => setToast('协作助手已准备好')}>✦</button>
    {searchOpen && <SearchDialog incidents={incidents} close={() => setSearchOpen(false)} open={(incident) => { setDetail(incident); setSearchOpen(false) }} navigate={navigate} />}
    {createOpen && <CreateDialog close={() => setCreateOpen(false)} create={(incident) => { setIncidents([incident, ...incidents]); setCreateOpen(false); setRoute('incidents'); setToast(`${incident.id} 已创建并同步到看板`) }} />}
    {detail && <DetailPanel item={detail} close={() => setDetail(null)} move={moveIncident} />}
    {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast('')} aria-label="关闭提示">×</button></div>}
  </div>
}

function Inbox({ items, open, query, setQuery }: { items: Incident[]; open: (i: Incident) => void; query: string; setQuery: (v: string) => void }) {
  return <><div className="metric-row"><Metric value="6" label="待处理事项" /><Metric value="2" label="需要确认" /><Metric value="18m" label="平均响应时间" /></div>
    <div className="surface"><div className="filter-row"><input aria-label="搜索收件箱" placeholder="搜索编号、标题或负责人" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="事项类型"><option>所有事项</option><option>告警</option><option>分派</option></select><button>重置筛选</button><button>批量标记已读</button></div>
      <div className="table" role="table"><div className="tr th" role="row"><span><input type="checkbox" aria-label="全选结果" /></span><span>事项</span><span>严重等级</span><span>负责人</span><span>处理状态</span></div>
        {items.map(i => <button className="tr" role="row" key={i.id} onClick={() => open(i)}><span><input type="checkbox" onClick={e => e.stopPropagation()} aria-label={`选择 ${i.id}`} /></span><span><b>{i.id}</b><small>{i.title} · {i.service}</small></span><span><Badge label={i.severity} /></span><span>{i.owner}</span><span><Badge label={i.status} /></span></button>)}
      </div><footer className="pagination">显示 1–{items.length} 项，共 {items.length} 项 <span><button>上一页</button><button>1</button><button>下一页</button></span></footer></div></>
}

function IncidentList({ items, open, query, setQuery, severity, setSeverity, move }: { items: Incident[]; open: (i: Incident) => void; query: string; setQuery: (v: string) => void; severity: string; setSeverity: (v: string) => void; move: (id: string, s: Status) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  return <div className="surface"><div className="filter-row"><input aria-label="搜索事件" placeholder="筛选事件…" value={query} onChange={e => setQuery(e.target.value)} /><select value={severity} onChange={e => setSeverity(e.target.value)} aria-label="严重等级"><option>全部</option><option>S1</option><option>S2</option><option>S3</option></select><select aria-label="服务"><option>所有服务</option><option>payments-api</option><option>search-indexer</option></select><button onClick={() => navigator.clipboard?.writeText(`${location.origin}?severity=${severity}`)}>复制查询链接</button></div>
    {selected.length > 0 && <div className="bulk"><b>已选择 {selected.length} 项</b><button onClick={() => selected.forEach(id => move(id, '处理中'))}>批量分派</button><button>添加标签</button><button className="danger-text">归档</button></div>}
    <div className="table incidents" role="table"><div className="tr th" role="row"><span><input type="checkbox" aria-label="全选事件" onChange={e => setSelected(e.target.checked ? items.map(i => i.id) : [])} /></span><span>事件 ↕</span><span>状态</span><span>服务</span><span>负责人</span><span>更新时间</span></div>
      {items.map(i => <div className="tr" role="row" key={i.id}><span><input type="checkbox" checked={selected.includes(i.id)} aria-label={`选择 ${i.id}`} onChange={() => setSelected(s => s.includes(i.id) ? s.filter(x => x !== i.id) : [...s, i.id])} /></span><button className="link-cell" onClick={() => open(i)}><b>{i.id}</b><small>{i.title}</small></button><span><Badge label={i.status} /></span><span>{i.service}</span><span>{i.owner}</span><span>{i.updated}</span></div>)}
    </div></div>
}

function Board({ items, open, move, dragId }: { items: Incident[]; open: (i: Incident) => void; move: (id: string, s: Status) => void; dragId: React.MutableRefObject<string | null> }) {
  const statuses: Status[] = ['待确认', '处理中', '等待外部', '已解决', '已归档']
  return <div className="board" aria-label="事件看板">{statuses.map(status => { const group = items.filter(i => i.status === status); return <section className="board-column" key={status} onDragOver={e => e.preventDefault()} onDrop={() => dragId.current && move(dragId.current, status)}><header><div><b>{status}</b><small>{group.length} 项</small></div><button aria-label={`在${status}创建事件`}>＋</button></header><div className="cards">{group.length === 0 && <p className="empty">没有匹配的事件</p>}{group.map(i => <article draggable key={i.id} onDragStart={() => dragId.current = i.id} className="incident-card" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') open(i) }} onClick={() => open(i)}><div><Badge label={i.severity} /><span>{i.id}</span></div><b>{i.title}</b><small>{i.service} · {i.owner}</small><footer><span>◌ {i.comments}</span><span>{i.updated}</span></footer></article>)}</div></section> })}</div>
}

function Services({ open, toast }: { open: () => void; toast: (s: string) => void }) {
  const [cards, setCards] = useState(false)
  const services = [['payments-api', '支付平台', '健康', '3'], ['search-indexer', '搜索体验', '降级', '1'], ['mobile-bff', '移动端', '健康', '0']]
  return <div className="surface"><div className="filter-row"><input placeholder="搜索服务" aria-label="搜索服务" /><button onClick={() => setCards(!cards)}>{cards ? '列表视图' : '卡片视图'}</button><button className="primary" onClick={() => toast('新建服务表单已打开（mock）')}>新建服务</button></div><div className={cards ? 'service-grid' : 'service-list'}>{services.map(([name, team, health, count]) => <button className="service-item" key={name} onClick={open}><span className={`health ${health === '健康' ? 'ok' : 'warn'}`} /><span><b>{name}</b><small>{team} · 最近事件 {count}</small></span><Badge label={health} /><span>更新于 18 分钟前</span></button>)}</div></div>
}

function OnCall({ toast }: { toast: (s: string) => void }) {
  const [view, setView] = useState('周')
  return <div className="surface calendar"><div className="filter-row"><div className="segment">{['月', '周', '日'].map(v => <button key={v} className={view === v ? 'selected' : ''} onClick={() => setView(v)}>{v}</button>)}</div><button>‹</button><b>2026 年 9 月 14 日–20 日</b><button>今天</button><button>›</button><button className="primary" onClick={() => toast('创建值班班次表单已打开')}>安排值班</button></div><div className="calendar-grid">{['一 14', '二 15', '三 16', '四 17', '五 18', '六 19', '日 20'].map((day, index) => <article key={day}><b>{day}</b><button onClick={() => toast(`${day}：平台工程 · 林墨 · 09:00–18:00`)} className={index === 2 ? 'shift conflict' : 'shift'}>平台工程<br /><small>{index === 2 ? '⚠ 班次冲突' : '林墨 · 09:00–18:00'}</small></button>{index < 4 && <small>{index + 1} 个事件</small>}</article>)}</div><p className="notice">冲突校验：同一团队有重叠班次时需显式确认才能保存。</p></div>
}

function Analytics({ open }: { open: () => void }) {
  return <><div className="metric-row"><Metric value="42" label="事件总数" /><Metric value="3" label="未解决事件" /><Metric value="18m" label="平均响应时间" /><Metric value="1h 12m" label="平均恢复时间" /></div><div className="analytics-grid"><section className="surface chart"><header><b>事件趋势</b><select aria-label="时间范围"><option>最近 7 天</option><option>最近 30 天</option></select></header><div className="bars">{[35, 55, 30, 72, 48, 64, 38].map((h, i) => <button key={i} style={{ height: `${h}%` }} aria-label={`${i + 1} 天前，${h} 个事件`} onClick={open} />)}</div><footer>一　　二　　三　　四　　五　　六　　日</footer></section><section className="surface ranking"><b>需要关注的服务</b>{['payments-api', 'search-indexer', 'mobile-bff'].map((s, i) => <button onClick={open} key={s}><span>{i + 1}</span><b>{s}</b><small>{[12, 8, 5][i]} 起事件</small></button>)}</section></div></>
}

function Settings({ toast }: { toast: (s: string) => void }) {
  const [tab, setTab] = useState('基本信息')
  const [name, setName] = useState('生产运营')
  const tabs = ['基本信息', '成员与权限', '团队', '通知规则', '集成', '个人偏好']
  return <div className="settings surface"><nav>{tabs.map(t => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</nav><form onSubmit={e => { e.preventDefault(); toast(`${tab}已保存`) }}><p className="eyebrow">工作区 / {tab}</p><h2>{tab}</h2>{tab === '基本信息' && <><label>工作区名称<input value={name} onChange={e => setName(e.target.value)} /></label><label>描述<textarea defaultValue="面向软件交付与运维事件的协作空间。" /></label><label>默认时区<select><option>Asia/Shanghai (UTC+8)</option></select></label></>}{tab === '成员与权限' && <><div className="member"><span className="avatar">LM</span><b>林墨</b><select><option>管理员</option><option>成员</option></select><button className="danger-text">暂停成员</button></div><button type="button">邀请成员</button></>}{tab === '通知规则' && <><label>触发事件<select><option>新增 S1 事件</option></select></label><label>接收对象<input defaultValue="平台工程" /></label><button type="button">新建通知规则</button></>}{tab === '集成' && <><div className="integration"><b>Deploy bot</b><span>已启用</span><button type="button" onClick={() => toast('测试连接成功')}>测试连接</button></div><button type="button">新增 Webhook</button></>}<footer><button type="button">取消</button><button className="primary">保存更改</button></footer></form></div>
}

function SearchDialog({ incidents, close, open, navigate }: { incidents: Incident[]; close: () => void; open: (i: Incident) => void; navigate: (r: Route) => void }) {
  const [term, setTerm] = useState(''); const [index, setIndex] = useState(0)
  const results = incidents.filter(i => `${i.id}${i.title}${i.service}`.toLowerCase().includes(term.toLowerCase()))
  const key = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowDown') setIndex(Math.min(index + 1, results.length - 1)); if (e.key === 'ArrowUp') setIndex(Math.max(index - 1, 0)); if (e.key === 'Enter' && results[index]) open(results[index]) }
  return <div className="overlay" role="presentation" onMouseDown={close}><section className="dialog command" role="dialog" aria-modal="true" aria-label="全局搜索" onMouseDown={e => e.stopPropagation()}><input autoFocus value={term} onKeyDown={key} onChange={e => setTerm(e.target.value)} placeholder="搜索事件、服务、成员或变更…" aria-label="全局搜索" /><p>事件 · {results.length} 个结果</p>{results.length ? results.map((i, n) => <button className={n === index ? 'result selected' : 'result'} key={i.id} onClick={() => open(i)}><Badge label={i.severity} /><span><b>{i.title}</b><small>{i.id} · {i.service}</small></span></button>) : <div className="empty">未找到结果。尝试按服务或事件编号搜索。</div>}<footer><button onClick={() => navigate('services')}>浏览服务目录</button><kbd>↑↓ 选择　↵ 打开　Esc 关闭</kbd></footer></section></div>
}

function CreateDialog({ close, create }: { close: () => void; create: (i: Incident) => void }) {
  const [title, setTitle] = useState(''); const [service, setService] = useState(''); const [severity, setSeverity] = useState('S2'); const [error, setError] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); if (!title || !service) return setError('标题、影响服务和严重等级为必填字段。'); create({ id: `INC-${1843 + Math.floor(Math.random() * 100)}`, title, service, severity: severity as Incident['severity'], status: '待确认', owner: '未分派', updated: '刚刚', comments: 0, tags: [] }) }
  return <div className="overlay" role="presentation"><form className="dialog create" role="dialog" aria-modal="true" aria-label="创建事件" onSubmit={submit}><header><div><p className="eyebrow">新事件</p><h2>创建事件</h2></div><button type="button" onClick={close} aria-label="关闭">×</button></header>{error && <p className="form-error" role="alert">{error}</p>}<label>标题 *<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="描述需要处理的问题" /></label><label>影响服务 *<select value={service} onChange={e => setService(e.target.value)}><option value="">选择服务</option><option>payments-api</option><option>search-indexer</option><option>mobile-bff</option></select></label><label>严重等级 *<select value={severity} onChange={e => setSeverity(e.target.value)}><option>S1</option><option>S2</option><option>S3</option></select></label><label>负责人<select><option>未分派</option><option>林墨</option><option>周航</option></select></label><label>描述<textarea placeholder="添加影响范围、观察结果与下一步…" /></label><label>标签<input placeholder="例如：客户影响、发布" /></label><footer><button type="button" onClick={() => { setTitle(''); setService('') }}>清空</button><button type="button" onClick={close}>取消</button><button className="primary">创建事件</button></footer></form></div>
}

function DetailPanel({ item, close, move }: { item: Incident; close: () => void; move: (id: string, s: Status) => void }) {
  const next: Partial<Record<Status, Status>> = { 待确认: '处理中', 处理中: '已解决', 等待外部: '处理中', 已解决: '已归档' }
  return <div className="detail-backdrop" onMouseDown={close}><aside className="detail-panel" role="dialog" aria-modal="true" aria-label={`${item.id} 详情`} onMouseDown={e => e.stopPropagation()}><header><button onClick={close}>← 返回</button><button onClick={close} aria-label="关闭详情">×</button></header><p className="eyebrow">{item.id} · <Badge label={item.status} /></p><h2>{item.title}</h2><div className="detail-grid"><span>严重等级</span><Badge label={item.severity} /><span>影响服务</span><button className="text-link">{item.service}</button><span>负责人</span><b>{item.owner}</b><span>参与团队</span><b>平台工程</b></div>{next[item.status] && <button className="primary full" onClick={() => move(item.id, next[item.status]!)}>标记为{next[item.status]}</button>}<section><h3>时间线</h3><ol className="timeline"><li><b>林墨</b> 更新了事件状态 <small>刚刚</small></li><li><b>系统</b> 创建事件并关联告警 <small>12 分钟前</small></li></ol></section><section><h3>评论</h3><textarea placeholder="@成员，记录处理进展" /><button>发表评论</button></section><section><h3>上下文</h3><p>相似事件：缓存命中率下降</p><p>最近变更：payments-api v2.18.0</p></section></aside></div>
}
function Metric({ value, label }: { value: string; label: string }) { return <button className="metric"><b>{value}</b><span>{label}</span><small>与上一周期相比 ↗ 12%</small></button> }
function Badge({ label }: { label: string }) { return <span className={`badge ${label.replaceAll(' ', '-')}`}>{label}</span> }
export default App
