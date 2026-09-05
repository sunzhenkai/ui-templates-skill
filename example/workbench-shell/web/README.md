# workbench-shell web — 软件交付与运维事件协作中心

基于本仓库 `templates/workbench-shell`（schema v2）通过 `ui-template-apply` Phase 0–9 流程从零生成的前端站点，用于验证模板的视觉还原与生成稳定性。视觉基准为本会话部署的 multica（revision 879d0de9）本地实例；业务内容为运维事件协作域，不复制 multica 业务数据。

## 运行

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # tsc -b && vite build
pnpm lint       # oxlint
pnpm test       # vitest
pnpm test:e2e   # playwright（需先 pnpm exec playwright install chromium）
```

## 功能区

收件箱 / 事件列表（表格+看板）/ 事件详情 / 服务目录 / 值班日历 / 交付分析 / 工作区设置，外加 ⌘K 命令面板、全局创建事件（C）、快捷键帮助（?）、Toast、确认对话框、路由进度条与值班助手 FAB。全部数据为本地 mock；失败演练：`localStorage.setItem("mock-fail","1")` 后执行任意写操作。

## 模板契约落点

- 精确值唯一来源：`templates/workbench-shell/tokens.yaml`（含 `layout.canvas-inset`），见 `src/index.css` 的 `@theme` 映射。
- 组件规则：`templates/workbench-shell/components.md`（AX-001…AX-116）。
- Web 壳结构：`templates/workbench-shell/platforms/web.md`（LAYOUT-017 inset 画布）。
- Apply 状态与证据：`.ui-template-apply/`（checkpoint / 00–09 / evidence）。
