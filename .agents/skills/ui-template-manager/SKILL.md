---
name: ui-template-manager
description: 管理本仓库(ui-templates-skill)templates/ 目录下的 UI 设计规范模板,并路由模板消费请求。模板创建/导入/更新/浏览遵循 skills/ui-template/;用已有模板实现页面遵循 skills/ui-template-apply/。当用户要求"做成模板/提取风格/更新模板"或"用某个模板做页面/实现 UI"时使用。
---

# ui-template-manager — 本仓库模板管理

本仓库是可共享 skill `ui-template` 与 `ui-template-apply` 的源码仓。本文件是项目级路由薄封装:按用户意图指向对应通用 skill,不重复通用流程。

## 按意图路由

### Template Authoring / 模板库管理 → `skills/ui-template/`

触发:"做成模板 / 提取风格 / 导入模板 / 更新模板 / 浏览模板"。

- `skills/ui-template/SKILL.md` — 工作流程(定位来源 → 按来源提取 → 归一与决策 → 生成规范 → 更新索引)
- `skills/ui-template/references/spec-format.md` — spec.md / tokens.yaml / meta.yaml 格式唯一权威来源
- `skills/ui-template/references/source-{web,repo,image,doc}.md` — 四类来源的提取指南

### Template Apply → `skills/ui-template-apply/`

触发:"用某个模板做页面 / 按模板实现 UI / 基于模板搭后台"。

- `skills/ui-template-apply/SKILL.md` — 阶段列表、消费契约摘要、反馈产出
- `skills/ui-template-apply/references/template-contract.md` — 模板消费不变量
- `skills/ui-template-apply/references/apply-workflow.md` — 阶段与 gate
- `skills/ui-template-apply/references/toolchain.md` — 默认工具链与缺失回退
- `skills/ui-template-apply/references/quality-gates.md` — 最低质量门禁

两个 skill 通过 `templates/` 目录的公开数据契约解耦:Authoring 拥有格式定义,Apply 只消费;Apply 产出的结构化反馈由 Authoring 在下次更新模板时消费。

## 本仓库约定

- 模板统一存放于 `templates/<name>/`;每次新增/更新模板必须同步 `templates/INDEX.md` 索引行。
- 模板必备 `spec.md`、`tokens.yaml`、`meta.yaml`:`spec.md` 是设计规则唯一入口(开篇列 Non-negotiables),`tokens.yaml` 是颜色、字号、间距、圆角等精确值的唯一载体,缺口必须回填 `origin: default` 默认值。
- 大型规范允许拆分(如 `platforms/<platform>.md` 子规格),`spec.md` 为共享核心与入口;组件设计契约可放模板根目录 `components.md`。
- `apply/` 只允许写实施顺序、阶段 gate 与验收引用;目录契约、API/data 分层、状态库选型、stack adapter 与具体业务域名不得进入模板,由消费项目实施时决策。
- 语言:文档与注释一律简体中文,色值、字体名、CSS 属性等技术内容保留原文。
- **改动 Authoring 流程或模板格式时,改 `skills/ui-template/`;改动 Apply 流程或工具链时,改 `skills/ui-template-apply/`;不要只改本文件**;保持 manager 为薄封装。
- 模板自包含、不含密钥与特定环境路径;skill 文件会被 AI 助手直接消费,不写入不希望被逐字执行的内容。

## 复用已有模板

用户说"用某个模板做页面"时:按上节路由阅读并遵循 `skills/ui-template-apply/`,由其分阶段完成实现与验收。本 skill 只做路由,不负责页面实现。

---

## Self-evolution

本 Skill 具备经验积累、评估与持续进化能力。目录（均相对本 Skill 根目录）：

```text
.agents/skills/ui-template-manager/
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
3. 若只是结构/规则的显式修订且环境有 `skill-upgrader`：走其 `update` 模式（`.agents/skills/ui-template-manager/patches/`），仍须先提案再应用。
4. 未展示 Proposal 并获得用户确认前，不改生产 Skill。
