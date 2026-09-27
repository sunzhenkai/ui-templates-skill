# ui-template-design 整体方案

> 状态：规划草案（2026-09-07）。**不是**发布能力证据或现行治理权威。现行闭环仍以 [`governance/FUNCTIONAL-LOOP.md`](../governance/FUNCTIONAL-LOOP.md) 与 `skills/ui-template-design/` 生产正文为准。
>
> 本文要回答的问题：如何把「Agent 直接生成页面」改成「Agent 在可执行 Design System 约束下组装页面」，并把这套体制做成 **可独立安装、可独立完成** 的 skill。
>
> `docs/**` 是治理排除项：本文不参与 bundle / mirror / 发布门禁。

---

## 0. 一句话

`ui-template-design` 不帮 Agent「把页面做漂亮」，而是在消费项目里建立并冻结一套 **分层、可执行、可重生、可视觉回归** 的前端体制：Token → Primitive → Pattern → Page Type。之后写页面变成组装，而不是发明。

它必须能在 **没有模板、没有 Author、没有 Apply** 的项目里单独跑完。模板只是可选的视觉输入；Apply 只是可选的页面消费方。

---

## 1. 真正要解决的问题

AI Coding 做前端最典型的失败不是「第一个页面不好看」，而是 **不会长期维护一个视觉系统**。

```text
常见失控
────────────────────────────────────────
Agent 写 Tasks     padding: 24px   rounded-xl   text-gray-500   bg-white
Agent 写 Apps      padding: 20px   rounded-lg   text-zinc-500   bg-gray-50
Agent 写 Settings  padding: 16px   rounded-2xl  text-slate-400  bg-muted/50
────────────────────────────────────────
每个页面都“能用”，产品不再是同一个产品。
```

根因有四层，不是缺一个更长的 prompt：

| 层 | 失败模式 | 只加 prompt 为什么不够 |
| --- | --- | --- |
| 语义 | `text-gray-500` / `bg-red-500` 当设计 | 模型仍会「这次用一下」 |
| 组件 | 每个页面私造 Button / Toolbar | 没有唯一入口，复制成本为零 |
| 模式 | 每个 List 自己决定标题、筛选、空状态 | Agent 重复的是页面结构，不是 Button |
| 反馈 | 编译通过即完成 | 视觉漂移没有证据回路 |

所以目标不是「生成一套好看的脚手架」，而是：

> 把前端从 **Agent 直接生成页面** 变成 **Agent 在 Design System 约束下组装页面**。

约束必须同时具备：

1. **分层**：后面的层不得重新决定前面的层。
2. **可执行**：导入路径、lint、token 扫描、类型，比 `DESIGN.md` 更硬。
3. **可验收**：Gallery + 截图回归，不是肉眼「看起来齐」。
4. **可重生**：漂移回写 Token / Primitive / Pattern，再重生，不在业务页上打补丁。
5. **可独立**：单独安装本 skill 就能建立并维护这套体制。

---

## 2. 核心命题

### 2.1 可变层是 Pattern，不是 Button

多数 Design System 工程把时间花在 Primitive（Button / Input / Dialog）上。Agent 真正反复发明的是：

```text
PageHeader / Toolbar / FilterBar / List / Detail
EmptyState / ErrorState / LoadingState / Pagination / MasterDetail
```

因此本 skill 的主产物是 **Page Pattern + Page Type**。Primitive 是底座，不是完成态。

页面任务从：

```text
把 Tasks 设计得漂亮一点
```

变成：

```text
Tasks 属于 ListPage。用已有 Pattern 组装，禁止发明新的页头、间距和空状态。
```

### 2.2 设计语义 ≠ 颜色实现

```text
red    ≠  error
green  ≠  success
gray-500 ≠ muted 文本
```

组件和页面只允许使用语义 token（`foreground` / `muted-foreground` / `destructive` / `success` …）。任意 Tailwind 调色板、任意 hex、任意 `p-5` / `rounded-xl` 视为违规，除非写入 mapping 并提升为 token。

### 2.3 文档是参考，规则要变成门禁

`DESIGN.md` 对 Agent 是软参考，容易被忽略。本 skill 必须同时落下：

- 给人读的 Constitution
- 给 Agent 强制加载的规则块（项目 `AGENTS.md` / Cursor rules）
- 给机器跑的 lint / import / token / 截图检查

违反时 **typecheck 或 lint 失败**，不靠自觉。

### 2.4 生成物不是修复面

与本仓库既有不变量一致：视觉差、组合差、回归失败，回写 **Token / Primitive / Pattern / 本 skill**，丢弃或重生受影响切片。禁止在单个业务页上发明新视觉。Golden Page 是只读基线，不是可编辑范例。

---

## 3. 产品定位：独立 skill

### 3.1 安装与运行独立

```text
npx skills add sunzhenkai/ui-templates-skill -s ui-template-design
```

单独可装、单独可跑、单独可标完成。不要求 `ui-template-author`、`ui-template-apply`、项目 `templates/` 或 catalog。

现有模板产品保持成对安装，互不绑架：

```text
模板产品（不变）
npx skills add sunzhenkai/ui-templates-skill \
  -s ui-template-author -s ui-template-apply

设计系统产品（新增，可选）
npx skills add sunzhenkai/ui-templates-skill \
  -s ui-template-design
```

### 3.2 三种输入，一种完成态

| 输入 | 行为 |
| --- | --- |
| 只有项目上下文 / 现有前端 | 从 inventory 建立或抽取 Design System |
| 另有 published 模板 | 把模板 token/rule 映射进本项目 token，**不**把模板当实现源码 |
| 用户只要框架、不要迁页面 | 停在 Gallery + 一个证明切片，不算失败 |

完成态永远是消费项目里的 **冻结 Design System**，不是一份 YAML 备忘录，也不是一套业务页面。

### 3.3 明确不做

- 不创建、不 Index、不发布 schema v2 模板（那是 Author）。
- 不实现产品功能页作为主交付（那是 Apply 或后续组装任务）。允许 **一个 Golden / 证明切片** 用来锁基线。
- 不改 API、数据模型、权限、路由语义、业务状态机——重构模式默认冻结业务。
- 不把任何技术栈写成 skill 默认值。greenfield 必须先确认闭集层。
- 不把 shadcn / Storybook / Playwright 写成唯一实现；它们是常见适配器，不是契约本身。

---

## 4. 体制总图

Agent 允许工作的方向只有从上到下。禁止从业务页回写私有视觉。

```text
                 ┌──────────────────────────┐
                 │  Product / UX Model      │  用户、任务、密度、页面类型归属
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  Design Tokens           │  颜色/间距/字体/半径/层级/运动
                 │  语义唯一，精确值唯一     │
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  UI Primitives           │  Button Input Badge Dialog …
                 │  只消费 token            │
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  Patterns                │  PageHeader ListPage MasterDetail
                 │  Empty/Error/Loading     │  绑定数据状态机、断点、运动白名单
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  Page Types（闭集）       │  List / Detail / Master-Detail /
                 │                          │  Dashboard / Form / Settings / Wizard
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  Product Pages           │  只组装。非本 skill 主交付
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  Gallery + Visual Loop   │  状态橱窗、截图基线、自愈 ≤3 次
                 └──────────────────────────┘
```

禁止的工作方式：

```text
Agent → 写一个页面 → 再写一个页面 → 再写一个页面
```

---

## 5. 各层规格

### 5.1 Product / UX Model

在写 token 之前先冻结产品事实，否则 Design System 会变成「通用后台皮肤」。

必须记录：

- 产品类型与主用户任务（例如：运维控制台、内容工具、设置中心）
- 密度：`compact | comfortable | mixed(按 page type)`
- 信息优先级：首屏要完成的一件事
- 每个现有/规划路由到 **唯一 Page Type** 的归属
- 非目标：装饰风格、一次性营销页、本次不迁的区域

没有 UX Model 不得进入 Token Freeze。

### 5.2 Design Tokens

Token 是精确值的唯一载体。组件、Pattern、页面都不得出现未映射的任意值。

建议消费项目落盘（路径可按已确认栈调整，语义不变）：

```text
<output-root>/design-system/
├── tokens.css          # 或 tokens.ts / tokens.yaml，按栈二选一为主、其余派生
├── colors.md           # 语义角色说明，不含第二份精确值
├── typography.md
├── spacing.md
├── elevation.md
├── motion.md
└── icons.md
```

语义色最小闭集（可扩展，不可用调色板名代替）：

```text
background / foreground
muted / muted-foreground
border / ring
primary / primary-foreground
secondary / secondary-foreground
accent / accent-foreground
destructive / destructive-foreground
success / warning / info
```

硬禁：

```text
className="text-gray-500"
className="text-zinc-400"
className="bg-red-500"
className="p-5"          # 除非 p-5 已是 spacing token 的合法别名
style={{ color: '#xxx' }}
```

合法：

```text
text-muted-foreground
bg-destructive
gap-space-4              # 名称随栈，但必须指向 token
```

Token 变更是 **系统级变更**：改 token 必须重跑 Gallery 回归，不得只改一个页面「对齐一下」。

若本会话发现 published 模板：把模板 `tokens.yaml` 映射为项目 token，记录 rule ID 与偏离理由。没有模板时，从现有代码 vocabulary 抽取，经用户确认后 freeze。**项目 token 默认不是 published 模板**，不得伪装 schema v2 发布。

### 5.3 UI Primitives

Primitive 是最小可复用控件，只消费 token，不包含业务字段。

```text
<output-root>/components/ui/          # primitives
    button, input, select, checkbox, badge,
    dialog, dropdown-menu, tooltip, tabs, card, …
```

原则：

- 可以 **领养** 已有组件库源码（例如 shadcn 的「源码进仓」模型），但必须立刻改成只走本项目 token。
- 停在「安装了一套 shadcn」不算完成。
- 每个 Primitive 必须列出 variants / sizes / states（含 disabled、loading、focus-visible）。
- 禁止业务页直接使用底层 HTML 控件冒充 Primitive（例如页面里手写 `<button className="...">`）。

Primitive 的验收在 Gallery，不在某个业务页「看起来对」。

### 5.4 Patterns（本 skill 的关键层）

Pattern 是页面级可复用结构。Agent 组装页面时 **只允许选 Pattern，不允许重排壳**。

最小 Pattern 集合（可按 inventory 增，不可按页面私造）：

```text
<output-root>/components/patterns/
    Page
    PageHeader
    PageToolbar
    PageContent
    FilterBar
    DataTable          # 或 List，按产品
    Pagination
    EmptyState
    ErrorState
    LoadingState       # 含骨架，不是 spinner 满屏
    MasterDetail
    DetailPanel
    FormSection
```

每个 Pattern 必须声明：

| 字段 | 含义 |
| --- | --- |
| slots | 可插入位置（title / actions / filters / content …） |
| 允许的 Primitive | 白名单 |
| 禁止组合 | 例如 FilterBar 内不得再嵌 PageHeader |
| 数据状态 | 见 §6.2，不是可选装饰 |
| 断点行为 | 见 §6.4，不得在 Pattern 外自定义 |
| 运动 | 只引用 motion token |
| 对应 Page Type | 哪些页面类型必须用它 |

示例（结构契约，不是强制 React 实现）：

```text
MasterDetail
┌───────────────┬─────────────────────────────┐
│ Master        │ Detail                      │
│ width = token │ flex: 1                     │
│ border-right  │                             │
│ = border      │                             │
│               │                             │
│ List slot     │ Detail slot                 │
└───────────────┴─────────────────────────────┘

< lg  : Master 全屏；Detail 用已登记的 Drawer/Slide-over Pattern
>= lg : 并排。宽度、边框、间距全部来自 token，Agent 不得改数字
```

以后 Agent 不再决定「左边多宽、header 怎么排」。

### 5.5 Page Types（闭集）

默认闭集。增补必须改 Constitution 并回归所有已登记页面，禁止为单个路由发明第 8 种。

```text
1. List Page
2. Detail Page
3. Master-Detail Page
4. Dashboard
5. Form Page
6. Settings Page
7. Wizard
```

每个产品路由映射到恰好一个类型。例如：

```text
/tasks            → List
/tasks/:id        → Detail 或 Master-Detail（产品二选一，全局一致）
/settings         → Settings
/onboarding       → Wizard
```

Inventory 若发现同一路由既像 List 又像 Dashboard，记为 unresolved，先让用户收窄，不得静默挑一个。

### 5.6 Product Pages 的边界

业务页只做三件事：选 Page Type、填 Pattern slots、接入已有数据/权限。

```text
<ListPage>
  <PageHeader title="…" actions={…} />
  <PageToolbar>…</PageToolbar>
  <PageContent>
    <EntityList />
  </PageContent>
</ListPage>
```

业务页 **不得**：

- 定义新的间距 / 圆角 / 颜色
- 复制 PageHeader
- 绕过 ListPage 自己处理 loading/empty/error（§6.2）
- 为「这个列表比较特殊」改 Pattern 的私有 fork

特殊需求的合法路径：先升级 Pattern，再回填所有已迁移页。见 §6.7。

本 skill 独立完成时，产品页不是必交付。最多迁 **一个 Golden Page** 作为基线锁。

### 5.7 Component Gallery

没有橱窗，Agent 只能猜。必须有一个可运行的 Gallery 面（路由、Storybook 或等价；由已确认栈决定，不得两者都不做）。

最低展示：

```text
Primitives × 全部声明状态
  Button: default / hover / focus / disabled / loading / destructive
  Badge: 各语义色
  Input: default / error / disabled

Patterns × 全部数据状态
  ListPage: loading / empty / error / success
  MasterDetail: 宽屏并排 / 窄屏 Drawer

Tokens
  色板、间距尺、字体阶梯、运动示例
```

Gallery 是视觉回归的主靶面。业务页回归是第二靶，且只覆盖已迁移页。

### 5.8 Visual feedback loop

编译通过 ≠ 完成。独立 skill 的质量闭环：

```text
实现 / 迁移
    ▼
typecheck + lint + token/import 扫描
    ▼
启动 Gallery 或 Golden Page
    ▼
真实浏览器截图
    ▼
与 baseline 比 diff
    ▼
失败 → 自愈循环（§6.6）
    ▼
通过 → 写入 evidence + freeze digest
```

没有可用浏览器能力时停止并请求可运行方式，不得用静态 DOM 或假截图代替。

---

## 6. 可执行约束（防止 Agent 钻空子）

上一层是骨架。这一层是水泥缝。缺任一条，体制会退回「有文档的自由发挥」。

### 6.1 强制规则块 + 导入约束

除 Constitution 散文外，必须写入项目里 Agent 默认会读的规则（`AGENTS.md` 片段或 `.cursor/rules`）。内容是路径与禁令，不是审美短文。

```text
Path Aliases (Mandatory)

- primitives  →  <ui-root>/*           例：@/components/ui/button
- patterns    →  <pattern-root>/*      例：@/components/patterns/ListPage
- domain      →  <domain-root>/*       例：@/components/domain/TaskCard

Import Rules

- 业务页不得 from domain 引入 Button / Input / Dialog
- 页面容器不得用裸 div 冒充 Page / ListPage / MasterDetail
- 禁止 inline style 与未映射 class（raw palette、任意 spacing）
- 禁止新建与现有 Pattern 同职责的组件
```

配套机器检查（按栈选可用的，但至少一种硬失败）：

- ESLint / biome：禁 raw palette、禁未允许的 `@/` 跨层 import
- TypeScript：Pattern 的 Data-State props 必填
- 自定义扫描：diff 中新增 `text-gray-*` / `#rrggbb` / `p-\d+` 即 fail

Constitution 被违反而检查全绿，视为本 skill 失败，不是「Agent 没读文档」。

### 6.2 Data-State Binding

Loading / Empty / Error 不是独立展示组件那么简单。Agent 最常见的漏洞是 **只在有数据时写页面**。

Pattern 必须绑定数据状态机，而不是让业务页自己 `useState` 拼四种 UI。

```text
ListPage 内部必须覆盖：

idle      → LoadingState（骨架，保持布局）
loading   → LoadingState
success   → 内容 slot
empty     → EmptyState（下一步动作）
error     → ErrorState（重试 + 可读原因）
```

约束：

- 业务页传入数据查询结果（或等价 props），不得在页面里分叉四套布局。
- `animate-spin` / `animate-pulse` 只允许出现在 LoadingState / 骨架内部。
- Gallery 必须为每个 Pattern 展示上述状态，缺一不可标 freeze。

### 6.3 Motion 白名单

未列即禁止。Agent 不得发明 `transition-all`、`animate-bounce`、自定义 `@keyframes`。

```text
允许（名称随栈，语义固定）
- 颜色过渡     hover / focus
- 透明度过渡   fade
- 标准时长     duration-sm / duration-md（token）
- 进出场       仅 Modal / Drawer / Toast 已登记 Pattern

禁止
- 任意 transition-all
- 任意 bounce / ping
- Pattern 外的 transform 动画
- 业务页自定义 keyframes
```

预置 utility 写在 token / 全局样式里，Agent 只引用 class 或 token 名。

### 6.4 响应式：降级策略，不是每个页面自己适配

断点只允许来自 token。Pattern 外禁止 `md:flex lg:grid xl:gap-8` 式自由发挥。

页面布局只许使用已登记预设，例如：

```text
Page            单栏，页内滚动归属已声明
TwoColumn       sidebar + main（宽度来自 token）
MasterDetail    <lg：Master 全屏 + Detail Drawer
                >=lg：Master 固定宽 + Detail flex:1
```

Agent 不允许为单个路由改断点值。新产品形态先加预设，再给页面用。

### 6.5 Legacy Token Mapping（重构模式的 Phase 1.5）

Existing 前端禁止「先定义新 token，再靠 Agent 手工改 23 个页面」。在 Inventory 与新 token freeze 之间，必须有一张 **旧 → 新替换字典**，并尽量用脚本批量替换。

```text
Old (forbidden)          New (token)
text-gray-500            text-muted-foreground
text-gray-900            text-foreground
bg-white                 bg-background
bg-gray-50               bg-muted
rounded-lg               radius-md
rounded-xl               radius-lg
p-6                      space-6 / p-space-6
```

规则：

- mapping 进仓库，作为机器可读表，不是聊天记录。
- 先跑 codemod / 扫描替换，再人工看 Gallery。
- 未入表的旧值保持 fail closed：要么补 mapping，要么明确 excluded。
- 这一步目标是去掉 60% 重复劳动，不是一次视觉完美。

### 6.6 Visual 自愈循环（有上限）

截图失败后禁止无限「再试一次」。

```text
Visual Regression Loop（最多 3 轮）

1. 跑 Gallery / Golden Page 截图
2. diff > 阈值（默认 0.5%，可项目覆盖）：
   - 读 diff / heatmap
   - 定位 padding / margin / color / font-size / radius
   - 映射回 token 或 Pattern，不映射回业务页魔法数
   - 打补丁后重跑
3. 3 轮仍失败：停止，请求人类做 token/pattern 覆盖
   不得为过线而放宽 baseline 或改业务页私有样式
```

证据必须绑定：source identity、build identity、freeze digest、viewport、theme。旧截图文件存在但身份不匹配，不算通过。

### 6.7 Golden Page 反向传播

选一个已迁移（或新建证明用）的页面作为 Golden Page。它的截图基线锁进 git。

```text
Golden Page = 只读参考
Pattern     = 唯一可变层
```

迁移其它页面时：

- 不允许改 Golden Page 的样式来「迁就」新页
- 若发现 Pattern 不够用：先升级 Pattern，再回填 **所有已迁移页**（含 Golden Page），并更新 Golden baseline（这是系统变更，需用户确认）
- 禁止「新页 fork 一份 ListPage2」

---

## 7. 两种运行模式

### 7.1 Greenfield（从零建立）

输出根为空、只有占位或用户明确从零搭框架。

```text
确认栈闭集层
    → UX Model
    → Token Freeze（用户确认）
    → Primitives
    → Patterns + Page Types
    → 可执行规则块写入项目
    → Gallery
    → 一个证明切片（可选但强烈建议）
    → Visual loop
    → Freeze
```

未确认 language / UI framework / bundler / routing / styling / state / data / 验证 / package manager / repo shape 之前，不得写应用源码或依赖清单。兄弟项目、功能规格里的技术提及只是候选。

### 7.2 Existing（重构现有前端）

这是参考方案的主场景，也是独立 skill 的高价值路径。

**Phase 0 — 冻结业务**

```text
禁止  改 API / 数据模型 / 权限 / 路由语义 / 业务状态 / 交互语义
允许  layout / typography / spacing / components / visual hierarchy
```

一次任务不得同时做 architecture + UX + visual + business。复杂度爆炸时先停。

**Phase 1 — Inventory**

扫描 pages / components / layouts / styles / routes，产出：

- 路由 → 建议 Page Type
- 重复组件与重复视觉词汇
- 不一致 Pattern
- unresolved 项（必须用户收窄）

**Phase 1.5 — Legacy mapping**

从代码抽取 `gray-*` / hex / rounded-* / 任意 spacing，生成旧→新表，跑批量替换。

**Phase 2 — Token Freeze**

定义语义 token，用户确认。之后禁止再引入未映射值。

**Phase 3 — Primitives 领养或收敛**

把已有按钮/输入收敛到 `components/ui`，删除业务页私造副本。

**Phase 4 — Patterns**

按 inventory 频率优先：先 List / Detail / Master-Detail / Empty-Error-Loading，再 Dashboard / Wizard。

**Phase 5 — 规则块 + 扫描落地**

**Phase 6 — Gallery + Golden Page 基线**

**Phase 7 — 按页迁移（可另开任务）**

本 skill 可将「建立体制 + Golden Page」标完成；其余页可以同一 skill 继续，也可以交给 Apply（若已装且有模板）。

不要一次性重写整个前端。

---

## 8. Skill 工作流（Agent 可执行）

阶段不可跳过。完成看产物与证据，不看「已经写了页面」。

```text
0  Intake
   任务类 bootstrap | refactor | iterate（可观察信号，禁止口吻猜测）
   站点形态 greenfield | existing
   输出根、变更集合、授权、是否迁 Golden Page
   探测模板 / Apply：有则记录，无则忽略
   iterate 不重开完整 0–9

1  Site & Stack
   architecture-site 等价判定
   greenfield 等待闭集层确认
   existing 只记录 observed_stack，禁止换栈

2  UX Model & Inventory
   用户任务、密度、路由→Page Type
   existing 必做重复件/重复样式清单

3  Token Freeze
   精确值唯一载体
   existing 含 mapping 表
   有模板则映射，无模板则确认项目级 token

4  Primitive Inventory
   领养 / 包装 / 自建的理由
   状态表闭合

5  Pattern System
   组合图、禁止组合、Data-State、断点、运动

6  Constitution & Executable Rules
   DESIGN/ARCHITECTURE/COMPONENTS/PATTERNS
   强制规则块 + lint/import/token 扫描

7  Gallery
   可运行橱窗，覆盖 Primitive 状态与 Pattern 数据态

8  Visual Loop
   浏览器截图、baseline、自愈 ≤3
   可选 Golden Page

9  Freeze & Report
   digest、身份、完成声明
   不要求全站业务页迁完
   不要求 Apply Phase 8
```

恢复：从最早失效阶段重开。token 变 → 从 3；pattern 变 → 从 5 且 Gallery 证据过期；build identity 变 → 从 8。

---

## 9. 消费项目产物

建议两棵树：skill 状态与设计系统本体。路径可配置，语义固定。

```text
<project-root>/
├── .ui-template-design/                 # skill 状态（可删不影响已生成系统）
│   ├── checkpoint.yaml
│   ├── 00-intake.md
│   ├── 00-architecture.yaml
│   ├── 01-ux-model.md
│   ├── 01-inventory.yaml
│   ├── 02-tokens-freeze.yaml            # 指向精确值文件的身份，不复制第二份值
│   ├── 02-legacy-mapping.yaml
│   ├── 03-primitives.yaml
│   ├── 04-patterns.yaml
│   ├── 05-rules-receipt.md
│   ├── 07-gallery.yaml
│   ├── 08-verification.json
│   ├── evidence/
│   ├── handoff.yaml                     # 可选适配器：template digest / apply 提示
│   └── freeze.yaml                      # schema + digest + status
│
└── <output-root>/                       # 设计系统本体（长期存在）
    ├── design-system/                   # tokens + constitution 散文
    │   ├── CONSTITUTION.md
    │   ├── tokens.css
    │   └── …
    ├── components/
    │   ├── ui/                          # primitives
    │   ├── patterns/
    │   └── domain/                      # 业务件；本 skill 只规定边界，少写
    ├── <gallery>                        # /dev/design-system 或 Storybook
    └── <rules>                          # AGENTS.md 片段 / .cursor/rules
```

`handoff.yaml` 供可选适配，缺它不影响完成：

```yaml
schema: design-freeze/v1
status: frozen
digest: sha256-…
mode: greenfield | existing
template: null          # 或 { name, version, digest }
kit:
  primitives: true
  patterns: true
  gallery: true
golden_page: null       # 或 route + baseline identity
```

---

## 10. Skill 自身结构（本仓库）

生产正文只放 `skills/ui-template-design/`，不把消费项目的 Design System 放进本仓 catalog。

```text
skills/ui-template-design/
├── SKILL.md                    # 路由、不变量、阶段、独立完成定义
├── references/
│   ├── layers.md               # Token/Primitive/Pattern/PageType
│   ├── constitution-template.md
│   ├── executable-rules.md     # import / token / motion / breakpoint
│   ├── data-state.md
│   ├── task-classes.md         # bootstrap / refactor / iterate
│   ├── iterate.md
│   ├── inventory.md            # refactor 扫描；iterate 禁止完整加载
│   ├── legacy-mapping.md
│   ├── gallery.md
│   ├── visual-loop.md          # 自愈上限、证据身份
│   ├── greenfield.md
│   ├── existing-refactor.md
│   └── adapters.md             # 可选：模板输入、Apply 移交
├── evals/                      # 含「仅安装本 skill、无模板」夹具
└── runtime/                    # 可选：token 扫描、mapping 校验、freeze digest
```

触发（description 必须写清独立可用，避免「没有模板就不触发」）：

- 设计 / 建立 / 重构前端 Design System
- 统一 token、Primitive、页面 Pattern
- 防止 AI 写页面时视觉漂移
- 无模板、无 Apply 也可

不触发：做成可发布模板、按已有模板实现全站业务页、纯后端。

---

## 11. 与 Author / Apply 的关系

软连接，fail-open。

```text
                    独立完成
项目 ──► ui-template-design ──► freeze + DS 本体 + Gallery
                    │
        可选探测    │    可选移交
          ▼         ▼         ▼
     published    用户要     用户要把视觉
     模板约束     写业务页    语言做成模板
          │         │         │
          │      已装 Apply   已装 Author
          │      → 移交      → 移交
          │      未装 → 结束  未装 → 结束
```

| 方向 | 规则 |
| --- | --- |
| Design → 模板 | resolve 成功则映射 token/rule；失败继续 |
| Apply → freeze | 若存在且 digest 匹配，Apply 不得再发明壳/原语/页类型 |
| Design → Author | 仅当用户要求发布可复用模板 |
| 本 skill 运行时 | **禁止**硬依赖 Author runtime、catalog、Apply checkpoint |

Author/Apply 继续成对分发。Design 是第三条 public skill，**不**加入「必须配套安装」名单。

本仓库 `ui-template-manager` 增加路由：建立/重构设计系统 → Design；抽模板 → Author；按模板写页面 → Apply。

---

## 12. 完成定义

独立会话可以声明完成，当且仅当：

1. UX Model 与 Page Type 归属无 unresolved
2. Token freeze 已确认，精确值只有一处
3. Primitive 状态表闭合，且只消费 token
4. 声明的 Pattern 含 Data-State、断点、运动白名单、禁止组合
5. 可执行规则块已写入项目，扫描/lint 在本次 diff 上通过
6. Gallery 可运行，必需状态有 current-build 截图
7. Visual loop 通过或 3 次自愈后已升级人类决策
8. `freeze.yaml` 写出 digest；Report 不声称全站页面已迁完
9. 未装 Author/Apply、未使用模板，不构成失败

不得称为完成：

- 只有 Markdown、没有 token 与 Primitive
- 只有 shadcn 初始化、没有 Pattern 与规则扫描
- 只改了一个业务页、系统层未 freeze
- 截图与当前 build identity 对不上

---

## 13. 非目标（第一版）

- 把消费项目 Design System 收进官方 catalog
- 自动挑选默认技术栈
- 一次性重写全部业务页
- 用本 skill 替代 Author 抽取或 Apply Phase 0–9
- 规定必须用 React / Tailwind / shadcn / Storybook（仅作常见适配器）
- 在模板里放置 `implementation/` 或 stack adapter

---

## 14. 分发与治理影响（落地时）

现行治理假定公开产品只有两个必须配套的 skill。引入本 skill 需要单独 change，至少：

- `skills/ui-template-design/**` 生产正文
- `governance/scope.yaml`、`distribution-v1.yaml` 增加 **可单独安装** 项
- README / AGENTS.md / FUNCTIONAL-LOOP：模板对仍成对；Design 单独列出
- `make mirror-write` / `mirror-check` allowlist
- eval：无 Author/Apply/模板夹具必须绿
- 不修改 `docs/**` 作为发布证据；本文保持草案直到 OpenSpec archive

破坏性：对旧用户无强制。未安装 Design 的项目，Author/Apply 行为不变。

---

## 15. 建议的落地切片

不要一次把 Apply Phase 0–4 搬空，也不要先写业务样例站。

| 切片 | 内容 |
| --- | --- |
| S0 | 本文共识；开 OpenSpec change |
| S1 | SKILL.md + 分层/独立完成/两种模式 references |
| S2 | freeze schema、checkpoint、无依赖 eval |
| S3 | Constitution 模板 + 可执行规则块 + token/import 扫描思路 |
| S4 | Pattern / Data-State / 断点 / 运动 契约 |
| S5 | Gallery + visual loop（含 3 次上限） |
| S6 | existing：inventory + legacy mapping |
| S7 | 可选适配器：模板映射、Apply handoff |
| S8 | 分发 allowlist、单独 `npx skills add -s ui-template-design` |

第一版默认交付：**契约 + Primitive + Pattern + Gallery + 规则门禁**。Golden Page 强烈建议，全站迁移不作为 v1 完成条件。

---

## 16. 与参考方案的对照

| 参考要点 | 本方案中的位置 |
| --- | --- |
| Token → Primitive → Pattern → Page | §4–§5，Pattern 是关键层 |
| 禁止 raw color / 语义色 | §5.2、§6.1 |
| 不要停在 shadcn | §5.3 |
| Page Type 闭集 | §5.5 |
| Frontend Constitution | §6.1，并且必须可执行 |
| Gallery / Storybook | §5.7，栈可替换 |
| Screenshot 反馈回路 | §5.8、§6.6 |
| 先冻结业务再重构 | §7.2 Phase 0 |
| Inventory 再抽 token | §7.2 Phase 1–2 |
| 可执行规则 / 导入约束 | §6.1 |
| Data-State 绑定 | §6.2 |
| Motion 白名单 | §6.3 |
| 断点降级预设 | §6.4 |
| Legacy mapping / codemod | §6.5 |
| 视觉自愈 + 失败上限 | §6.6 |
| Golden Page 只读、Pattern 才可变 | §6.7 |
| 独立 skill | §3、§11 |

---

## 17. 未决项（实现前只需拍板这些）

1. **Gallery 适配器**：第一版是否先做「应用内 `/dev/design-system` 路由」，Storybook 作可选，避免把 Node 工具链写进 skill 硬依赖。
2. **Golden Page**：独立完成是否强制一个基线页，还是 Gallery 通过即可。
3. **规则写入位置**：默认改项目 `AGENTS.md`，还是只写 `.cursor/rules` / 本 skill 生成的 `AGENTS.design.md` 再让用户合并。
4. **命名**：保留 `ui-template-design`（和本仓产品家族并列），或改为更不易误触发的 `ui-framework-design`。建议前者 + description 写明无模板也可。

确认本文方向后，下一步是开 OpenSpec change，而不是直接改生产 skill 与 bundle。
