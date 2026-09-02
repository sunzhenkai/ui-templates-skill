# Workbench Shell · web-v2 验收记录

## 范围

按 `example/workbench-shell/prompts/README.md` 实现七个工作区：收件箱、事件列表、事件看板、服务目录、值班日历、交付分析、工作区设置。实现同时覆盖事件详情、服务详情、全局搜索、全局创建、快捷键、Toast、确认框和 FAB。技术栈为 React + Vite + TypeScript + Tailwind CSS v4；未读取或复用现有 `web` 目录。

## 模板映射

- App Shell：web 浮岛侧栏、8px 呼吸边、14px 画布圆角、1px 分割线、`100svh` 根容器不滚动。
- 页面模式：事件列表/看板为模式 A，收件箱为模式 B，事件/服务详情为模式 C，设置为模式 D，服务聚合为模式 E。
- 响应式：≥1024 常驻侧栏可拖宽；<1024 页头触发器 + 覆盖抽屉；<768 保持核心操作并使用分段切换。
- URL 状态：`ws`、`id`、`tab`、`view`、筛选、分页、排序；刷新后可恢复。
- 主题：亮/暗双主题 token 同名、方向反转；FAB 面板可切换。

## 自动化结果

- `pnpm lint`：oxlint 通过（少量 React hook/纯函数提示，不阻断）。
- `pnpm build`：TypeScript check + Vite production build 通过。
- `pnpm test`：Vitest 3 条通过，覆盖 URL 筛选恢复、创建事件同步、全局搜索。
- `pnpm test:e2e`：Playwright 9 条通过，覆盖 desktop / compact / mobile 三个视口、七个路由、导航抽屉、创建事件、console 错误、根容器 overflow 与关键 computed style。
- 浏览器截图：`test-results/**/events-{desktop,compact,mobile}.png`。

## 演示失败

可从 FAB 打开“模拟网络失败”；也可使用 `fail-search`、标题包含 `失败`、文件名包含 `fail-upload`、Webhook URL 包含 `fail` 触发局部错误，并验证保留输入与重试。

## 已知边界

- 数据保存在浏览器内存；刷新恢复默认工作区与 URL 状态，不承诺业务数据持久化。
- 上传、导出、集成测试连接均为本地 mock，不访问外部服务。
- 图表使用轻量 SVG/进度条实现，满足数据可读、悬停、图例开关和导出；未引入图表库。
