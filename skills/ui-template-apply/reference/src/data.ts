/** Deterministic mock data shared by the archetypes. */
export type Job = { id: string; name: string; status: "running" | "succeeded" | "failed" | "queued" | "canceled"; owner: string; count: number; updatedAt: string }
const NAMES = ["同步订单表", "导出报表", "重建索引", "清理缓存", "备份附件", "聚合事件流", "迁移日志分区", "审计权限"]
const STATUSES: Job["status"][] = ["running", "succeeded", "failed", "queued", "succeeded", "canceled", "succeeded"]
const OWNERS = ["林晓", "陈默", "王一", "赵青", "孙禾"]
const BASE = Date.UTC(2026, 9, 13, 0, 0, 0)
export const jobs: Job[] = Array.from({ length: 2400 }, (_, i) => ({
  id: `job_${(48271 * (i + 7)).toString(16).padStart(6, "0")}`,
  name: `${NAMES[i % NAMES.length]} #${String(i + 1).padStart(3, "0")}`,
  status: STATUSES[(i * 5) % STATUSES.length] ?? "queued",
  owner: OWNERS[(i * 3) % OWNERS.length] ?? "林晓",
  count: (i * 7919) % 4000 + 12,
  updatedAt: new Date(BASE - i * 47 * 60_000).toISOString(),
}))
export type Thread = { id: string; title: string; updatedAt: string }
export const threads: Thread[] = ["部署失败的原因分析", "本周指标汇总", "迁移计划评审", "权限模型问题", "日志查询语法", "上线检查清单", "索引重建耗时", "告警阈值调整"]
  .map((title, i) => ({ id: `t${i + 1}`, title, updatedAt: new Date(BASE - i * 9 * 3_600_000).toISOString() }))
