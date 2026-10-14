---
name: feedback
when: 操作完成、失败、进行中的反馈
blocks: [blocks/notify, ui/sonner, ui/spinner]
decisions:
  - key: feedback.channel
    options: [toast, inline]
    default: toast
self_review:
  - 所有 toast 走 notify，没有直接 import sonner
  - 成功文案是短过去式（「已保存」），失败文案说明对象与原因
  - 按钮触发的异步操作在进行中 disabled + Spinner
  - 页面加载失败不用 toast（那是 state pattern 的 ErrorState）
---

# Feedback

| 场景 | 通道 |
|---|---|
| 操作结果（保存、删除、复制） | `notify.success / notify.error` |
| 可撤销操作 | `notify.undo(message, onUndo)` |
| 较长操作 | `notify.promise(p, { loading, success })` |
| 字段错误 | 表单内 FieldError（form pattern） |
| 页面/区块数据加载失败 | ErrorState（state pattern） |
| 需要持续关注的系统状态 | 页面顶部 `Alert`，可关闭 |

```tsx
const save = useMutation({
  mutationFn: api.update,
  onSuccess: () => notify.success(),
  onError: (error) => notify.error(error, "保存失败"),
})
<Button disabled={save.isPending} onClick={() => save.mutate(values)}>{save.isPending ? <Spinner /> : null}保存</Button>
```

规则
- 同一时刻 toast ≤ 3 条；轮询/自动刷新永远不弹 toast。
- 复制到剪贴板：按钮图标短暂变 ✓（Id / CodeBlock 已内置），不需要 toast。
- 乐观更新失败时回滚并 notify.error。
