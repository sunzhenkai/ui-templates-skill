Date: 2026-09-03
Kind: failure
Skill: ui-template-manager

## Context

用户反馈:通过导入流程生成的 UI 模板,在不同 agent 消费时产出的 UI 差异很大,细节问题多,整体稳定性差。用户要求整体 review 导入逻辑。

## What happened

- Review 发现导入产物以自然语言 prose 为主,缺少机器可读 token 与强制分级(MUST/SHOULD)。
- `workbench-shell` 的配色、字体等关键字段标注"来源未体现",未回填模板默认值,导致每次 apply 由消费方自行取值。
- 组件契约(骨架仅要求"每条一句话")与状态覆盖不足,hover/focus-visible/disabled 等细节在导入期大量留白。
- 质量门禁以 checklist 为主,无可执行校验脚本,agent 可自述通过。

## Lesson

导入阶段必须把"来源未体现"升级为显式默认值决策并落成机器可读 token,否则消费阶段的自由裁量必然导致 UI 漂移。此条暂记单次失败;若后续再次出现同类 apply 漂移证据,应提升为 `experience/patterns/` 并按 Self-evolution 流程提案修改通用 skill。
