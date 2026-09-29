---
created_at: '2026-09-28T15:20:00Z'
stack: react-vite-typescript-tailwind-zustand
repo_shape: single-app-directory
---

# Phase 3 Project Structure

## 输出根

`example/workbench-shell/web` 是唯一业务源码根。`.ui-template-apply/` 与 `.ui-template-design/` 是会话状态，不属于应用。

## 目录约定

```text
example/workbench-shell/web/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── playwright.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/tokens.css
│   ├── components/
│   ├── pages/
│   ├── data/
│   ├── store/
│   ├── tests/
│   └── e2e/
└── tests-results/
```

## 运行方式

- 开发：`pnpm dev`
- 构建：`pnpm build`
- lint：`pnpm lint`
- 单元：`pnpm test`
- E2E：`pnpm test:e2e`

## 状态与数据

- Zustand 保存工作区、事件、收件箱、服务、值班、设置与全局 UI 状态。
- `src/data` 保留 seed mock、类型与可控延迟/失败。
- 不引入真实后端、认证、通知或外部云服务。

## 源盲边界

不读取原版 checkout、模板 `meta.sources[]`、兄弟生成 web 或历史页面。实现只消费 `.ui-template-design/core/`、binding、fidelity 和功能提示词。
