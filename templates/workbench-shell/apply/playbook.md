# workbench-shell · Apply Playbook

本文是 `workbench-shell` 的消费端实施顺序与验收入口。它不复制设计规则;所有布局、密度、颜色、chrome、断点和交互约束以 [`../spec.md`](../spec.md) 与 [`../tokens.yaml`](../tokens.yaml) 为准。平台外壳差异见 [`../platforms/web.md`](../platforms/web.md)、[`../platforms/mobile.md`](../platforms/mobile.md) 和 [`../platforms/desktop.md`](../platforms/desktop.md)。

通用流程见 `skills/ui-template/references/apply-workflow.md`;本文只补充 workbench-shell 的顺序、页面模式和验收重点。

## 使用边界

- 本 playbook 适用于“用 workbench-shell 实现完整工作台应用”。
- `spec.md` 与本文冲突时,以 `spec.md` 为准。
- 本模板不提供 runnable starter,也不预置目录契约或 stack adapter;工程结构在 Phase 2 由消费项目现场决策。

## 必读文件

| 文件 | 用途 |
| --- | --- |
| [`../spec.md`](../spec.md) | 设计规则唯一入口(先读 Non-negotiables) |
| [`../tokens.yaml`](../tokens.yaml) | 颜色、字号、间距、圆角、阴影的精确值 |
| [`../platforms/web.md`](../platforms/web.md) | 浏览器平台外壳 |
| [`../platforms/mobile.md`](../platforms/mobile.md) | 移动平台外壳 |
| [`../platforms/desktop.md`](../platforms/desktop.md) | 桌面客户端外壳 |
| [`../routes-and-layouts.md`](../routes-and-layouts.md) | route inventory、五种页面模式、断点和 URL 参数 |
| [`../components.md`](../components.md) | 核心组件契约、状态和可访问性 |
| [`quality.md`](quality.md) | workbench 专属验收矩阵 |

## 阶段总览

```text
0  Intake
   ↓
1  Art direction & tokens
   ↓
2  Code structure
   ↓
3  App Shell
   ↓
4  Page chrome
   ↓
5  Primitive components
   ↓
6  Representative slice
   ↓
7  Complete page modes A–E
   ↓
8  Global systems
   ↓
9  Responsive states
   ↓
10 Browser verification
   ↓
11 Design review & feedback
```

## Phase 0 — Intake

### 输入

- 产品名和业务域。
- 需要的工作区/页面清单。
- 平台路径:web、mobile、desktop。
- 技术栈与现有代码约束。
- 角色、权限、数据边界和本地 mock 需求。

### 产物

```text
## Workbench Intake

- Template:workbench-shell
- Product:
- Platform path:
- Stack:
- Pages / workspaces:
- Roles & permissions:
- Primary flows:
- Deferred pages:
- Existing constraints:
- Success criteria:
```

### Gate

- 页面清单映射到五种模板模式,或明确说明本次不实现的模式。
- 平台路径明确,不把浏览器宽度当作平台判断。
- 技术栈已有 adapter,或已安排新建 adapter。
- 关键流程可以用用户动作描述。

## Phase 1 — Art direction & tokens

### 必做

1. 读取 `spec.md` 的配色角色、九档字号、间距、圆角、边框和阴影规则。
2. 确定明暗主题策略。
3. 将模板 token 映射到项目 CSS variables、Tailwind theme 或组件 tokens。
4. 确定状态色 tint、badge、focus ring、hover、selected、disabled 的具体值。
5. 检查 Tailwind 项目中自定义 utility 是否会被 class merger 覆盖。

### Gate

- 配色角色完整,而不是只有色卡。
- 九档字号全部可映射,且没有额外字号档。
- `background` / `foreground` / `sidebar` / `surface` / `border` / `brand` / 状态色可区分。
- 双主题时弱化方向反转,token 名不变。

## Phase 2 — Code structure

### 必做

1. 针对目标项目现场确认目录契约(模板不预置结构,不继承任何历史消费项目)。
2. 确定 App Shell、route page、shared layout、feature component、primitive 的归属。
3. 确定 router、URL state、client state、server state、mock/API 和测试边界。
4. 为每个计划页面分配 feature/domain。

### Gate

- 每个计划文件都有唯一归属。
- Shell、页面 chrome 和 primitives 的复用边界明确。
- 业务组件不会被放进通用 UI 目录。

## Phase 3 — App Shell

### 必做

1. 实现应用底色、画布卡片、呼吸边、圆角和边界。
2. 实现 web 浮岛侧栏;≥1024 常驻可拖宽,<1024 使用页头触发器 + 覆盖抽屉。
3. 实现 workspace switcher、全局搜索入口、创建入口、导航组、置顶组和帮助入口。
4. 实现真实 route link、`aria-current="page"`、当前项高亮和导航后抽屉关闭。
5. 实现侧栏宽度拖拽、持久化、折叠态和滚动渐隐。
6. 如进入 desktop platform,实现 48px 顶行、贴缘侧栏和页签条;不因窗口宽度切换外壳。
7. 如进入 mobile platform,实现全幅画布和覆盖抽屉。

### Gate

- 根容器 `100svh` 不滚动;只有侧栏滚动区和内容列滚动。
- web 路径 <1024 可通过页头触发器打开导航。
- 每个导航项是真实 link,当前项语义正确。
- 抽屉内路由跳转后自动关闭。
- 全局 overlay 挂在画布卡片内,不盖侧栏。

## Phase 4 — Page chrome

### 必做

1. 实现集合页头:图标 + 14px 标题 + 计数 + 描述 + 右侧动作。
2. 实现面包屑页头:祖先 crumb 是真实 link,叶子不可点。
3. 实现简单页头。
4. 实现 48px Toolbar、16px 页左距、右侧动作区和 focus ring。
5. 实现统一空态、错误态和 404 结构。

### Gate

- 所有页面页头高度为 48px。
- 页头、工具栏和内容左边界共用 GUTTER。
- 标题可截断,动作区不压缩。
- 面包屑页仍有明确的页面标题语义。

## Phase 5 — Primitive components

### 必做

按 [`../components.md`](../components.md) 实现或适配:

- Button、Input、Textarea、Select、Combobox、Checkbox、Switch、Date picker。
- Badge、Table、Pagination、Avatar、Skeleton、Empty state。
- Tabs、Dialog、Confirm dialog、Menu、Tooltip、Toast。

每个组件必须记录:

```text
semantic element / variants / sizes / states / keyboard & AT / source / usage
```

### Gate

- 组件高度和圆角符合模板密度。
- hover、focus-visible、active、disabled、loading、selected、error 状态完整。
- icon-only 控件有非空 accessible name。
- 没有 interactive element 嵌套。

## Phase 6 — Representative slice

### 建议选择

优先选择一个能验证最多规则的模式,通常是:

- 列表/集合模式,验证页头 + 工具栏 + 表格 + 筛选 + 分页;或
- 主从双栏模式,验证列表、详情、URL 选中、compact 单栏。

### 必须打通

1. Shell 导航到页面。
2. 页面 chrome 与滚动归属。
3. 组件状态。
4. loading、empty、error。
5. URL 恢复。
6. desktop 与 compact/mobile 视口。
7. 键盘操作。

### Gate

- 控制台无未处理错误。
- computed style 匹配 tokens。
- 页面不是静态 demo,能完成一个真实用户流程。

## Phase 7 — Complete page modes A–E

必须覆盖:

| 模式 | 名称 | 必查 |
| --- | --- | --- |
| A | 列表/集合页 | 48px 集合页头、工具栏、筛选、排序、分页、行选择、滚动列表、空态 |
| B | 主从双栏页 | 320/240–480 列宽、详情 ≥40%、compact 单栏、选中保留 URL、返回恢复 |
| C | 文档详情页 | 面包屑祖先 link、896px 主列、320px 属性栏、<768 隐藏属性栏、FAB 安全区 |
| D | 设置页 | 224px 竖排页签、分组标题、768px 内容限宽、<768 横向页签、`?tab=` |
| E | 聚合网格页 | 响应式卡片网格、卡片层级、hover、空态、创建入口 |

详细结构见 [`../routes-and-layouts.md`](../routes-and-layouts.md)。

### Gate

- Intake 中 included 的每个页面完成。
- 每个模式至少有一个端到端实现。
- 每个模式都有 loading、empty、error、not found 表现。

## Phase 8 — Global systems

### 必做

1. 全局搜索/命令面板。
2. 全局创建事件/条目入口。
3. 确认对话框。
4. Toast。
5. 路由/异步进度。
6. 快捷键帮助。
7. FAB 与安全区。
8. 全局错误横幅和离线横幅(如适用)。

### Gate

- 全局入口从任意页面可达。
- 快捷键在可编辑元素聚焦时失效。
- 浮层焦点进入、关闭并返回。
- 成功和失败都有用户可见反馈。

## Phase 9 — Responsive states

### 必做

按 `spec.md` 第 13 节和 [`../routes-and-layouts.md`](../routes-and-layouts.md) 验证:

| 宽度 | web 外壳 | 画布内容 |
| --- | --- | --- |
| ≥1024 | 常驻浮岛侧栏 | 桌面布局 |
| 768–1023 | 页头触发器 + 覆盖抽屉 | compact 降级 |
| <768 | 页头触发器/返回钮 + 覆盖抽屉 | mobile 降级 |

desktop 平台路径不因窗口宽度改变外壳;mobile 平台路径保持全幅 + 抽屉。

### Gate

- 所有 included 页面在三档宽度下无意外横向滚动。
- icon-only 控件有 accessible name。
- 主从、详情属性栏、设置页签、页头描述和动作按矩阵降级。

## Phase 10 — Browser verification

按 [`quality.md`](quality.md) 执行并记录:

1. 多视口截图。
2. 控制台结果。
3. Accessibility tree。
4. computed style。
5. 键盘路径。
6. 交互状态。
7. URL 恢复和无效参数。
8. loading、empty、error、unauthorized、not found。
9. 亮暗主题(如支持)。

### Gate

- 没有未解释 console error。
- 没有模板 token 违背。
- 每个失败项都有复验记录。

## Phase 11 — Design review & feedback

### Review 重点

1. App Shell 是否符合平台路径。
2. 页头和工具栏是否全局一致。
3. 五种页面模式是否完整。
4. 组件状态和可访问性是否完整。
5. URL 状态是否真实可恢复。
6. 响应式矩阵是否可操作。
7. 全局浮层是否一致。
8. 目录和复用是否合理。

### Feedback 分类

| 发现 | 回写位置 |
| --- | --- |
| 五种页面模式共用的布局缺口 | `../spec.md` |
| 某平台外壳缺口 | `../platforms/<platform>.md` |
| 实施顺序或验收方式缺口 | 本目录(`apply/`) |
| 布局模式或组件契约缺口 | [`../routes-and-layouts.md`](../routes-and-layouts.md) 或 [`../components.md`](../components.md) |
| React/Tailwind 等技术栈问题 | 目标项目文档或通用 `toolchain.md` |
| 通用 apply 检查缺口 | `skills/ui-template/references/quality-gates.md` |
| 只属于当前业务 | 当前项目文档,不修改模板 |

## Definition of Done

- [ ] Intake 中 included 的页面全部实现。
- [ ] App Shell、页面 chrome、五种模式、全局系统和响应式状态完成。
- [ ] 组件 inventory 与实现一致。
- [ ] token 映射逐项覆盖 [`../tokens.yaml`](../tokens.yaml),无未解释的新增值。
- [ ] 所有质量矩阵通过。
- [ ] P0/P1 review findings 修复或经用户明确接受。
- [ ] 构建与静态检查通过;项目已有测试全部通过。
- [ ] 模板反馈已回写或记录为后续任务。
