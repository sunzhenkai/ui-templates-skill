# 将 skills/ui-template 同步升级为自更新 Skill

- target: skills/ui-template
- mode: self-upgrade
- patch: 20260902-233616-self-upgrade-sync
- risk: medium
- status: proposed

## Intent

将用户已在 .agents/skills/ui-template/ 批准并应用的同一份标准 self-upgrade 内容（examples/、evals/、experience/ 三目录与 SKILL.md 末尾 Self-evolution 注入段）同步到通用 skill 单一源码 skills/ui-template/，使两个副本保持一致。不改变既有双工作流行为。

## Conflict check

- 同步前核验：skills/ui-template/SKILL.md 与升级前的 .agents/skills/ui-template/SKILL.md 逐字节一致（diff -q 通过）。
- 目标目录无既有 examples/、evals/、experience/、patches/ 与 Self-evolution 段，无幂等冲突。
- 注入段自带「不破坏上文目标/流程/约束」约束，与既有内容无行为冲突。

## Rationale

AGENTS.md 规定 skills/ui-template/ 为通用 skill 单一源码；用户显式要求同步，且同步内容与已通过 medium 风险门禁并验证成功的 patch 20260902-232854-self-upgrade 完全一致。cases.yaml 10 条 cases 均从原文抽取，无新增发明。

## Files

- skills/ui-template/SKILL.md — 末尾追加 Self-evolution 注入段
- skills/ui-template/examples/README.md — 新增（与 .agents 副本一致）
- skills/ui-template/evals/README.md — 新增
- skills/ui-template/evals/cases.yaml — 新增（10 条确定性 cases）
- skills/ui-template/experience/README.md — 新增
- skills/ui-template/experience/failures/.gitkeep — 新增空目录占位
- skills/ui-template/experience/successes/.gitkeep — 新增空目录占位
- skills/ui-template/experience/patterns/.gitkeep — 新增空目录占位

## Validation

- 应用前：git apply --check --recount 通过；patch 仅触及上述 8 个文件
- 应用后：git diff --check 通过；frontmatter 完整且 name=ui-template；Self-evolution 段恰好一次；无 <skill-dir> 占位符残留；与 .agents/skills/ui-template 副本 diff -r 一致（排除 patches/ 与 references 差异面）；cases.yaml 解析通过；隐私检查通过
