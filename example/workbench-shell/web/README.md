# Workbench Shell 前端示例

基于 `workbench-shell` 模板实现的“软件交付与运维事件协作中心”前端示例。

## 功能范围

- 7 个业务工作区：收件箱、事件列表、事件看板、服务目录、值班日历、交付分析、工作区设置
- App Shell：浮岛侧栏、工作区切换、可拖拽宽度、折叠/移动端抽屉
- 全局搜索（⌘K / Ctrl+K）、创建事件（C 快捷键）、快捷键帮助、Toast、确认对话框
- 本地 mock 数据 + 模拟延迟 + 模拟失败开关
- 响应式布局（断点 768/1024）

## 技术栈

- React 19 + TypeScript
- Vite + Tailwind CSS v4
- @base-ui/react + shadcn/ui 风格组件
- Zustand + TanStack Query

## 启动

```bash
pnpm install
pnpm dev
```

## 脚本

```bash
pnpm build      # 生产构建
pnpm test       # 单元测试
pnpm test:e2e   # E2E 测试
pnpm lint       # 代码检查
```
