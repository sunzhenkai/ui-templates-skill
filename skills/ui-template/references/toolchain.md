# Template Apply Toolchain

本文把 Template Apply 使用的工具组织成五类能力。工具是增强器,不是流程成立的前提;某个工具不可用时必须采用等效回退,并继续满足 [quality-gates.md](quality-gates.md)。

## 能力总览

```text
Knowledge          ui-ux-pro-max
                     ↓
Taste              frontend-design
                     ↓
Design tokens      template spec + selected tokens
                     ↓
Components         shadcn / shadcn MCP
                     ↓
Implementation     target stack adapter
                     ↓
Visual feedback    Playwright MCP / chrome-devtools MCP / browser-use
                     ↓
Review             design review / /design-review / checklist
```

| 能力 | 回答的问题 | 默认工具 | 必须留下的证据 |
| --- | --- | --- | --- |
| Knowledge | 有哪些可用风格、配色、字体和 UX 规则? | `ui-ux-pro-max` | 选中的 style/palette/font/UX rule 与理由 |
| Taste | 这个界面承诺什么气质?明确拒绝什么? | `frontend-design` | mood、anti-patterns、取舍 |
| Components | 哪些组件可以直接复用?哪些必须适配? | shadcn / shadcn MCP | component inventory 与 source |
| Visual feedback | 真实浏览器里看到了什么? | Playwright MCP、chrome-devtools MCP、browser-use | 截图、console、AX、computed style |
| Automated review | 是否符合模板、可访问性、响应式和交互要求? | design review subagent、`/design-review`、checklist | findings、severity、fix、re-check |

## 1. Knowledge:`ui-ux-pro-max`

### 用途

- 在进入 CSS 前检索候选 UI styles、color palettes、font pairings 和 UX guidelines。
- 把用户给出的模糊形容词转成可比较的方向,例如“工具感”“高密度”“克制”“专业”“轻盈”。
- 检查目标产品类型常用的 layout、state、contrast 和 Core Web Vitals 建议。

### 适用阶段

- Phase 1 Art direction & design system。
- Phase 2 IA/layout/routes。
- Phase 4 Component inventory。
- Phase 9 Design review。

### 使用方式

1. 先输入产品类型、用户目标、密度要求和情绪词。
2. 请求多个候选方向,不要只接受第一个结果。
3. 对每个候选记录:适合的理由、风险、与模板规则的冲突。
4. 将最终选择映射到模板 token;未被模板支持的值必须经过用户确认或修改模板。

### 回退

没有 `ui-ux-pro-max` 时:

1. 从模板 `spec.md` 提取已确认规则。
2. 收集 3–5 个参考产品或截图,列出可复用与不可复用点。
3. 用表格记录 mood、color role、type scale、density 和 anti-pattern。
4. 用浏览器 computed style 验证实际值。

## 2. Taste:`frontend-design`

### 用途

- 在写 CSS 前做出明确美学承诺。
- 防止默认的居中卡片、无个性灰底、随机圆角和无系统阴影。
- 明确视觉优先级:信息密度、扫读效率、品牌感、安静感或操作速度。

### 适用阶段

- Phase 1 Art direction & design system。
- Phase 5 Representative slice。
- Phase 9 Design review。

### 必须回答

```text
- 这个界面的情绪是什么?
- 用户 3 秒内应该注意到什么?
- 哪些视觉元素必须安静?
- 哪些默认 AI 风格必须禁止?
- 哪些模板规则不可妥协?
- 如果密度与装饰冲突,保留哪一个?
```

### 回退

没有 `frontend-design` 时,在 Implementation Brief 后补一节:

```text
## Taste commitment

- Mood:
- First glance priority:
- Must stay quiet:
- Anti-patterns:
- Trade-off:
```

## 3. Components:shadcn / shadcn MCP

### 用途

- 用自然语言搜索 production-ready primitives。
- 减少重复实现 Button、Input、Select、Dialog、Tabs、Table、Tooltip 等组件。
- 以受控方式复制组件源码到项目中,再按模板 token、密度和可访问性要求适配。

### 选型顺序

1. **Use as-is**:shadcn 组件语义、状态和 API 已满足模板,只替换 token。
2. **Adapt**:保留可访问性和交互模型,调整高度、圆角、字号、边框、焦点环和状态色。
3. **Compose**:把 shadcn primitives 组合为模板要求的 Table shell、Search palette、Kanban card 等。
4. **Custom**:没有等价组件,或模板行为差异足够大时才自研;必须记录理由和 a11y 方案。

### 适用阶段

- Phase 3 Code structure:确定组件目录。
- Phase 4 Component inventory:确定来源与适配方式。
- Phase 5–7:实现页面与全局系统。

### 回退

shadcn MCP 或组件检索不可用时:

1. 检查项目本地 `components/ui/` 或既有设计系统。
2. 从模板 `components.md` 的 semantic element 和状态出发手写 inventory。
3. 优先使用项目已有 headless/accessible 组件。
4. 自研时逐项实现 keyboard、focus、`aria-*`、disabled、loading、error 和 selected 状态。

## 4. Visual feedback:真实浏览器

浏览器验证不是可选截图,而是读取真实运行结果的反馈循环。

### 默认工具

| 工具 | 优势 | 典型用途 |
| --- | --- | --- |
| Playwright MCP | 自动化导航、多视口、状态注入、截图、脚本化验证 | 页面矩阵、loading/error 态、键盘与 URL 检查 |
| chrome-devtools MCP | 读取浏览器内部状态、console、performance、DOM/CSS | computed style、console、AX、布局调试 |
| browser-use | 通过 CDP 控制本地或远程 Chrome,可读取 AX tree 和执行交互 | 手动路径探索、复杂站点、登录态、截图与点击验证 |

### 必须采集

1. Desktop、compact、mobile 视口截图。
2. Console error/warning 和 unhandled rejection。
3. Accessibility tree 中的 name、role、focusable 状态。
4. 关键元素 computed style。
5. 键盘遍历和焦点可见性。
6. URL 刷新、前进、后退和无效参数表现。
7. loading、empty、error、unauthorized、not found 状态。
8. 双主题对比(如模板要求)。

### 回退

- 没有 Playwright MCP 或 chrome-devtools MCP 时,使用 browser-use。
- 没有 browser-use 时,使用项目已有 Playwright/WebDriver 脚本。
- 没有任何浏览器自动化工具时,停止并要求用户提供可运行的浏览器验收方式;不要只靠静态检查宣称完成。

## 5. Automated review:design review

### 用途

以多阶段审查检查:

1. 视觉一致性。
2. 响应式。
3. 交互状态。
4. 可访问性与 WCAG AA。
5. 路由与 URL 语义。
6. 信息架构与状态完整性。
7. 工程质量。

### 默认入口

- 可用的 design review subagent:委托其按七阶段审查。
- `/design-review` 命令:提供页面 URL、范围、视口、模板路径和已知风险。
- 无 subagent/命令:按 [quality-gates.md](quality-gates.md) 逐项审查并输出 findings 表。

### Review 输出

```text
| Area | Finding | Severity | Fix | Re-check |
| --- | --- | --- | --- | --- |
```

严重度:

- P0:阻断关键流程、键盘不可达、语义错误、数据丢失、console error。
- P1:违反模板规则、响应式不可用、可访问性障碍、状态缺失。
- P2:一致性、可维护性、轻微视觉偏差。

### 回退

没有自动 review 工具时,至少由执行 Agent 和用户分别核对:

1. 模板 `spec.md` 的每条可验收规则。
2. `quality-gates.md` 的 14 项最低检查。
3. route inventory 中的每个页面。
4. component inventory 中的每个组件状态。

## 工具冲突处理

- 工具建议与模板 `spec.md` 冲突时,以 `spec.md` 为准。
- 工具建议与用户显式要求冲突时,先向用户确认,再更新 Implementation Brief 或模板。
- 工具输出的是候选值,不是自动完成;必须映射到 token 并用浏览器验证。
- 工具不可用不是降低验收标准的理由;必须记录回退方案。
