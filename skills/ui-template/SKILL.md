---
name: ui-template
description: 从运行中的 Web 站点(URL)、代码仓库(本地路径或 Git 地址)或图片(截图/设计稿)中提取 UI 设计风格,创建/导入为可复用的设计规范文档;也支持使用已有 UI 模板按阶段实现真实页面,覆盖设计方向、tokens、layout、代码结构、组件、浏览器验证和 design review。当用户想把某个网站、页面、截图或项目的视觉风格"做成模板"、"导入 UI 模板"、"提取设计规范"、"以后照这个风格做页面",或明确说"用某个模板实现页面"时使用。
---

# ui-template — UI 模板创建/导入与落地

本 skill 有两个工作流:

- **Template Authoring**:把外部来源(Web 站点、代码仓库、图片)的 UI 风格提炼成可复用的设计规范文档,沉淀到 `templates/` 目录。
- **Template Apply**:使用一个已有模板实现真实 UI。该模式按阶段推进,先确定美学方向、tokens、layout、路由和代码结构,再实现组件、页面、全局系统,并用真实浏览器和 design review 收尾。

模板目录的产物仍然以规范和实施说明为主,不是完整 runnable starter。

## 何时使用

### Template Authoring

- 用户给了一个 URL、仓库路径/地址或图片,希望“提取风格 / 做成模板 / 导入 UI 模板”。
- 用户想浏览、复用、更新或拆分 `templates/` 里已有的模板。
- 用户希望把某个截图或站点规范成可复用 token、组件规则和布局约束。

### Template Apply

- 用户明确要求“用 `workbench-shell` 做页面”“按这个模板实现 UI”“基于该模板搭后台”。
- 用户已经选定本 skill 维护的模板,并希望得到可运行项目中的页面实现。
- 用户要求把模板规则落成组件、页面、路由状态、响应式行为和验收报告。

不适用于:与 UI 风格、布局模板或模板消费无关的任务。若没有可用模板,先进入 Template Authoring 创建或扩展现有模板,再进入 Template Apply。

## 核心原则

- **Authoring 的产物是规范,不是代码堆砌**:记录配色角色、字号阶梯、间距体系、组件状态和布局规则,而不是罗列零散样式。
- **Apply 的产物是可验证实现,不是一次性 demo**:每个阶段都有可检查产物;完成前必须有真实浏览器验证和 design review。
- **注明来源与置信度**:图片反推值标注 `(估算)`;来自代码或 computed style 的值标明出处。
- **模板自包含**:引用外部来源只保留 URL/路径和采集时间,不依赖来源持续可用。
- **规范优先于实施说明**:模板的 `spec.md` 是设计规则唯一入口;`implementation/` playbook 只解释顺序、映射和验收,冲突时以 `spec.md` 为准。
- **路由状态必须有语义**:跨页面目的地使用真实 `<a href>`;当前项使用 `aria-current="page"`;可恢复状态进入 URL。
- **真实浏览器是完成门禁**:不接受只看代码就宣称完成;必须检查渲染、console、可访问性树、computed style、交互状态和多视口表现。

## 工作流选择

1. 用户要求从来源创建或更新模板 → 进入 **Template Authoring**。
2. 用户要求使用已有模板实现页面 → 进入 **Template Apply**。
3. 用户要求“以后照这个风格做页面”,但还没有可用模板 → 先完成 Authoring,再申请确认是否继续 Apply。
4. 请求同时包含新模板和页面实现 → 先产出模板与确认信息,再进入 Apply;不要在 token 和 layout 未确认时直接生成页面。

## Workflow A — Template Authoring

### 1. 确定来源类型与模板名

- 来源三选一:`web`(运行中的站点)、`repo`(代码仓库)、`image`(图片/截图)。
- 与用户确认模板名(英文小写连字符,如 `linear-dark`),作为 `templates/<name>/` 目录名。
- 若 `templates/<name>/` 已存在,询问是**更新**还是**另建**。

### 2. 按来源提取设计信息

按来源类型阅读对应指南:

- `web` → [references/source-web.md](references/source-web.md)
- `repo` → [references/source-repo.md](references/source-repo.md)
- `image` → [references/source-image.md](references/source-image.md)

规范文档骨架、`meta.yaml` 字段和 optional `implementation/` 约定见 [references/spec-format.md](references/spec-format.md)。

### 3. 生成模板

基础结构:

```text
templates/<name>/
├── spec.md            # 设计规则唯一入口
├── meta.yaml          # 模板元数据
├── assets/            # 截图、色板等佐证材料(可选)
└── implementation/    # 可选:消费端落地 playbook 与 stack adapter
```

写作要求:

- 全部使用简体中文;色值、字体名、CSS 属性、路径和组件名保留原文。
- 每个估算值标注 `(估算)`,精确值注明出处(如“来自 `:root` CSS 变量”)。
- 配色必须给出角色语义(背景/前景/主色/强调/边框/成功/警告等),不能只列色卡。
- 有佐证截图时放入 `assets/` 并在 `spec.md` 中引用。
- `implementation/` 不复制 `spec.md` 规则,只写实施顺序、stack 映射、组件 inventory 和质量验收。

### 4. 更新索引与收尾

- 更新 `templates/INDEX.md`(不存在则创建),追加一行 `| <name> | <一句话风格描述> | <来源类型> | <采集日期> |`。
- 向用户汇报模板路径、关键 token 摘要、哪些是估算值,以及是否包含 implementation playbook。

## Workflow B — Template Apply

执行前必须阅读:

1. [references/apply-workflow.md](references/apply-workflow.md) — 阶段、产物和 gate。
2. [references/toolchain.md](references/toolchain.md) — 默认工具与缺失回退。
3. [references/quality-gates.md](references/quality-gates.md) — 可访问性、路由、响应式和浏览器验收。
4. `templates/<name>/spec.md` — 设计规则唯一入口。
5. `templates/<name>/meta.yaml`、`platforms/*.md`、`implementation/*`(如存在)。

### 阶段总览

| 阶段 | 必须先完成 | 核心产物 |
| --- | --- | --- |
| 0. Intake | — | 模板名、页面范围、平台、技术栈、约束 |
| 1. Art direction & tokens | Intake | 风格承诺、配色角色、字体阶梯、密度、主题、边框/阴影策略 |
| 2. IA/layout/routes | Art direction | route inventory、页面模式、shell 形态、断点矩阵、URL 状态 |
| 3. Code structure | IA/layout | 目录契约、命名、状态/数据/测试边界 |
| 4. Component inventory | Code structure | primitives、variants、states、a11y、source |
| 5. Representative slice | Component inventory | 一个端到端真实页面 |
| 6. Complete page modes | Representative slice | 模板要求的全部页面模式/页面 |
| 7. Global systems | Complete page modes | 搜索、创建、确认、Toast、进度、FAB、快捷键帮助 |
| 8. Browser verification | 待验证实现 | 多视口截图、console、AX、computed style、URL 恢复 |
| 9. Review & feedback | Browser verification | design review 结论、修复项、模板反馈决定 |

不得跳过阶段,也不得把后续阶段提前。若用户要求缩小范围,在 Intake 中显式记录“本次不实现哪些模式”,而不是悄悄降低验收标准。

### 收尾要求

- 每个页面至少检查桌面、compact 和 mobile 视口。
- 路由入口使用 `<a href>`,当前路由使用 `aria-current="page"`。
- icon-only 控件必须有非空 accessible name;交互控件不得嵌套。
- 状态不能只靠颜色表达;焦点必须可见;弹层必须管理焦点和返回。
- `100svh` 根容器不滚动,滚动只发生在内容列、列表、详情或看板列内部。
- 控制台无未处理错误;computed style 必须匹配模板 token。
- review 后评估哪些发现需要回写模板、stack adapter 或通用 skill。

## 汇报要求

- Authoring:汇报模板路径、关键 token、估算值和索引更新。
- Apply:汇报已实现页面、未实现范围、目录结构、组件来源、浏览器验证证据、review 结论和模板反馈建议。
- 任何工具不可用时,说明所采用的回退方案;任何模板规则冲突时,说明以 `spec.md` 为准的处理结果。

## Self-evolution

本 Skill 具备经验积累、评估与持续进化能力。目录（均相对本 Skill 根目录）：

```text
.agents/skills/ui-template/
├── SKILL.md
├── examples/      # 经过验证的优秀执行案例
├── evals/         # 可验证成功标准
└── experience/    # 真实失败 / 成功 / 规律
```

不要为了自进化而破坏上文已规定的目标、流程、工具用法、输出与约束。

### Examples

执行复杂任务前：

1. 检查 `examples/`
2. 找到与当前任务相关的成功案例
3. 优先复用已经验证的方法

没有相关案例时按上文正常执行，不要编造案例。

### Evaluation

任务完成前：

1. 检查相关 `evals/`
2. 验证关键输出
3. 检查是否违反 Skill 约束
4. 尽可能运行相关 Eval Cases（见 `evals/cases.yaml`）

优先确定性 Eval；无法确定性判断时再用 LLM Judge。Eval 失败则先修输出，不要带着失败交卷。

### Experience

任务完成后，出现以下情况才写入 `experience/`：

- 失败
- 用户纠正
- 明显成功
- 新的有效执行方法
- 可复用的经验

不要记录 trivial information。不要伪造条目。密钥、内部 URL、凭据不得写入。

单次失败 → `experience/failures/`。重复出现的规律 → `experience/patterns/`（至少两次同类证据）。

### Evolution

只有当 Experience 暴露出**可复用、稳定的问题或模式**时，才考虑修改本 Skill。

遵循：

```text
Experience
    ↓
Repeated Pattern
    ↓
Improvement Proposal
    ↓
Eval
    ↓
Pass
    ↓
Update Skill
```

禁止：

```text
Single Failure
    ↓
Directly modify SKILL.md
```

进入 Skill 正文的 Experience 必须同时满足：可复用于多个类似任务、有足够证据、能明确改善结果、不破坏已有能力、可通过 Eval 验证。一次性特殊情况只留 Experience，不改 Skill。

实际更新生产 `SKILL.md` 时：

1. 不要直接覆盖原文；记录 version / change / reason / evidence / evaluation。有 Git 则优先靠 Git diff 留历史。
2. 若改动来自**真实执行经验**：优先委托 `skill-evolver`（`evolutions/` → 验证 → 晋升），不要本 Skill 自己改生产稿。
3. 若只是结构/规则的显式修订且环境有 `skill-upgrader`：走其 `update` 模式（`.agents/skills/ui-template/patches/`），仍须先提案再应用。
4. 未展示 Proposal 并获得用户确认前，不改生产 Skill。
