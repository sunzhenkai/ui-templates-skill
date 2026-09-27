# 将 ui-template-manager 升级为自进化 Skill

- target: .agents/skills/ui-template-manager
- mode: self-upgrade
- patch: 20260903-092845-self-evolution-upgrade
- risk: medium
- status: proposed

## Intent

为 `ui-template-manager` 建立自进化结构：新增 `examples/`、`evals/`、`experience/`（含 `failures/`、`successes/`、`patterns/`），并在 `SKILL.md` 末尾追加标准 Self-evolution 段落。目标是让该 Skill 能从真实执行中积累经验、以 Eval 驱动验证，并在满足证据门槛后才修改生产正文。

非目标：不修改通用 skill `skills/ui-template/` 的流程与格式；不重写 manager 的既有薄封装行为；不伪造任何示例或历史经验。

## Conflict check

- manager 约定自身为薄封装，因此 `evals/cases.yaml` 只从 manager 自身 `SKILL.md` 抽取（templates/ 目录与索引约定、`spec.md` 唯一入口、简体中文约定、薄封装边界、安全约束、复用边界），不复制通用 skill 的 Authoring/Apply 流程。
- 通用 skill `skills/ui-template/` 已有独立的自进化目录；本改动新增的是 manager 自身的目录，互不覆盖。
- 注入段落来自 `skill-upgrader` 的 `skill-injection.md` 模板，仅替换 `<skill-dir>` 为 `.agents/skills/ui-template-manager/`，不与既有门禁冲突。

## Rationale

目标 Skill 目前只有 `SKILL.md`，无 examples/evals/experience，也没有 Self-evolution 段落，无法积累真实执行经验，也无法用确定性标准验证输出。用户明确要求升级为自进化 Skill；标准结构升级符合 `skill-upgrader` 的 self-upgrade 协议，且不改变现有触发条件与工作流。

## Files

- `.agents/skills/ui-template-manager/SKILL.md` — 末尾追加 Self-evolution 段落。
- `.agents/skills/ui-template-manager/examples/README.md` — 案例写入约定（无真实案例，不编造条目）。
- `.agents/skills/ui-template-manager/evals/README.md` — Eval 使用说明。
- `.agents/skills/ui-template-manager/evals/cases.yaml` — 从现有正文抽取的可验证 cases。
- `.agents/skills/ui-template-manager/experience/README.md` — Experience 写入约定。
- `.agents/skills/ui-template-manager/experience/failures/.gitkeep`、`successes/.gitkeep`、`patterns/.gitkeep` — 空目录占位。

## Validation

- 应用前：`git apply --check --recount` 通过。
- 应用后：`git diff --check` 通过；frontmatter 的 `name` 仍为 `ui-template-manager`；注入段中的目录树指向 `.agents/skills/ui-template-manager/`；`evals/cases.yaml` 可被 YAML 解析且 case 覆盖 basic/core/failure/boundary；无隐私泄露；未改动 `skills/ui-template/` 与历史 `patches/`。
