---
name: confirm
when: 删除、停用、覆盖、批量操作等需要用户确认或可撤销的动作
blocks: [blocks/confirm, blocks/notify]
decisions:
  - key: confirm.irreversible
    options: [type_to_confirm, confirm]
    default: type_to_confirm
self_review:
  - 可逆操作没有确认框，而是执行后 notify.undo
  - 不可逆操作用 useConfirm，标题是动词+对象（「删除项目 X？」），说明后果
  - 影响他人或大量数据时要求输入资源名（typeToConfirm）
  - 没有 window.confirm / alert
  - 对话框底部操作区与正文之间有间距（DialogFooter），不另加分割线也不贴底
---

# Confirm

按后果选强度，而不是一律弹框：

| 后果 | 做法 |
|---|---|
| 可逆（归档、停用、移动） | 直接执行 → `notify.undo("已归档", restore)` |
| 不可逆，仅影响自己 | `confirm({ title, description, destructive: true })` |
| 不可逆，影响他人/大量数据 | 额外 `typeToConfirm: resource.name` |

```tsx
const confirm = useConfirm()
async function remove() {
  const ok = await confirm({
    title: `删除项目「${project.name}」？`,
    description: "项目下的 12 个任务和全部运行记录会被永久删除。",
    destructive: true,
    typeToConfirm: project.name,
  })
  if (!ok) return
  await notify.promise(api.deleteProject(project.id), { loading: "正在删除…", success: "已删除" })
  navigate("/projects", { replace: true })
}
```

规则
- 确认按钮文案是具体动词（「删除」「停用」），不是「确定」。
- 批量操作在描述里写数量（「将删除 8 项」）。
- 失败时保持在原页面并 notify.error，不要关闭上下文。
