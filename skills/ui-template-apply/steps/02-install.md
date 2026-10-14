# 02 安装：库 + 主题

前提：Vite（或同类）+ React 19 + TypeScript + Tailwind 4，`@/*` → `src/*` 路径别名。
没有就先建：`npm create vite@latest app -- --template react-ts`，再 `npm i -D tailwindcss @tailwindcss/vite` 并在 vite.config 加插件与 alias。

```bash
python3 <skill>/scripts/install_registry.py --project . --package workbench-shell
npm i <脚本打印的依赖>          # 脚本只打印，不执行包管理器
npm i -D <打印的 devDependencies>
npm i @tanstack/react-query@^5   # 默认依赖：patterns 示例与 StateBoundary 都按它写；已有数据层见 patterns/state.md
```

写入内容：`src/components/ui/*`（shadcn radix-nova 原样）、`src/components/blocks/*`、`src/lib/vocab.ts`、
`src/styles/theme.css`、`eslint/ui-template.mjs`、`ui-template.lock.json`。

`src/index.css` 只有这几行：

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";
@import "./styles/theme.css";
```

`eslint.config.js` 加（脚手架没有 eslint 时先 `npm i -D eslint typescript-eslint`，并在数组最前面放 `{ ignores: ["dist"] }, ...tseslint.configs.recommended`）：

```js
import tseslint from "typescript-eslint"
import uiTemplate from "./eslint/ui-template.mjs"
export default [/* …项目原有配置 */ {
  files: ["src/**/*.tsx"], ignores: ["src/components/ui/**", "src/components/blocks/**"],
  languageOptions: { parser: tseslint.parser },
  plugins: { "ui-template": uiTemplate }, rules: uiTemplate.configs.recommended.rules,
}]
```

脚手架（Vite react-ts 等）自带 `react-refresh/only-export-components`、`react-hooks`：库文件按设计导出非组件符号，
在**同一个**配置数组末尾加一段覆盖，不要删脚手架原有的 extends：

```js
{ files: ["src/components/ui/**", "src/components/blocks/**"], rules: { "react-refresh/only-export-components": "off", "react-hooks/incompatible-library": "off" } }
```

安装脚本打印的 devDependencies 含 `@types/node`（vite.config 用 `node:path`）。

monorepo / 已有 flat config：把上面这一段并入根配置，`files`/`ignores` 加上应用目录前缀（如 `apps/web/src/**/*.tsx`）；
`ui-template/no-layout-classes` 只对页面生效（ui/、blocks/ 已忽略）：页面里的 border / rounded / 间距类全部换成 surfaces。
从 4.x 升级：`PageHeader + PageBody` → `<Page>`（`PageBody` 已删除），设置页外层换成 `<Page layout="fill">`。
库文件也要过项目自己的 lint（`no-unused-vars`、`consistent-type-imports` 等），它们是按这些规则写的。

库在 `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` 下零错误编译；
新项目在 `tsconfig.app.json` 打开这三项（脚手架默认不开）。开启后清除可选字段用条件展开或 `delete`，不要写 `{ ...x, field: undefined }`；
可选 props 一律写成 `?: T | undefined`，页面就能直接转传可能为空的值。

已有 shadcn 的项目：先 `--dry-run` 看冲突；`CONFLICT` 文件保留项目版本并记入 `local_edits`。
`src/lib/vocab.ts` 安装后归项目所有：把领域状态词加进去（statuses），页面不得自己决定状态颜色。
同一领域词在不同实体上含义不同（如任务的 `paused` 与调度的 `PAUSED`）时用前缀键：`schedule.PAUSED`、`run.failed`。
主题偏好已有存储键时：`<ThemeProvider storageKey="…">` 沿用旧键，用户偏好不丢。

依赖变化后（首次安装、`--upgrade` 引入新 block、拉取别人的补丁）：先跑包管理器安装（npm i / pnpm install），
再启动 dev server 打开每个路由确认没有错误浮层——`npm run build` 通过不代表 dev server 能解析所有 import。
