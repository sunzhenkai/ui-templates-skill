# manager 对齐确定化模板契约并去特例化

- target: .agents/skills/ui-template-manager
- mode: update
- patch: 20260903-095925-align-deterministic-template-contract
- risk: medium
- status: proposed

## Intent

让 manager 薄封装与刚更新的通用源码（skills/ui-template/，见 Patch A）保持一致：

1. 阅读清单补齐 `source-doc.md`、`tokens.yaml` 与「归一与决策」阶段。
2. 本仓库模板约定改为：必备 `spec.md`（开篇 Non-negotiables）+ `tokens.yaml`（精确值唯一载体，缺口回填 `origin: default`）+ `meta.yaml`。
3. `apply/` 只允许实施顺序与验收引用;目录契约、API/data 分层、stack adapter、业务域名禁止进入模板。
4. 移除生产正文中以具体模板名（如 workbench-shell）为例的特例化描述，改为通用占位。
5. 同步更新 manager evals 中受影响的契约表述并新增确定性 case。

非目标：不修改 `skills/ui-template/`（已由 Patch A 完成）；不迁移现有模板；不改 self-evolution 结构与历史 patches/。

## Conflict check

- manager 规则要求通用流程改动落在 `skills/ui-template/`——Patch A 已完成；本 patch 只做本仓库特有约定的对齐，不重复通用流程。
- 历史经验条目 `experience/failures/20260903-apply-instability.md` 中出现的具体模板名是真实事件审计记录，不属于「生产正文特例化描述」，按 Experience 纪律保留不改。

## Rationale

manager 是本仓库 `templates/` 的治理入口;若不同步新契约，消费 agent 会从 manager 读到旧的 `implementation/` + stack adapter 约定，与通用源码冲突，继续产生 UI 漂移与工程结构污染。

## Files

- `.agents/skills/ui-template-manager/SKILL.md` — 阅读清单、模板结构约定、复用入口、去特例化。
- `.agents/skills/ui-template-manager/evals/cases.yaml` — 契约表述对齐 + 新增 tokens/禁入内容 case。

## Validation

- 应用前：`git apply --check --recount` 通过。
- 应用后：`git diff --check` 通过；`cases.yaml` YAML 解析且 id 唯一；grep 确认 SKILL.md 无具体模板名特例；frontmatter `name` 不变。
