# Greenfield

输出根不存在、为空、只有空子目录或 git 占位，或用户要求从零搭框架时走本模式。仅任务类 `bootstrap` 预加载本文；`iterate` 不要读。

闭集层：language、UI framework、bundler、routing、styling、client/server state、data access、unit/browser verification、package manager、repo shape。未确认前不得写应用源码或依赖清单，不得把任何栈写成 skill 默认。兄弟应用、功能规格里的技术提及只是候选。

## 选型引导

Architecture gate 按下表逐层展示候选与影响，采用分层建议语义：**必选**缺失不算完成；**默认**未指定替代时作为候选首选；**强烈推荐 / 推荐**默认装入，用户明确拒绝才省略；**特定场景再用 / 用户点名**不预装。组件体系（shadcn/ui、antd、MUI 等）随 styling / UI framework 层一并选型，Primitive 领养 gate 在阶段 4 细化。

| 层 | 建议 | 候选与官方 CLI 落地 |
| --- | --- | --- |
| language | 默认 | TypeScript（CLI 模板自带）；JavaScript 用户点名 |
| UI framework | 默认 | React（Vite `react-ts` 模板）；Vue / Svelte / Solid 用户点名 |
| bundler | 默认 | Vite；Next.js 属「特定场景再用」（SSR / RSC / SEO / App Router，用官方 `create-next-app`，由其承担 build / routing，不与 Vite 并存） |
| routing | 特定场景再用 | React Router（SPA 多路由）；Next.js 场景由框架承担 |
| styling | 默认 | Tailwind（经 `shadcn init` 接入）；组件体系默认 shadcn/ui，antd / MUI 等用户点名 |
| client/server state | 默认 / 强烈推荐 | client：Zustand（空 store 骨架）；server：TanStack Query |
| data access | 推荐 | Zod 契约校验；有 OpenAPI spec 才做官方 codegen，无 spec 不虚构 |
| unit/browser verification | 推荐 | Vitest + Testing Library；Playwright（配置 + 一条 smoke，不默认下载浏览器） |
| package manager | 默认 | pnpm > npm（用户指定优先；缺 pnpm 先询问是否补齐） |
| repo shape | 默认 | Vite 单根布局 + 官方生成物（`components.json`、`src/components/ui/`）；monorepo 用户点名 |

默认候选路径（gate 候选，须用户确认或明确授权后才采用）：Vite + React + TS + Tailwind + shadcn + Zustand + TanStack Query + Zod + Vitest + Playwright + pnpm。官方 CLI 优先：`pnpm create vite . --template react-ts`、`create-next-app`、`shadcn init` / `shadcn add <component>`；CLI 参数以当时官方文档为准，不钉死次版本，不得手写与官方 CLI 漂移的等价配置；CLI 缺失时先询问是否补齐。用户点名候选之外的合法栈（Vue、Svelte、无打包静态页等）按该栈展示候选与影响并落地，不得以「栈不兼容」拒绝。本引导自包含于本 skill，不依赖本地安装其他 skill。

确认后再：UX Model → Token Freeze（用户确认）→ Primitives → Patterns + Page Types → 规则块 → Gallery → 可选证明切片 → Visual loop → Freeze。

## Architecture gate

对闭集中每一层给出至少 2 个与项目目标相容的候选；唯一合法结果才可只做确认。每个候选说明长期代价、生态/维护影响和与 UX 方向的匹配度。用户可授权 Agent 选默认，但默认必须先展示影响并记入 decision gates；不得用 skill 偏好替代选型。
