# Template Apply 工作流

本文定义“使用已有 UI 模板实现真实页面”的阶段顺序、产物、工具配合、完成门禁、中断恢复和反馈闭环。执行时必须同时读取模板的 `spec.md`(优先 Non-negotiables)与 `tokens.yaml`;若模板带有 `apply/`,读取其 playbook,并按阶段加载其余拆分文档。

## 0. Intake:模板选择与范围确认

### 输入

- 用户目标、产品名、业务域和页面清单。
- 目标平台:`web`、`mobile`、`desktop` 或组合。
- 技术栈和现有代码库状态。
- 必须保留的既有约定:路由器、状态库、组件库、样式系统、测试框架。
- 明确的范围边界:本次必须实现、可选实现和明确不实现的页面。

### 必做检查

1. 选择一个已存在的模板;没有合适模板时先创建或扩展模板,不要即兴生成一套新 shell。
2. 读取模板 `meta.yaml`、`spec.md` 的 Non-negotiables 和 `tokens.yaml`;存在 `platforms/` 或 `apply/` 时读取所选平台文档与 `apply/playbook.md`。
3. 若模板支持多个平台,确认本次采用哪个平台路径。
4. 技术栈约束记录进 Implementation Brief;模板不提供 stack adapter,目录与工程边界在 Phase 3 针对本项目决策。
5. 将用户范围转成 route inventory 的初稿;没有具体路由时,至少列出页面模式和页面数量。
6. 记录不可协商规则:整页滚动策略、chrome 高度、密度、双主题、响应式断点、可访问性。

### 产物

```text
## Implementation Brief

- 模板:<name>
- 目标:<一句话业务目标>
- 平台:<web/mobile/desktop>
- 技术栈:<framework + build + styling + components + state + data>
- 页面范围:<included / deferred / excluded>
- 现有约束:<router / state / UI library / tests / a11y requirements>
- 成功标准:<用户可完成的 3–5 个关键流程>
- 非目标:<本次不做且验收时不检查的内容>
```

### Gate

- 已选定模板。
- 页面范围和“不做范围”显式确认。
- 技术栈、平台路径和既有约束明确。
- 成功标准可以用真实用户流程描述。

## 1. Art direction & design system

### 输入

- Intake brief。
- 模板 token、配色角色、字体阶梯、密度、圆角、边框和阴影规则。
- 品牌资产、既有产品截图、竞品参考。
- `ui-ux-pro-max` 检索结果和 `frontend-design` 的美学承诺。

### 必做决策

| 决策 | 要求 |
| --- | --- |
| 风格承诺 | 用 3–6 个关键词描述情绪和优先级,例如“紧凑、工具感、克制、高可扫读” |
| 明暗 | 明确 light、dark 或 dual theme;dual theme 必须说明 token 名不变、方向反转 |
| 配色 | 每个值映射到角色:`background`、`foreground`、`surface`、`border`、`brand`、状态色等 |
| 字体 | 选择字体族、fallback、九档或模板允许的字号阶梯、行高、字重和数字变体 |
| 密度 | 固定导航行、页头、工具栏、表格行、卡片和控件的内边距/高度 |
| 圆角 | 区分画布、卡片、控件、输入框、徽章和浮层 |
| 边界 | 固定 1px 分割线、hover 底、selected 底、focus ring |
| 动效 | 定义时长、缓动、允许移动的属性;路由切换避免大转场 |
| 阴影 | 明确文档流无阴影;阴影只用于 menu、dialog、popover、drawer、toast |
| Token freeze | 项目 token 逐项映射自 `tokens.yaml`;新增值在 Implementation Brief 标注 `new-token` 并说明理由,默认拒绝;禁止从 prose 重新演绎数值 |

### 工具

- `frontend-design`:先给出美学立场、反例和取舍,避免默认 AI 风格。
- `ui-ux-pro-max`:检索 styles、palettes、font pairings 和 UX rules。
- 模板 `spec.md`:已有规则不得被新偏好覆盖。

若工具不可用,改用人工 style board:列出参考、情绪词、禁止项、颜色角色、字体对比和密度样例。

### 产物

```text
## Design Direction

- Mood:<关键词>
- Anti-patterns:<明确不做的风格>
- Theme:<light / dark / dual>
- Color roles:<table>
- Type scale:<table>
- Density:<table>
- Radius / border / elevation:<table>
- Motion:<duration + easing + allowed properties>
- Token map:<template token -> project token/CSS variable>
```

### Gate

- 没有未归属的 arbitrary color、字号、间距、圆角或阴影。
- 所有主要视觉角色都有 token 或模板规则。
- 明暗主题策略确定;若支持双主题,两套主题下的角色一致。
- 用户可见的核心状态(hover、focus、selected、disabled、error)有视觉定义。
- token 映射表逐项覆盖 `tokens.yaml`,无未解释的新增值。

## 2. IA, layout & routes

### 输入

- Implementation brief。
- Design direction。
- 模板页面模式、App Shell、断点表、平台路径和 URL 状态规则。

### 必做决策

1. **Route inventory**:列出 route、页面名、模板模式、入口、主要动作和状态参数。
2. **App Shell**:确认侧栏形态、画布卡片、页头、工具栏、触发器、抽屉、顶行 chrome(如适用)。
3. **Navigation semantics**:跨页面入口使用 `<a href>`;当前项使用 `aria-current="page"`;抽屉内导航后关闭。
4. **Layout ownership**:确定页面滚动发生在哪个容器;`100svh` 根容器不滚动。
5. **Responsive matrix**:按模板断点列出每类页面在 desktop、compact、mobile 的行为。
6. **URL state**:确定选中项、页签、视图、筛选、分页、一次性意图如何进入 query。
7. **Invalid state**:定义无效 id、失效页签、未授权和 404 的表现。

### 产物

```text
| Route | 页面模式 | 主要动作 | URL params | Shell/toolbar | 空态/错误态 |
| --- | --- | --- | --- | --- | --- |

## Breakpoints

| 能力 | desktop | compact | mobile |
| --- | --- | --- | --- |

## URL contract

| 参数 | 适用页面 | 值 | 默认 | 无效值行为 |
| --- | --- | --- | --- | --- |
```

### Gate

- 每个页面都有模板模式和明确布局归属。
- 所有跨页面入口都可以表达为可导航 link。
- 每个可恢复状态都有 URL 约定,或显式说明为何不进入 URL。
- 每个断点下核心操作可达且无意外横向滚动。
- 面包屑祖先、侧栏项、搜索结果目的地等路由语义已定义。

## 3. Code structure

### 输入

- Route inventory。
- 技术栈和现有目录。
- 本项目现有目录与工程约定(模板不提供 code structure)。
- 既有 lint、test、router、state 和 API 约定。

### 必做决策

| 主题 | 决策 |
| --- | --- |
| Shell 目录 | App Shell、providers、global boundary、global overlay 的归属 |
| Route/page | 路由级页面放哪里,路由文件和页面组件如何对应 |
| Layout region | Sidebar、PageHeader、Toolbar、Drawer 等共享 layout 的归属 |
| Shared UI | 跨业务 primitives 的目录与命名 |
| Feature | 只属于业务域的组件、hooks、表单和表格 |
| State | server state、client state、URL state、表单 state 的边界 |
| Data | API client、mock、类型和错误处理的边界 |
| Styling | 全局样式、token layer、utility、CSS 变量和样式合并工具 |
| Testing | 单元、组件、route flow 和 browser 验证的文件/目录 |

以上均为当前消费项目的现场决策;不得把任何历史消费项目的目录结构、API 分层或栈选型当作模板规则复用。

### Gate

- 每个计划新增文件都能根据用途找到唯一主目录。
- 业务组件与跨域 primitives 的提升规则明确。
- API 边界不直接散落在页面组件里。
- 新增样式不会绕过 design tokens。
- 静态检查和测试可以在不猜测命令的情况下运行;若项目没有,则在说明中标注。

## 4. Component inventory

### 输入

- Design direction。
- Route inventory。
- 模板组件契约 `components.md` 和 `spec.md` 组件规则(如存在)。
- 目标组件库(如 shadcn)。

### 每个组件条目必须包含

```text
名称 / 用途:
semantic element:
variants & sizes:
states:
keyboard & AT:
source:
template usage:
```

最低字段要求:

- `semantic element`:例如 `<a>`、`<button>`、`<input>`、`<table>`、`role="tablist"`。
- `variants`:primary、outline、ghost、destructive、link 等模板要求的形态。
- `sizes`:与模板密度一致,不得引入第四套高度。
- `states`:default、hover、focus-visible、active、disabled、loading、selected、error 等。
- `keyboard & AT`:accessible name、role、焦点、方向键、`Esc`、展开状态。
- `source`:shadcn/custom/既有组件;custom 必须说明理由。

### Gate

- 所有 route inventory 中出现的交互都有组件条目。
- icon-only 控件有非空 accessible name 方案。
- 状态不只依赖颜色。
- 禁止 interactive element 嵌套;列表行选择和行打开已拆分。
- 弹层组件定义焦点进入、关闭、焦点返回和 Esc。

## 5. Representative slice

### 目标

先端到端实现一个真实页面,而不是先堆一批互不相联的 demo 组件。代表性页面应覆盖模板最关键的能力:通常是列表页、主从页或设置页之一。

### 必须打通

1. App Shell 与 route link。
2. 页头/工具栏与模板密度。
3. 至少一个数据展示区。
4. loading、empty、error 三个基础状态。
5. URL 状态读写与刷新恢复。
6. 桌面与至少一个窄屏视口。
7. 键盘焦点路径。
8. 控制台无未处理错误。

### Gate

- 页面在真实浏览器中可用。
- Shell、layout、组件和状态不是孤立实现。
- URL 刷新后仍能恢复页面状态。
- computed style 与模板 token 匹配。

## 6. Complete page modes

### 目标

扩展到 Intake 确认的全部页面,而不是停留在 demo。若模板有模式 A–E,必须逐个映射到业务页面并验收。

### 常见模式

| 模式 | 关注点 |
| --- | --- |
| 列表/集合 | 页头、工具栏、筛选、排序、分页、行选择、批量操作、滚动列表 |
| 主从双栏 | 列宽记忆、详情最小占比、compact 单栏、选中保留 URL、返回恢复 |
| 文档详情 | 面包屑祖先 link、主列限宽、属性栏、移动降级、FAB 安全区 |
| 设置页 | 竖排分组页签、横向窄屏页签、内容限宽、`?tab=`、保存/错误状态 |
| 聚合网格 | 响应式网格、卡片层级、hover、统计容器、空态和创建入口 |

### Gate

- Intake 中 included 的每个页面都有实现和浏览器证据。
- 每个模板模式都至少覆盖一次;若有页面复用同一模式,可共享检查结论但必须说明差异。
- 每个页面的空态、加载态、错误态和无效参数态明确。

## 7. Global systems

### 必须覆盖

1. 全局搜索/命令面板:输入、加载、空态、错误、分组结果、键盘上下选择、Enter 打开、Esc 关闭。
2. 全局创建入口:快捷键、按钮、表单校验、saving/error、成功后的列表或计数更新。
3. 确认对话框:危险操作必须确认;确认/取消后焦点返回。
4. Toast/通知:成功、警告、错误;可关闭;不应遮挡关键操作。
5. 路由/异步进度:细进度条或结构骨架,不用无结构 spinner 替代布局。
6. 错误横幅:同一位置只显示最高优先级提示,不随内容滚动。
7. 快捷键帮助:列出可用键,说明输入框聚焦时的失效规则。
8. FAB:右下角常驻;底栏、滚动内容和居中浮层让位。

### Gate

- 每个全局系统从模板要求的任意页面可达。
- 浮层焦点、Esc、点击遮罩、返回焦点行为一致。
- 成功与失败路径都有用户可见反馈。

## 8. Browser verification

### 必查视口

| 视口 | 目的 |
| --- | --- |
| Desktop,如 1440×900 | 验证完整 shell、双栏、网格、页头和密度 |
| Compact,如 900×900 | 验证折叠/触发器、单栏降级和中间宽度可用性 |
| Mobile,如 390×844 或 480×900 | 验证触达性、icon-only 动作、描述隐藏和滚动 |

若模板定义了不同视口,以模板为准。

### 必查内容

1. 首屏与关键滚动位置截图。
2. `document.documentElement` 无意外页面滚动。
3. 控制台无 error 或 unhandled rejection。
4. Accessibility tree:link、button、tab、checkbox、dialog 名称正确。
5. 键盘路径:Tab 顺序、focus-visible、方向键、`Esc`、Enter。
6. Computed style:颜色、字号、行高、间距、圆角、边框、阴影。
7. 交互状态:hover、focus-visible、selected、disabled、loading、dragging。
8. URL:刷新恢复、前进、后退、无效参数。
9. 状态:loading、empty、error、unauthorized、not found。
10. 双主题:如适用,检查两套主题下的层级和对比度。

### 证据格式

```text
| Page | Viewport | State | Evidence | Result |
| --- | --- | --- | --- | --- |
```

截图、trace、AX 摘要或可重复脚本输出均可作为证据;但不能只有一句“已检查”。

### Gate

- 没有未解释的 console error。
- computed style 不违反模板规则。
- 关键流程在三个视口都能完成。
- 每个失败项都有修复后复验记录。

## 9. Design review & feedback

### Review 覆盖

1. 视觉一致性:token、密度、层级、圆角、边框、阴影。
2. 响应式:desktop/compact/mobile,无横向滚动,核心操作可达。
3. 交互状态:hover、focus、active、disabled、loading、selected、dragging、error。
4. 可访问性:语义、name、role、keyboard、focus return、对比度、非颜色状态。
5. 路由语义:真实 link、`aria-current`、URL 状态、深链和返回。
6. 信息架构:页面模式、空态、错误态、优先级和入口一致。
7. 工程质量:目录、复用、状态边界、测试和静态检查。

### Review 结论

```text
| Area | Finding | Severity | Fix | Re-check |
| --- | --- | --- | --- | --- |
```

严重度建议:

- **P0**:阻断关键流程、键盘不可达、控制台错误、语义错误、数据丢失。
- **P1**:模板规则明显违背、响应式不可用、状态缺失、可访问性障碍。
- **P2**:一致性偏差、冗余实现、可维护性问题。

### 模板反馈闭环

完成前必须分类 review 与实现中的发现:

| 问题类型 | 回写位置 |
| --- | --- |
| 任意消费者都会遇到的布局/视觉规则缺口 | 模板 `spec.md` 或平台文档 |
| 某模板的实施顺序或验收方式缺口 | 模板 `apply/` |
| React/Tailwind/shadcn/浏览器工具专属问题 | 通用 `toolchain.md` 或目标项目文档 |
| 所有模板 apply 都需要的质量检查缺口 | `skills/ui-template-apply/references/quality-gates.md` |
| 消费项目的目录结构、API/mock、栈适配问题 | 当前项目文档,不回写模板 |
| 只与当前业务相关 | 当前项目文档或 issue,不污染模板 |

### Final gate

- Browser verification 通过。
- P0/P1 已修复或经用户明确接受。
- 工程检查完成。
- 模板反馈决定已执行或记录为后续任务。

## 中断与恢复

Template Apply 可跨会话执行。恢复时按以下顺序核验:

1. 读取 Implementation Brief,确认范围未变。
2. 读取 Design Direction,确认 token 未漂移。
3. 读取 route inventory 和断点矩阵,确认新增页面没有绕过 IA。
4. 读取目录契约,确认没有出现“未分类组件目录”。
5. 读取已完成页面和验证证据;只把有证据的项视为完成。
6. 若前一阶段产物缺失或过时,先补齐,再继续实现。

不要因为任务列表只记录“页面已写”就跳过浏览器验证;完成以证据为准。
