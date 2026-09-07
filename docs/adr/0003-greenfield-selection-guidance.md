# Greenfield 选型引导采用分层建议与官方 CLI 优先

greenfield/bootstrap 的 Architecture gate 引入 project-init 式分层建议语义（必选 / 默认 / 强烈推荐 / 推荐 / 特定场景再用 / 用户点名）与「官方 CLI 优先」落地原则（如 `pnpm create vite` / `create-next-app` / `shadcn init`，不手搓等价配置），并提供一条默认候选路径（Vite + React + TS + Tailwind + shadcn）。该栈是 decision gate 中需用户确认的默认候选，不是静默默认，skill 保持 stack-neutral 立场；guidance 自包含在公开 skill 文本中，不依赖本地安装 project-init。

引导表覆盖 Architecture gate 的全部闭集层（language / UI framework / bundler / routing / styling / client/server state / data access / unit/browser verification / package manager / repo shape）：UI 相关层附官方 CLI 命令，非 UI 层给默认候选与备选。Vue / Svelte / 无打包等是合法候选；project-init 的「栈不兼容」立场是其 scaffold 工具边界，design skill 不沿用。
