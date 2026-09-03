---
name: ui-template-apply
description: 使用已有 UI 模板按阶段实现真实页面，覆盖美学方向、tokens 冻结、IA/layout/route、代码结构、组件、浏览器验证与 design review。当用户明确要求"用某个模板实现页面"、"按模板做 UI"、"基于该模板搭后台"、"把 workbench-shell 落成项目"时使用；不用于从站点/仓库/图片提取风格或创建模板（那属于 ui-template）。
---

# ui-template-apply — 用已有模板落地真实 UI

本 skill 只消费模板，不创建模板。模板创建、导入、更新与索引维护由 `ui-template` 负责；本 skill 通过 `templates/` 目录的公开数据契约与它解耦。

## 触发边界

进入本工作流：

- 用户明确选择 `templates/` 中已有模板，并要求实现页面或后台。
- 用户要求把模板规则落成组件、页面、路由状态、响应式行为并完成验收。

不进入本工作流：

- "做成模板 / 提取风格 / 导入模板" → 移交 `ui-template`。
- 模板库中没有可用模板 → 先由 `ui-template` 完成 Authoring，再回到本 skill。
- 与模板消费无关的普通 UI 任务 → 不套用本流程。

## 模板消费契约（必读）

执行前先读 [references/template-contract.md](references/template-contract.md)，核心不变量：

- `spec.md` 是设计规则唯一入口，冲突时以它为准。
- `tokens.yaml` 是精确值唯一载体，expected 值只从它来。
- `origin: observed / default / estimated` 均作为确定值消费；偏离须记录理由。
- `meta.yaml` coverage 未覆盖的模式 → 实现前显式确认，不得静默即兴发挥。

## 阶段列表（不得跳过或提前）

每个阶段的输入、产物、工具配合与 gate 详情见 [references/apply-workflow.md](references/apply-workflow.md)。

| 阶段 | Gate |
| --- | --- |
| 0. Intake | 模板名、页面范围、平台、技术栈、约束确认 |
| 1. Art direction & tokens | 美学承诺 + token 冻结映射完成 |
| 2. IA/layout/routes | route inventory、shell 形态、断点矩阵、URL 契约 |
| 3. Code structure | 目录契约、命名、状态/数据/测试边界 |
| 4. Component inventory | primitives、variants、states、a11y、source |
| 5. Representative slice | 一个端到端真实页面打通 |
| 6. Complete page modes | 模板要求的全部页面模式完成 |
| 7. Global systems | 搜索、创建、确认、Toast、进度、FAB 等补齐 |
| 8. Browser verification | 多视口、console、AX、computed style、URL 恢复全过 |
| 9. Review & feedback | design review 通过 + 反馈记录产出 |

用户要求缩小范围时，在 Intake 显式记录"本次不实现哪些模式"，不得悄悄降低验收标准。

## Reference 路由

- 阶段细节与中断恢复 → [references/apply-workflow.md](references/apply-workflow.md)
- 工具链与不可用回退 → [references/toolchain.md](references/toolchain.md)
- 验收门禁清单 → [references/quality-gates.md](references/quality-gates.md)

按所处阶段条件加载，不要求一次性通读全部 reference。

## 模板反馈产出

完成前评估实现中发现的规则缺口：

- 会重复出现在其他消费者的缺口 → 产出结构化反馈记录（场景、证据、建议、影响范围），供 `ui-template` 下次更新模板时消费。
- 仅属当前业务的问题 → 记录在项目实现说明，不产出模板反馈，不污染模板。

## 汇报要求

汇报已实现页面、未实现范围、目录结构、组件来源、浏览器验证证据、review 结论和模板反馈建议；工具不可用时说明回退方案；模板规则冲突时说明以 `spec.md` 为准的处理结果。
