---
name: form
when: 新建、编辑、任何需要提交的输入
blocks: [ui/field, ui/input, ui/textarea, ui/select, ui/switch, ui/checkbox, blocks/notify]
decisions:
  - key: form.layout
    options: [single-column, two-column]
    default: single-column
  - key: form.container
    options: [page, dialog, sheet]
    default: page
self_review:
  - 每个控件都在 Field 里，有 FieldLabel；错误用 FieldError 显示在控件下方
  - 提交按钮在提交中 disabled 并显示 Spinner；成功 notify.success 后再跳转/关闭
  - 服务端校验错误回填到对应字段，而不是只弹 toast
  - 离开有未保存修改的页面会提示（useBlocker / beforeunload）
  - 必填只在少数时标注「必填」；多数必填时标注「可选」
---

# Form

原型：`reference/src/pages/form.tsx` —— `<Page width="form">` 内 `<form><Stack gap="xl">` 若干 FieldSet，成对短字段用 `Grid`，底部 `<Actions align="end">`。

规则
- 容器：≤ 4 个字段、无跨字段依赖 → dialog；需要参考背后列表 → sheet；其他 → 独立页面（`Page width="form"`）。
- 单列。两列只用于成对的短字段（起止时间、最小/最大值）。
- 分组用 FieldSet + FieldLegend（组间 `Stack gap="xl"`）；不要用 Card 分组。
- 校验时机：提交时全部校验；之后改动即时清除该字段错误。
- 操作按钮放在表单底部右对齐；页面级表单不要把保存放到 PageHeader（除非是设置页的即时保存）。
- 危险设置（删除、转移）放表单最后的独立 FieldSet，走 confirm pattern。
