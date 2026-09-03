---
name: ui-template
description: 从运行中的 Web 站点(URL)、代码仓库(本地路径或 Git 地址)、图片(截图/设计稿)或设计文档(Markdown/PDF)中提取 UI 设计风格，创建/导入/更新为可复用的设计规范文档，并维护 templates/ 模板库。当用户想把某个网站、页面、截图或项目的视觉风格"做成模板"、"导入 UI 模板"、"提取设计规范"，或浏览/更新已有模板时使用；不用于按模板实现页面（那属于 ui-template-apply）。
---

# ui-template — 模板创建、导入与库管理

本 skill 只负责 Template Authoring 与 `templates/` 库管理：把外部来源提炼成规范文档，并保证产物可被独立的 `ui-template-apply` skill 消费。用已有模板实现页面不是本 skill 的职责。

## 触发边界

进入本工作流：

- 用户给定 URL、仓库、图片或设计文档，希望"提取风格 / 做成模板 / 导入模板"。
- 用户想浏览、复用、更新或拆分 `templates/` 里已有的模板。

移交或拒绝：

- "用某个模板实现页面 / 按模板做 UI / 基于模板搭后台" → 提示移交 `ui-template-apply`，不在本 skill 内展开 Apply 阶段。
- 用户想按某种风格做页面但尚无模板 → 先完成 Authoring，再提示用 `ui-template-apply` 继续。
- 与 UI 模板库维护无关的任务 → 不套用本流程。

## 核心原则

- **产物是规范，不是代码堆砌**：记录配色角色、字号阶梯、间距体系、组件状态和布局规则，而不是罗列零散样式。
- **注明来源与置信度**：图片反推值标注 `(估算)`；来自代码或 computed style 的值标明出处。
- **模板自包含**：引用外部来源只保留 URL/路径和采集时间，不依赖来源持续可用。
- **Token 确定且可机读**：每个模板必须提供 `tokens.yaml` 作为精确值唯一载体；来源未体现的字段回填模板默认值并标注 `origin: default`，禁止留空交给消费方即兴发挥。
- **模板只承载设计规则**：目录契约、API/data 分层、状态库选型和具体技术栈 adapter 属于消费项目实施决策，不进入模板。
- **格式契约唯一归属**：`spec.md`、`tokens.yaml`、`meta.yaml` 与 `apply/` 的格式定义以本 skill 的 [references/spec-format.md](references/spec-format.md) 为唯一权威来源。

## 来源路由

| 来源 | 指南 |
| --- | --- |
| `web` 运行中的站点 | [references/source-web.md](references/source-web.md) |
| `repo` 代码仓库 | [references/source-repo.md](references/source-repo.md) |
| `image` 图片/截图 | [references/source-image.md](references/source-image.md) |
| `doc` 设计文档 | [references/source-doc.md](references/source-doc.md) |

骨架、字段、`origin` 语义、coverage 与大型规范拆分 → [references/spec-format.md](references/spec-format.md)。按来源条件加载，不要求通读全部指南。

## Authoring 流程

1. 确定来源类型与模板名；`templates/<name>/` 已存在时询问是更新还是另建。
2. 按来源路由读取对应指南并提取设计信息。
3. 归一与决策：合并近义色、间距归基数、字号收敛；缺口回填默认值并标注 `origin: default`；补齐交互状态；做对比度预检；在 `meta.yaml` coverage 区分 observed 与 defaulted。
4. 生成模板：`spec.md`（开篇 Non-negotiables）+ `tokens.yaml` + `meta.yaml`，可选 `assets/` 与 `apply/`。写作细节见 [references/spec-format.md](references/spec-format.md)。
5. 更新 `templates/INDEX.md` 并汇报模板路径、关键 token、默认值与估算值、coverage 和决策记录。

## 模板反馈消费

更新模板前检查 `ui-template-apply` 产出的结构化反馈记录（场景、证据、建议、影响范围）：

- 可复用规则缺口 → 回写对应模板文档，必要时更新索引与元数据。
- 仅属消费项目的工程问题 → 驳回，不污染模板。

## 汇报要求

汇报模板路径、关键 token 摘要、默认值与估算值说明、coverage、决策记录和索引更新；发现 Apply 意图时说明移交 `ui-template-apply`。

## Self-evolution

本 Skill 具备经验积累、评估与持续进化能力。目录（均相对本 Skill 根目录）：`examples/`、`evals/`、`experience/`、`patches/`。执行复杂任务前检查 `examples/` 与相关 `evals/`；任务完成后仅在有失败、纠正、明显成功或新方法时写入 `experience/`；不要为了自进化破坏上文已规定的目标、流程、输出与约束。

Evolution 遵循：Experience → Repeated Pattern → Improvement Proposal → Eval → Pass → Update Skill。单次失败只留 Experience，不改生产稿。实际更新生产 `SKILL.md` 时不要直接覆盖原文；有 Git 则优先靠 Git diff 留历史；来自真实执行经验优先委托 `skill-evolver`；结构/规则显式修订走 `skill-upgrader` 的 update 模式。未展示 Proposal 并获得用户确认前，不改生产 Skill。
