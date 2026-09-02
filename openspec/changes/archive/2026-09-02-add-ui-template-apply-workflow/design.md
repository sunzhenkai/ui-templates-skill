## Context

当前 `skills/ui-template/SKILL.md` 以模板创建/导入为主，明确不面向页面实现；`templates/workbench-shell/` 只有布局规范与平台差异文档，没有消费端实施路径。既有 `example/workbench-shell` 暴露出典型落地问题：路由入口使用 button、面包屑没有真实 link 语义、icon-only 控件可访问名称缺失、自定义 `text-*` 字号 token 可能被 `tailwind-merge` 吞掉、部分路由参数没有可见消费方、响应式外壳与断点规则存在解释歧义。

本仓的模板仍应保持轻量：`templates/` 是可共享规范，不是完整业务 starter。因此 apply 能力应沉淀为 skill 流程和文档 playbook，而不是把示例项目复制成模板代码。

## Goals / Non-Goals

**Goals:**

- 让 `ui-template` 同时服务“做模板”和“用模板落地页面”两类请求。
- 用 phase gates 强制设计系统、IA/layout、代码结构、组件 inventory、页面模式、浏览器验证和 review 的先后关系。
- 将用户提供的 toolchain 组织为默认 adapter，并为工具缺失提供等效回退。
- 为 workbench-shell 提供完整消费 playbook，覆盖全部页面模式与核心组件。
- 把本次排查到的 UI 细节问题转成可复用 review gate。

**Non-Goals:**

- 不把 `templates/workbench-shell/` 改造成 runnable starter。
- 不在本次 change 中直接修复 `example/workbench-shell` 的实现缺陷。
- 不强制所有模板都提供 implementation playbook。
- 不把 skill 绑定到唯一的浏览器工具、UI 组件库或前端框架。
- 不用 implementation 文档复制 `spec.md` 的视觉规则；后者仍是唯一规则入口。

## Decisions

### 1. 在同一 skill 内拆分两个 workflow

`SKILL.md` 将定义两个入口：

```text
Template Authoring
  source(web/repo/image)
    → extract tokens/rules
    → spec.md + meta.yaml + assets
    → update INDEX

Template Apply
  select template
    → confirm scope/platform/stack
    → design direction & tokens
    → IA/layout/routes
    → code structure
    → components
    → pages
    → browser verification
    → design review
    → template feedback
```

选择同一 skill 而不是新增 `ui-template-apply` skill，是因为两类流程共享模板格式、规则冲突处理和 feedback loop。拆分入口会增加维护成本，且消费者无法从一个入口看到完整生命周期。

### 2. Skill 主文件保持薄入口，细节放入 references

新增文档：

```text
skills/ui-template/
├── SKILL.md
└── references/
    ├── source-web.md
    ├── source-repo.md
    ├── source-image.md
    ├── spec-format.md
    ├── apply-workflow.md
    ├── toolchain.md
    └── quality-gates.md
```

- `SKILL.md`：识别请求类型、说明两个 workflow、给出必读 reference。
- `apply-workflow.md`：定义阶段、产物、gate、中断恢复和反馈规则。
- `toolchain.md`：定义默认工具、适用阶段和缺失回退。
- `quality-gates.md`：定义浏览器、可访问性、路由、响应式、computed style 和工程检查。
- `spec-format.md`：扩展 optional `implementation/` 约定，允许模板携带 playbook 和 stack adapter。

`.agents/skills/ui-template-manager/SKILL.md` 只补充本仓约定，应同步把新增 references 纳入“先阅读”的通用 skill 清单，不复制流程细节。

### 3. Apply workflow 采用十个显式阶段

`apply-workflow.md` 将要求以下阶段顺序：

| 阶段 | 核心产物 | Gate |
| --- | --- | --- |
| 0. Intake | 模板名、页面范围、平台、技术栈、约束 | 已选择模板；范围可验收 |
| 1. Art direction & tokens | 风格承诺、配色角色、字体阶梯、密度、主题、边框/阴影 | 所有视觉值有语义归属 |
| 2. IA/layout/routes | route inventory、页面模式、断点矩阵、导航/URL 状态 | 路由语义和响应式行为明确 |
| 3. Code structure | 目录契约、命名、状态/数据/测试边界 | 新文件有唯一归属 |
| 4. Component inventory | primitives、variants、states、a11y、source | 可访问性与状态完整 |
| 5. Representative slice | 一个端到端页面 | Shell、chrome、组件、状态和路由真实联动 |
| 6. Complete page modes | 全部模板页面模式/页面清单 | 覆盖 A–E 模式与业务页面 |
| 7. Global systems | 搜索、创建、确认、Toast、进度、FAB、快捷键帮助 | 浮层、焦点和错误/空态完整 |
| 8. Browser verification | 多视口截图、console、AX、computed style、URL 恢复 | 无未处理错误且模板 token 匹配 |
| 9. Review & feedback | design review 结论、修复项、模板更新判断 | review 通过并完成反馈评估 |

“代码结构”安排在组件组装前，“代表性切片”安排在批量页面扩展前。这样可以避免组件无处安放，也能在只实现一个页面时先验证整条 shell/layout/component/state 链路。

### 4. 工具链写成默认 adapter，而不是硬依赖

`toolchain.md` 将定义五类能力：

| 能力 | 默认工具 | 作用 |
| --- | --- | --- |
| Knowledge | `ui-ux-pro-max` | 检索风格、配色、字体、UX 规则和 stack 参考 |
| Taste | `frontend-design` | 在 CSS 前做出明确美学承诺 |
| Components | shadcn / shadcn MCP | 检索生产级 primitives，减少重复实现 |
| Visual feedback | Playwright MCP、chrome-devtools MCP、browser-use | 打开真实页面，读取截图、console、AX tree 和 computed style |
| Automated review | design review subagent / `/design-review` / checklist | 多视口、WCAG AA、响应式和交互状态审查 |

工具缺失时的回退：

- 没有 `ui-ux-pro-max`：使用模板 tokens、竞品参考和人工 style direction。
- 没有 `frontend-design`：在 implementation brief 中显式回答风格、密度、明暗、情绪和反例。
- 没有 shadcn MCP：先手写 component inventory，再使用本地组件库或受控自研组件。
- 没有 Playwright/chrome-devtools MCP：使用 browser-use 或本地 Playwright 脚本。
- 没有 design review subagent：按 `quality-gates.md` 的 checklist 逐项审查。

### 5. workbench-shell implementation 文档按职责拆分

新增：

```text
templates/workbench-shell/
└── implementation/
    ├── playbook.md
    ├── routes-and-layouts.md
    ├── components.md
    ├── code-structure.md
    ├── stack-react-vite-tailwind-shadcn.md
    └── quality.md
```

职责：

- `playbook.md`：总入口、阶段顺序、每阶段产物和完成定义。
- `routes-and-layouts.md`：route inventory、五种模式 A–E、页面映射、断点矩阵和 URL 参数约定。
- `components.md`：核心组件 inventory、shadcn/custom 来源、状态、尺寸、语义和可访问性。
- `code-structure.md`：目录契约、命名规则、状态/数据/mock/测试边界。
- `stack-react-vite-tailwind-shadcn.md`：默认栈 adapter，说明 Tailwind、shadcn、样式合并工具和前端工程检查。
- `quality.md`：浏览器验收矩阵、AX/computed style 检查、亮暗主题和可交付标准。

其中 `routes-and-layouts.md` 应同时提供两层信息：

1. 模板层：五种通用页面模式及其状态、响应式和验收。
2. 示例映射层：例如收件箱、事件列表、事件看板、服务目录、值班日历、交付分析和设置分别对应哪个模式。示例映射只帮助理解，不把业务实体固化进通用规则。

### 6. 默认代码目录契约

`code-structure.md` 将采用以下通用结构作为 React adapter 默认值：

```text
src/
├── app/                    # 应用入口、providers、router、global error boundary
├── components/
│   ├── layout/             # AppShell、Sidebar、PageHeader、Toolbar、Drawer
│   └── ui/                 # Button、Input、Badge、Tabs、Dialog 等跨域 primitives
├── features/
│   └── <domain>/
│       ├── pages/          # 路由级页面
│       ├── components/     # 只属于该域的 composed components
│       └── hooks/          # 只属于该域的数据/交互 hooks
├── lib/                    # 纯工具、format、token helpers
├── stores/                 # 跨页面客户端状态
├── services/ 或 mocks/     # API client 或 mock API 边界
├── styles/                 # 全局样式、theme layer、token utilities
└── test/                   # 测试 setup 与跨域测试工具
```

规则要点：

- 路由级页面放在 `features/<domain>/pages/`。
- 跨页面复用且不含业务语义的组件放 `components/ui/`。
- Shell 和页面 chrome 放 `components/layout/`。
- 只属于一个业务域的组件不提升到 `components/ui/`。
- API 与 UI 组件之间保留 service/mock 边界。
- 测试与实现同目录存放行为测试，跨域 setup 放 `test/`。

### 7. workbench-shell 的完整页面覆盖

`routes-and-layouts.md` 将要求覆盖：

| 模板模式 | 页面形态 | 关键实现点 |
| --- | --- | --- |
| A 列表/集合 | 收件箱、事件列表、可筛选集合 | 48px 页头、工具栏、滚动列表、筛选排序、分页、批量操作、行选择、URL 状态 |
| B 主从双栏 | 收件箱详情、消息式列表详情、可扩展工单视图 | 320/240–480 列宽、详情 ≥40%、compact 单栏、选中保留 URL、返回恢复 |
| C 文档详情 | 事件/服务/变更详情 | 面包屑祖先 link、896px 主列、320px 属性栏、<768 属性降级、FAB 安全区 |
| D 设置页 | 工作区设置、成员、团队、通知、集成、偏好 | 224px 竖排页签、分组、768px 内容限宽、<768 横向页签、`?tab=` |
| E 聚合网格 | 服务目录、交付分析、仪表卡片 | 响应式网格、卡片层级、统计/图表容器、空态和创建入口 |

全局系统必须单独覆盖：全局搜索、创建事件/条目、确认对话框、Toast、快捷键帮助、路由进度、错误横幅和 FAB。

### 8. 组件 inventory 采用“模板规则 + stack 来源”双列

`components.md` 每个条目将包含：

```text
名称 / 用途
semantic element
variants & sizes
states: default / hover / focus-visible / active / disabled / loading / selected / error
a11y: name、role、keyboard、focus return、color independence
source: shadcn / custom / stack adapter
workbench usage
```

必须覆盖的最低清单：

- Shell 与导航：Sidebar、Workspace switcher、Nav link、Drawer、Collapse control、Resize control。
- 页面 chrome：PageHeader、Breadcrumb、Toolbar、FAB、progress indicator。
- 表单与选择：Button、Input、Textarea、Select、Combobox、Checkbox、Switch、Date picker。
- 数据展示：Badge、Table、Pagination、Kanban column/card、Service card、Calendar card、Metric card、Trend/chart container、Avatar、Skeleton、Empty state。
- 浮层与反馈：Dialog、Confirm dialog、Search palette、Toast、Menu、Tooltip、Shortcut help。

对 Tailwind 项目额外要求：自定义字号/间距类必须验证在 `tailwind-merge` 或等价 class merger 下不会被颜色类覆盖。若无法配置 merge 规则，token utility 应避免与 Tailwind 冲突命名空间同名。

### 9. 修正 workbench-shell 的响应式歧义

`templates/workbench-shell/spec.md` 第 13 节目前同时表达“按断点降级”和“平台路径决定外壳”，但 web 路径在 <768 时是否抽屉化存在解释空间。apply 修改时应把响应式矩阵改为无歧义规则：

- web platform + ≥1024：常驻浮岛侧栏。
- web platform + 768–1023：按模板选择固定为“折叠 icon rail”或“页头触发器 + 覆盖抽屉”，不允许两种解释并存。
- web platform + <768：同样选择并显式声明一种行为。
- mobile platform：覆盖抽屉是外壳特征，路由后自动关闭。
- desktop platform：贴缘侧栏与顶行 chrome 不因窗口宽度改变。

推荐把 web 路径在 compact 与 mobile 宽度统一为“页头触发器 + 覆盖抽屉”，因为这与现有 workbench 示例和页面模式降级最一致；desktop 平台路径仍保持贴缘侧栏，不受浏览器宽度影响。

### 10. Quality gates 分为项目验收和模板回归

`quality-gates.md` 与 workbench `implementation/quality.md` 将包含同一套最低检查：

1. 路由入口使用 `<a href>`，`aria-current="page"` 挂在当前 link。
2. AX tree 中 icon-only 控件、tabs、checkbox、dialog 均有可读名称。
3. 不存在 interactive element 嵌套。
4. 弹层焦点进入、Esc 关闭、焦点返回。
5. 100svh 根容器不滚动，滚动只发生在内容列/列表/看板列。
6. 文档流无阴影；阴影只出现在浮层。
7. 桌面、compact、mobile 三个视口无意外横向滚动。
8. loading、empty、error、unauthorized、not found 状态可见。
9. URL 刷新、前进、后退和无效参数行为明确。
10. computed style 匹配色值、字号、行高、密度、圆角、边框和阴影规则。
11. 状态不靠颜色单独表达。
12. 控制台无未处理错误。
13. 构建、静态检查和已有测试通过。
14. 双主题下 token 与对比度满足 WCAG AA。

## Risks / Trade-offs

- [Skill 描述变宽后可能被误触发于任意 UI 实现] → `SKILL.md` 明确 Template Apply 的前置条件：必须选择或创建本仓模板；没有模板时不直接生成页面。
- [Implementation docs 与 spec.md 重复导致漂移] → implementation 文档只写顺序、映射和验收，不复制规则；冲突时以 `spec.md` 为准。
- [工具名称或 MCP 可用性变化] → `toolchain.md` 按能力分类，并给每个能力定义非工具化验收目标。
- [完整 playbook 文档量偏大] → 拆成六个职责单一文件，主 spec 不复制实施细节。
- [默认 React/Tailwind adapter 可能被误解为模板唯一栈] → stack adapter 单独存放，主 spec 与 playbook 入口保持技术栈无关。
- [浏览器验证成本高] → 先验证代表性页面，再对剩余页面运行状态和响应式矩阵；截图与 checklist 可作为轻量证据。

## Migration Plan

1. 更新通用 skill 与 references，使新请求能进入 Template Apply。
2. 扩展模板格式说明，允许 optional implementation playbook。
3. 新增 workbench-shell implementation 文档并链接到模板入口。
4. 修正 workbench-shell 响应式矩阵歧义。
5. 更新本仓 manager skill 和 `AGENTS.md` 中的结构说明。
6. 校验 OpenSpec artifacts 和所有文档链接。

回滚策略：删除新增 references 与 `implementation/` 文件，恢复 `SKILL.md`、`spec-format.md`、manager、`spec.md`、`meta.yaml`、`AGENTS.md` 中被修改的段落；该 change 不引入运行时依赖或 API 变更。

## Open Questions

无。
