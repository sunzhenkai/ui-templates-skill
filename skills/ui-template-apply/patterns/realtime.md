---
name: realtime
when: 运行中的任务、自动刷新的列表、推送更新
blocks: [blocks/status-badge, blocks/format]
decisions:
  - key: realtime.transport
    options: [poll, sse]
    default: poll
self_review:
  - 只在存在运行中对象时轮询（refetchInterval 返回 false 停止）
  - 后台刷新不改变滚动位置、不重置选中、不闪骨架
  - 运行中状态用 StatusBadge 的 pulse，不额外加 spinner
  - 页面不可见时停止轮询（React Query 默认）
---

# Realtime

```tsx
const runs = useQuery({
  queryKey: ["runs", jobId],
  queryFn: () => api.runs(jobId),
  refetchInterval: (query) => (query.state.data?.some((r) => r.status === "running") ? 3000 : false),
})
```

规则
- 间隔：运行中 2–5s；空闲不轮询。SSE 推送时用 `queryClient.setQueryData` 合并，不整表 refetch。
- 相对时间（`<Time>`）每分钟自动更新即可，不需要秒级。
- 新出现的行插入顶部时不要抢焦点；如用户已滚动离开顶部，显示「n 条新记录」按钮。
- 终态（成功/失败）出现时可以 notify 一次，仅限用户本次会话触发的操作。
