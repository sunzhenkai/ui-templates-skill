---
name: settings
when: 多分区设置页、偏好、账户
blocks: [blocks/section-nav, ui/field, ui/switch, blocks/notify]
decisions:
  - key: settings.save
    options: [per_section, instant]
    default: per_section
self_review:
  - 分区导航是 SectionLayout：宽容器为吸顶竖排，窄容器为单行横向滚动；导航本身不产生第二个滚动条
  - 每个分区一个路由（/settings/general），而不是一个超长页面的锚点
  - 开关类设置即时保存（notify.success），文本类按分区保存
  - 危险操作分区放最后，单独标题
  - 分区导航与内容之间有分割线（宽：整高竖线；窄：横排导航下方横线），浅/深色都看得见
---

# Settings

原型：`reference/src/pages/settings.tsx` ——
`<Page title="设置" layout="fill"><SectionLayout items={sections} label="设置分区"><Outlet /></SectionLayout></Page>`；
每个分区 `<Section size="lg" gap="lg" title description>`，危险操作用 `Panel title description actions`。
SectionLayout 的竖线由 Split 画，从页头底线到画布底边，不要在分区页里再画分割。

规则
- `/settings` 重定向到第一个分区：`{ index: true, element: <Navigate to="general" replace /> }`（URL 要变，分区导航才能高亮）。
- 分区内容宽度 ≤ 42rem（form 宽度）；每行设置：左标签+说明，右控件（`Field orientation="horizontal"`）。
- 分区 ≤ 8 个；超过说明信息架构需要拆分。
- 不要用 Tabs 做设置分区——分区是路由，Tabs 是同一资源的视图。
