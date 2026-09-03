# 模板产物确定化与设计/实施解耦

- target: skills/ui-template
- mode: update
- patch: 20260903-095441-deterministic-template-contract
- risk: medium
- status: proposed

## Intent

把本轮 review 得出的稳定性方案落进通用 skill：

1. 每个模板必备机器可读的 `tokens.yaml`，所有精确值带 `origin`（source/computed/estimated/default），关键字段禁止留空，缺口回填模板默认值。
2. Authoring 新增「归一与决策（Normalize & Decide）」阶段：归档、缺口回填、状态补全、对比度预检、coverage 记录。
3. `spec.md` 增加 Non-negotiables（≤20 条 MUST）与 SHOULD/MAY 分级；组件要求从“一句话”升级为契约表。
4. 设计层与工程实施层解耦：`implementation/` 收窄为 `apply/`（仅实施顺序与验收引用）；目录契约、API/data 分层、stack adapter、业务域名禁止进入模板。
5. 新增 `doc`（设计文档）来源类型，避免纯设计文档被当作 repo 空转后留下缺口。
6. Apply 增加 token freeze：项目 token 逐项映射自 `tokens.yaml`，新增值须显式批准。
7. 移除生产正文中的特例化描述（如具体模板名）。

非目标：不修改 `templates/` 下现有模板内容（后续单独迁移）；不新增校验脚本；不改 self-evolution 结构。

## Conflict check

- manager 自身约定“改通用流程必须改 skills/ui-template/ 单一源码”，因此本 patch 先更新通用源码；manager 对齐由后续独立 patch 完成。
- 与现有 `spec.md` 唯一入口原则不冲突：`spec.md` 仍是设计规则唯一入口，`tokens.yaml` 只是精确值的机器可读载体。
- 与 Apply 十阶段不冲突：Phase 3（Code structure）仍存在，但明确为“目标项目现场决策”，模板不再预置结构。

## Rationale

多次 apply 出现 UI 漂移的根因是：导入产物以 prose 为主、关键字段留空、组件契约过浅、工程结构混入模板、验收无机器可读 expected 值。上述改动把自由裁量收敛为带 origin 的确定值，并把模板职责收窄为设计规则，可直接验证（文件存在性、字段完整性、禁入内容清单、eval cases）。

## Files

- `skills/ui-template/SKILL.md` — 核心原则、Workflow A 新增归一与决策阶段、结构改为 tokens.yaml + apply/、Workflow B 必读与 token 冻结、去特例化。
- `skills/ui-template/references/spec-format.md` — Non-negotiables 骨架、tokens.yaml 定义、meta.yaml coverage、implementation/ 收窄为 apply/、组件契约表。
- `skills/ui-template/references/source-web.md` — 多页/双主题/交互状态采集、归档输出。
- `skills/ui-template/references/source-repo.md` — 来源形态门禁与 origin 标注。
- `skills/ui-template/references/source-doc.md` — 新增设计文档来源指南。
- `skills/ui-template/references/apply-workflow.md` — 阅读范围、token freeze、Phase 3 现场决策、反馈闭环边界。
- `skills/ui-template/references/toolchain.md` — token 来源改为 tokens.yaml。
- `skills/ui-template/evals/cases.yaml` — 更新受影响 case 并新增确定性验收。

## Validation

- 应用前：`git apply --check --recount` 通过。
- 应用后：`git diff --check` 通过；`cases.yaml` 可被 YAML 解析且 id 唯一；grep 确认生产正文无具体模板名特例；grep 确认 `implementation/`、`stack adapter` 旧约定已按新边界改写。
