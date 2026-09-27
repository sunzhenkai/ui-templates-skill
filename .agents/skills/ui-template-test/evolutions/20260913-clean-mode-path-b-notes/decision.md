# Decision — 20260913-clean-mode-path-b-notes

- 结论: promote
- 日期: 2026-09-13
- 原因: Proposal 与候选 diff 经用户确认；eval 四项全 pass（回归/模式规避/自带 evals 走查/副作用）。
  四类路径 B 确定性机制（capture-graph commit、architecture-site 判定顺序、模板重基序列、镜像与 pins
  级联清单）在本会话两次 clean run 中均实际发生且有可复现证据，固化后可消除整轮诊断试错。
- 变更范围: 仅 references/clean-mode.md（+8 行）；SKILL.md 与触发/gate 无改动。
- 晋升动作: 候选 references/clean-mode.md 覆盖生产稿。本 skill 为仓库内手管目录，无 sync 脚本。
