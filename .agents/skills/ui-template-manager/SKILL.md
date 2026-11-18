---
name: ui-template-manager
description: 本仓库内的 ui-template 薄路由，仅在需要在 apply、design、author、cleanroom 之间选择工作流时使用。目标 skill 已明确时直接进入对应 skill；仓库外任务不触发。仅用于本仓库，不发布。
metadata:
  internal: true
---

# ui-template-manager

| 请求 | 去处 |
|---|---|
| 在某项目实现或重构页面 | `skills/ui-template-apply` |
| 新风格 / 换主色 / 深色模式 | `skills/ui-template-design` |
| 照某来源做风格包、发布新版本 | `skills/ui-template-author` |
| 改了 skill，想验证是否仍然好用 | `.agents/skills/ui-template-cleanroom` |
| 消费项目反馈的界面问题 | apply `steps/06-iterate.md` 分诊；涉及共享层则改本仓库并跑 clean-room |
