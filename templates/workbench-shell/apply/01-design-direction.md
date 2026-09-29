---
created_at: '2026-09-28T15:05:00Z'
mode: bootstrap
theme: light-only
density: dense-14px
---

# Phase 1 Design Direction

## 外部查询记录

- `frontend-design`：已作为本地 vendor 方法加载；未联网，不发送项目内容。
- `tailwind-css-patterns` 与 `tailwind-design-system`：已按 Tailwind v4 触发加载；仅用于实现组织，不提供第二套精确值。
- 冲突裁决：模板 `spec.md`、`tokens.yaml`、`fidelity.yaml` 优先；vendor 建议只映射到已有 token/rule。

## 页面单一职责

站点是“软件交付与运维事件协作中心”：帮助团队把告警转为事件、协调处理、跟踪服务健康与交付指标。每个 route 只服务一个主要任务，设置 route 服务配置任务。

## Design thesis

用一个安静的浅色工作台外壳承载高密度运维信息：外侧 chrome 降低视觉噪音，内嵌画布中的表格、看板、详情与设置分区保持清晰边界；蓝色只用于链接、关键主行动和图表主序列，状态色必须伴随可读状态名。

## 信息词汇表

- 严重等级：`critical / high / medium / low`。
- 事件状态：`new / acknowledged / in_progress / waiting_external / resolved / archived`。
- 服务健康：`healthy / degraded / down / disabled`。
- 异步状态：`loading / success / empty / error / submitting`。

## 安静元素

外壳背景、分隔线、metadata、空隙、次级行动保持低对比；未读与待处理数量为零时不显示徽标。装饰不允许替代结构。

## 视觉重点

- 当前导航、主行动、当前筛选条件、选中行/卡片、危险确认按钮。
- 状态徽标使用状态色 + 状态文字。
- 表格保持 14px 正文、12px metadata 和明确行边界。
- 浮层使用模板 floating shadow 和焦点环。

## Anti-patterns

- 不引入 dark 主题、渐变横幅、玻璃拟态、彩色大背景或装饰插画。
- 不用颜色单独表达状态、严重等级或健康。
- 不把所有卡片都升级成 raised shadow。
- 不让表格/看板参与外壳整体滚动；分窗格各自滚动。
- 不因样式发明新的精确值；所有颜色/圆角/尺寸回溯 token。

## 实现前自我批判

候选方案曾考虑把七个工作区做成标签页和把所有列表改为卡片流；拒绝原因是削弱 workbench-shell 的 app-shell / master-detail / board / settings 语义，并降低运维密度。最终方案把功能需求映射到模板已声明的 Page Type，不新增第八层。

## Local rules 摘要

- `LOCAL-STYLE-001`：同语义控件保持同一 token treatment。
- `LOCAL-INFORMATION-001`：状态必须使用语义文本 + 可选状态色。
- `LOCAL-PLACEMENT-001`：全局主行动与搜索进入 shell chrome，列表主操作进入 page toolbar，详情局部操作留在 detail pane。
