# Phase 0 Intake

- 模板：`workbench-shell` `template_version: 2.0.0`，`schema_version: 2`
- 模板 digest：`sha256-canonical-json-v1:36b5a502ad0e2ab0945f1826f69c003f3e0041180a8dabb6080c16c2636ef161`
- tokens digest：`sha256-canonical-json-v1:507960a802ad6275fa7e3b2eb8d4bd221eb2c5c08fce882a496c565f9539dfa9`
- checker：`scripts/validate_templates.py templates/workbench-shell --index templates/INDEX.md --json` → errors=0，contrast light/dark 各 checked=17 failed=0
- structural fidelity：`legacy-baseline`（无 `fidelity.yaml` sidecar；replay `not-run`）
- 消费项目：`example/workbench-shell/web-v1`
- 平台：Web 响应式 SPA。Native Mobile / Native Desktop 独立壳排除。
- 技术栈：Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query + Zustand + Zod + React Router + Playwright + Vitest。由 project-init 初始化；因多路由与表单需求增加 `react-router` 与 `react-hook-form`/`zod` 校验。

## Coverage 决定

### accepted（纳入实现）

- platforms.observed: web（以响应式 Web 覆盖 desktop/tablet/mobile **视口**）
- viewports: desktop, tablet, mobile
- themes: light, dark
- page_modes: A, B, C, D, E
- components.observed 全部
- components.defaulted 全部（avatar, calendar, checkbox, combobox, command-palette, date-picker, metric-card, pagination, progress, select, slider, switch, toast）——产品提示词要求这些交互
- states.observed 全部
- states.defaulted 全部（dragging, invalid, read-only, resized）

### deferred

- 无

### excluded

- platform native-mobile（`platforms/mobile.md` 的 bottom-tab / navigation-stack）
- platform native-desktop（`platforms/desktop.md` 的 window chrome / tab strip）
- legacy「文档详情」第六种模式：本产品无独立文档 master，按 @ROUTE-006 说明 excluded，事件详情映射 D 时间线而非伪造第六模式

## 成功流程

1. 工作区切换后停留在当前功能区并刷新数据
2. 创建事件后列表/看板/收件箱计数一致
3. 看板拖动改状态并同步详情
4. 筛选与 settings tab 可由 URL 恢复
5. 窄屏 overlay 导航可打开并在路由后关闭
