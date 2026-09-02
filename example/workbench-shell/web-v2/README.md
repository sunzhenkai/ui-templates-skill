# Workbench Shell Web V2

基于 `workbench-shell` 模板从零实现的软件交付与运维事件协作中心。本目录不引用 `example/workbench-shell/web` 的实现；数据全部来自本地 mock，可注入延迟与失败。

## 常用命令

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5175
pnpm build      # TypeScript check + Vite build
pnpm lint       # oxlint
pnpm test       # Vitest 单元/组件测试
pnpm test:e2e   # Playwright 多视口冒烟验证
pnpm preview    # http://127.0.0.1:4175
```

## 功能入口

- 收件箱：`/inbox`
- 事件列表：`/events`
- 事件看板：`/board`
- 服务目录：`/services`
- 值班日历：`/on-call`
- 交付分析：`/analytics`
- 工作区设置：`/settings`

全局支持 `⌘K` / `Ctrl+K` 搜索、`C` 创建事件、`?` 快捷键帮助。侧栏可通过右缘分隔条调整宽度并持久化；窄屏使用页头触发器打开抽屉。

## 演示失败

1. 打开右下角助手浮球。
2. 勾选“模拟网络失败”，刷新页面查看错误态与重试。
3. 搜索输入 `fail-search`、创建事件标题包含 `失败`、上传文件名包含 `fail-upload`、Webhook URL 包含 `fail`，可分别触发局部失败。

## URL 状态

- `ws`：工作区。
- `id`：收件箱选中项。
- `view`：服务目录、日历等视图。
- `q`、`status`、`severity`、`serviceId`、`assigneeId`、`role`：筛选。
- `page`、`pageSize`、`sort`：事件分页与排序。
- `tab`：设置页签。
