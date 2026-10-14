---
name: ui-template-apply
description: 用 ui-template 风格包 + shadcn/ui 组件库 + 通用 blocks 和 patterns 实现或重构 React 前端页面（列表、详情、表单、设置、对话、日志等）。在新建前端、整体改版、或按统一规范修页面时使用。
---

# ui-template-apply

把一个风格包（`catalog/<name>/`：theme.css + 默认决策）和本 skill 自带的通用库落到 React 项目里，
让页面在**写的时候**就符合规范，而不是靠事后检查补救。

## 组成

| 目录 | 内容 |
|---|---|
| `catalog/` | 风格包：`meta.yaml`（适用范围、密度、默认决策）+ `theme.css`（shadcn 变量 + 扩展） |
| `library/shadcn/` | shadcn radix-nova 组件，原样 vendored（版本见 `library/SOURCE.md`） |
| `library/blocks/` | 通用组合件：AppShell、PageHeader、DataTable、StateBoundary、format、confirm、notify、Markdown、LogView… |
| `library/lint/` | ESLint 规则：把可机检的规范在编辑器里就报出来 |
| `reference/` | 完成态原型页面（collection / detail / form / settings / list-detail / empty）：写页面从这里复制 |
| `patterns/` | 每类页面的决策与原型之外的规则、自查清单（先看 `index.md`） |
| `steps/` | 执行步骤 01–07 |
| `scripts/` | `install_registry.py`、`validate_package.py`、`check_rendered.py`、`review_visual.py` |

## 流程

1. `steps/01-decide.md` — 选包、列页面→pattern、写 `ui-decisions.yaml`
2. `steps/02-install.md` — 安装库与主题（离线、确定性、带 lock）
3. `steps/03-shell.md` — 应用骨架
4. `steps/04-pages.md` — 逐页从 reference 原型复制，按 pattern 补齐
5. `steps/05-verify.md` — tsc、eslint、validate project、check_rendered
6. `steps/06-iterate.md` — 反馈分诊、升级
7. `steps/07-review.md` — 与参考截图逐页对比，零未结问题才交付（每次交付前都做）

## 原则

- **几何归 surface**：页面只组合 surfaces，不写边框/圆角/间距类（lint 拦截）；圆角两级、分割线由容器画。
- **从原型开始**：复制 reference 页面，不从规则重新排版。
- **组合优先**：先找 block，再找 shadcn 组件，最后才写新组件；不 fork shadcn 文件。
- **语义而非数值**：列写 `kind/priority`，颜色写角色，状态写词表；具体数值只在 theme.css。
- **单一滚动模型**：html/body 与画布（`frame`）永不滚动，画布边框、外边距、圆角始终可见；只有表面声明的
  `data-scroll-region` 滚动——文档页 = 固定 PageHeader 下一个 main 区；设置 = 导航 + 内容两区；主从 = 列表 + 详情。
  页面不写高度、不加 overflow 容器；区域是 `relative`，绝对定位后代（Radix 隐藏表单控件等）只撑区域不撑画布（check_rendered R15 对每个路由注入 3000px 压测）。
- **默认即决定**：未被需求点名的决策用默认值，不逐条问用户。
- **修在共享层**：同类问题出现两次，就改 block / pattern / theme，而不是第三次逐页修补。

项目里不要复制本 skill 的 pattern 文档；`ui-decisions.yaml` + lock 就是全部项目侧状态。
