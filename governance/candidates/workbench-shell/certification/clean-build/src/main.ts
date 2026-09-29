import './styles.css'

type Incident = { id:string; title:string; status:string; severity:string; service:string; owner:string }
const incidents: Incident[] = [
  { id:'DEMO-1', title:'网关 P99 超时', status:'处理中', severity:'高', service:'API 网关', owner:'林可' },
  { id:'DEMO-2', title:'发布控制器不可达', status:'等待外部', severity:'严重', service:'发布控制器', owner:'赵杉' },
  { id:'DEMO-3', title:'登录延迟升高', status:'待确认', severity:'中', service:'认证服务', owner:'陈亮' },
]
const nav = [
  ['收件箱','/demo/inbox'],['事件列表','/demo/issues'],['事件看板','/demo/issues?__oracle_action=board'],
  ['服务目录','/demo/services'],['值班安排','/demo/oncall'],['交付分析','/demo/analytics'],['工作区设置','/demo/settings'],
]
function header(title:string, plain=false){return `<header data-slot="page-header"><${plain?"div":"h1"}>${title}</${plain?"div":"h1"}><div style="margin-left:auto"><button class="btn" data-action="create">创建事件</button></div></header>`}
function toolbar(){return `<div class="toolbar" data-slot="page-toolbar"><input aria-label="搜索事件" placeholder="搜索"><button class="btn secondary">筛选</button><button class="btn secondary">导出</button></div>`}
function sidebar(){return `<div class="sidebar-wrapper" data-slot="sidebar-wrapper"><div class="sidebar" role="navigation" aria-label="应用导航"><div class="brand">交付工作区</div><nav class="nav-group" aria-label="个人区"><div class="group-label">个人区</div>${nav.slice(0,1).map(([n,h])=>`<a class="nav-item" href="${h}">${n}</a>`).join('')}</nav><nav class="nav-group" aria-label="运维区"><div class="group-label">运维区</div>${nav.slice(1,6).map(([n,h])=>`<a class="nav-item" href="${h}">${n}</a>`).join('')}</nav><nav class="nav-group" aria-label="配置区"><div class="group-label">配置区</div>${nav.slice(6).map(([n,h])=>`<a class="nav-item" href="${h}">${n}</a>`).join('')}</nav><button class="nav-item" data-action="help">帮助</button></div></div>`}
function incidentsTable(){return `<table><thead><tr><th>编号</th><th>标题</th><th>状态</th><th>等级</th><th>服务</th><th>负责人</th></tr></thead><tbody>${incidents.map(i=>`<tr><td><a href="/demo/issues/${i.id}">${i.id}</a></td><td>${i.title}</td><td>${i.status}</td><td>${i.severity}</td><td>${i.service}</td><td>${i.owner}</td></tr>`).join('')}</tbody></table>`}
function board(){const cols=['待确认','处理中','等待外部','已解决','已归档'];return `<div class="board">${cols.map(c=>`<section class="column" aria-label="${c}"><h2>${c}</h2>${incidents.filter(i=>i.status===c).map(i=>`<article class="card"><strong>${i.id}</strong><p>${i.title}</p><span>${i.severity}</span></article>`).join('')||'<div class="empty">无事件</div>'}</section>`).join('')}</div>`}
function dialog(){return `<div class="overlay"><div role="dialog" aria-modal="true" aria-label="创建事件" data-slot="dialog-content"><h2>创建事件</h2><form><label class="field">标题<input></label><label class="field">影响服务<select><option>API 网关</option></select></label><label class="field">严重等级<select><option>高</option></select></label><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="btn secondary" data-close>取消</button><button class="btn">提交</button></div></form></div></div>`}
function render(){
 const url=new URL(location.href); const action=url.searchParams.get('__oracle_action'); const path=location.pathname.replace(/\/$/, '')
 let page=''
 if(path.startsWith('/demo/issues/')){
  const id=path.split('/').at(-1); const item=incidents.find(i=>i.id===id)
  page=item?`<div class="canvas"><div class="detail"><section><h2>事件详情</h2><div class="card">${item.id} ${item.title}</div></section><section data-slot="resizable-panel"><h2>时间线</h2><div class="card">创建事件</div></section></div></div>`:`<div class="canvas"><div class="error">404：事件不存在</div></div>`
  document.title='事件详情'
 } else if(path==='/demo/settings'){
  page=`<div class="settings-layout"><aside data-slot="settings-nav" aria-label="设置分区"><a class="nav-item" aria-current="page" href="#">基本信息</a><a class="nav-item" href="#">成员与权限</a><a class="nav-item" href="#">通知规则</a></aside><div class="canvas settings-page"><h1>基本信息</h1><div data-slot="card"><form><label class="field">工作区名称<input value="交付工作区"></label><button class="btn" type="button">保存</button></form></div></div></div>`; document.title='工作区设置'
 } else if(path==='/demo/services'){
  page=`<div class="canvas"><div class="card"><h2>服务目录</h2><table><thead><tr><th>服务</th><th>健康</th><th>团队</th></tr></thead><tbody><tr><td>API 网关</td><td>降级</td><td>核心服务组</td></tr></tbody></table></div></div>`; document.title='服务目录'
 } else if(path==='/demo/oncall'){
  page=`<div class="canvas"><div class="card"><h2>值班安排</h2><div class="empty">本周暂无排班</div></div></div>`; document.title='值班安排'
 } else if(path==='/demo/analytics'){
  page=`<div class="canvas"><div class="metrics">${['事件总数','未解决','MTTR','变更失败率'].map(x=>`<div class="card">${x}</div>`).join('')}</div><div class="card"><h2>趋势</h2><div class="empty">暂无数据</div></div></div>`; document.title='交付分析'
 } else if(path==='/demo/inbox'){
  page=`<div class="canvas"><div class="card"><h2>收件箱</h2>${incidentsTable()}</div></div>`; document.title='收件箱'
 } else {
  page=`<div class="canvas">${action==='board'?board():incidentsTable()}</div>`; document.title='事件列表'
 }
 document.getElementById('app')!.innerHTML=`<div class="shell">${sidebar()}<main class="main" data-slot="sidebar-inset">${header(document.title || '事件列表', path === '/demo/settings')}${path==='/demo/inbox'||path==='/demo/issues'?toolbar():''}${page}</main></div>`
 if(action==='open-new-issue') document.body.insertAdjacentHTML('beforeend',dialog())
}
document.addEventListener('click',e=>{
 const t=(e.target as HTMLElement).closest('[data-action],[data-close]') as HTMLElement|null
 if(!t) return
 if(t.dataset.action==='create'||t.dataset.action==='help'||t.hasAttribute('data-close')) location.search=t.hasAttribute('data-close')?'?':'?__oracle_action=open-new-issue'
})
window.addEventListener('popstate',render); render()
