# 将 .agents/skills/ui-template 升级为自更新 Skill

- target: .agents/skills/ui-template
- mode: self-upgrade
- patch: 20260902-232854-self-upgrade
- risk: medium
- status: proposed

## Intent

按 skill-upgrader 标准 self-upgrade 结构，为 ui-template skill 补齐 examples/、evals/、experience/ 三目录，并在 SKILL.md 末尾追加 Self-evolution 注入段，使其具备经验积累、Eval 驱动验证与受控进化能力。不改变既有双工作流（Template Authoring / Template Apply）、触发条件、门禁与产出约束。

## Conflict check

- 注入段自带「不要为了自进化而破坏上文已规定的目标、流程、工具用法、输出与约束」约束，与既有双工作流无行为冲突。
- 注入段的 skill-evolver / skill-upgrader 分工与本环境职责一致。
- 仓库 AGENTS.md 指出 skills/ui-template/ 为通用 skill 单一源码；用户显式指定目标是 .agents/skills/ui-template/。本 patch 只触及显式指定目录，不改 skills/ui-template/，两者同步由用户决定。
- 目标目录无既有 examples/、evals/、experience/ 与 Self-evolution 段，无幂等冲突。

## Rationale

标准 self-upgrade：三目录为空骨架（不伪造历史案例）；evals/cases.yaml 的 10 条 cases 全部从现有 SKILL.md 的 MUST/禁止/门禁抽取，可独立判定；注入段原文来自 skill-upgrader references/skill-injection.md，仅将 <skill-dir> 替换为实际目录。

## Files

- .agents/skills/ui-template/SKILL.md — 末尾追加 Self-evolution 注入段
- .agents/skills/ui-template/examples/README.md — 新增（复制源模板）
- .agents/skills/ui-template/evals/README.md — 新增（复制源模板）
- .agents/skills/ui-template/evals/cases.yaml — 新增（10 条从原文抽取的确定性 Eval cases）
- .agents/skills/ui-template/experience/README.md — 新增（复制源模板）
- .agents/skills/ui-template/experience/failures/.gitkeep — 新增空目录占位
- .agents/skills/ui-template/experience/successes/.gitkeep — 新增空目录占位
- .agents/skills/ui-template/experience/patterns/.gitkeep — 新增空目录占位

## Validation

- 应用前：git apply --check --recount 通过；patch 仅触及上述 8 个文件
- 应用后：git diff --check 通过；SKILL.md frontmatter 完整且 name=ui-template 与目录一致；Self-evolution 段恰好一次；无 <skill-dir> 占位符残留；生产文件与暂存树 diff -r 一致；隐私检查通过
