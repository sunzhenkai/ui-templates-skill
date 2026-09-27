---
name: ui-template-test
description: 本仓库的模板端到端测试闭环编排。干净模式：删除指定 template 与对应 example web，基于最新 ui-template-author 重建 template，再基于最新 ui-template-apply 重建 example web，全程不参考以往文件。增量模式：更新 template 后按 Impact-based Resume 增量同步 example web。当用户要求“重新导入/重建/从源重做模板”“删除后重新生成 example web”“端到端重测某个模板”“更新模板后同步/更新 example web”“验证最新 skill 闭环是否还走得通”时，必须使用本 skill。只重建 template 不做 web、或只做页面不重建模板、或常规消费项目 Apply，不属于本 skill，直接移交对应生产 skill。
metadata:
  internal: true
---

# ui-template-test

本 skill 是 repository-only 测试编排器：验证「最新 Author/Apply skill → template → example web」整条链路在当前仓库仍然走得通。它只拥有**顺序编排、删除范围、门禁判定和测试报告**；模板创建/更新/校验语义归 `skills/ui-template-author`，页面实现归 `skills/ui-template-apply`，项目级 Design System 归 `skills/ui-template-design`。不得在本 skill 内复制这三个 skill 的阶段定义、schema 字段或 checker 实现；执行时读取对应生产 SKILL.md 并按其 gate 走。本 skill 不进公开 bundle。

## 路由

| 用户意图 | 模式 |
| --- | --- |
| 删除 template 与 example web 后从源/最新 skill 重建两端；“重新导入模板再生成 example web”；端到端重测 | 干净模式 → [references/clean-mode.md](references/clean-mode.md) |
| 已更新（或要求更新）template，要求 example web 跟上变更 | 增量模式 → [references/increment-mode.md](references/increment-mode.md) |
| 只想确认模板/链路健康（validate、查看 digest），明确不删除不重建 | 不进入本 skill 两模式 → 直接运行模板 validator 并报告结果 |
| “用模板做页面/搭后台”（不涉及重建模板） | 不用本 skill → `ui-template-apply` |
| “做成模板/提取风格/退役/删除模板”（不涉及 example web） | 不用本 skill → `ui-template-author` |

本 skill 只在请求**同时涉及模板生命周期与 example web 两端**时进入两模式；本仓库内的口语“新项目”“搭个页面”不构成触发。模板更新后的 web 同步归本 skill 增量模式（以“模板侧变更已发生或将发生”为前提）；纯页面实现诉求仍归 `ui-template-apply`。

两个模式共同的前置 Intake：确认**模板名**（当前库中的实际行，不猜测）、**example web 输出根**（默认 `example/<name>/web`；`example/<name>/prompts/` 内有明确位置约定时以其为准——「web-v{n}」这类未定值不构成明确约定，按默认 `web` 执行并在报告偏差节记录）、**需求源**（`example/<name>/prompts/README.md` 存在时是功能范围唯一来源；不存在时向用户索要范围）、**模板重建来源**（请求含「重新导入/从源重建」等模板侧 rebuild 语义时为必答项：候选来源身份与 session source 在计划确认中由用户显式选定，见下方用户决策项，不得按可用性默认代选）。模板名对不上 `templates/INDEX.md` 或 catalog 时停止并报告，不猜名。

## 信息完整性校验与计划确认（两模式共用 gate）

任何删除或写入之前必须先过这一关；确认前只允许只读收集（`ls`/`find`/`cat`/`git status`/`git ls-files`/`resolve`/validator `--json`），不得执行 `retire`/`delete`/`adopt`/`rm` 或写任何文件。

**信息完整性校验**——按三类处置，结论写入计划：

1. 仓库事实（自动核验，缺了就地补全）：模板 INDEX 行与状态、meta version + contract digest、catalog 是否有同名模板、输出根现状（是否存在/是否有有效 checkpoint）、需求源文件存在性、git 工作区状态、删除清单内未提交变更、输出根是否已被 git 跟踪（`git ls-files` 命中即待确认项）以及根 `.gitignore` 是否忽略输出根。
2. 用户决策项（列入计划「待确认项」，确认时一次性解决；一律由用户显式选择，skill 不得按可用性默认代选）：**template 来源**——干净模式为重建来源（catalog published 副本领养 vs 用户本会话提供 session source 从源重建），计划必须列出各候选的实际来源身份（version / contract digest / meta.sources 摘要）；增量模式为更新类型与来源（update-from-source / update-portable / update-from-feedback 及对应 session source 或 feedback 路径）。此外还有：功能范围（无 prompts 时）、greenfield 栈选择（十层闭集）、增量变更集合（用户未说明改了哪些层时）。
3. 停止项（无法通过确认解决即停止，不进计划）：模板名对不上 INDEX 与 catalog、用户声称版本 ≠ meta 实际版本、web 无有效 Active Instance/checkpoint 而请求增量同步。

**计划确认**——校验完成后向用户展示固定格式计划并等待显式确认：

```markdown
# ui-template-test 执行计划
- mode: clean | increment | resume（续跑起点 phase）
- template: <name>（INDEX 状态、meta version、contract digest）
- 模板来源与重建路径: <路径 A catalog 领养（version / contract digest / meta.sources 摘要）| 路径 B 从源重建（session source 与 revision）；必须为用户已选定项>
- 信息完整性: 全绿 / 待确认项: <逐条>
- 删除清单: <精确路径逐条；无删除写 none>
- 执行序列: <步骤摘要 + 关键命令 + 每步 gate 与失败行为>
- 需求源与范围: <prompts/README.md 或用户给定；included/deferred/excluded>
- 栈选择: <十层闭集及来源；待确认则标注>
- 回滚方式: <每步失败后如何恢复到执行前状态>
```

用户显式确认后才进入执行；待确认项必须全部落定或被用户明示接受默认。用户修改了影响删除清单或范围的决策时，更新计划重新确认一次。中断续跑同样先出简版计划（起点 phase、将重做的范围、不触碰的路径），确认后续跑。计划与确认结论记入测试报告「计划确认」行。

## 通用不变量

- **删除是破坏性动作，先证后删**：删除前列出目标路径清单并核对与请求一致（`templates/<name>/`、`example/<name>/web` 与 `example/<name>/web-v*/` 及其残留 `.ui-template-apply/`、`.ui-template-design/`、构建产物），且必须已通过「计划确认」gate。工作区 git 状态脏（有未提交变更落在删除清单内）时列入计划待确认项，获得用户确认后才可执行。模板名不匹配 `^[a-z0-9][a-z0-9-]*$` 时停止，不把未核对的字符串拼进删除命令；删除一律 `rm -rf -- <path>` 形式。
- **用户显式指令优先于幂等恢复**：幂等条款只服务中断续跑；用户明确要求“删掉重建”时先删后建，不做“已存在即跳过”。
- **声称与现实不符即停止**：用户声称的模板版本与 `meta.yaml` 实际 version 不符、或 web 侧 Active Instance 与模板版本关系不明时，停止并报告差异，不做任何修改。
- **来源必须显式确认，不得代选**：重建/更新 template 的来源路径与来源身份（catalog 副本的 version / contract digest / meta.sources，或本会话 session source）由用户在计划确认中显式选定；只剩一个可用来源时同样要确认「就用它」这一决定，不得默认执行。author 阶段写入或引用的一切来源信息（meta.sources、领养身份、replay 绑定）以已确认的来源为准，skill 不得虚构、改写或静默替换来源身份。
- **陈旧工件不可作确认依据**：无有效 `checkpoint.yaml` 的残留 `.ui-template-apply/` 工件（含旧 `00-architecture.yaml` 的 `confirmed_by_user`）一律视为过期输入，不读取、不引用、不复用其栈确认。
- **source-blind 可被验证**：干净模式先删后建，生成阶段禁止读取旧 web、历史生成物、原版 checkout、`meta.sources[]` 指向的路径或 `example/**` 其他内容。删除动作本身就是“不参考以往文件”的保障，不得为了“参考一下旧实现”跳过或延后删除。
- **gate 失败即停**：模板侧 Authoring 任一 gate（Validate/Eval/Index）失败、Apply 任一 phase 失败，立即停止并出失败报告；不得宣称完成、不得继续后续步骤；已写入的 INDEX/目录按对应 reference 的回滚步骤恢复到删除前状态。
- **生产正文只读**：不修改 `skills/**`、catalog 只读、不改 `.agents/skills/` 下其他 skill、不改 `openspec/changes/archive/**` 与 immutable history；`example/**` 与 `docs/**` 是治理排除项，root governance 不以其质量决定发布。
- **固定环境命令**：治理命令使用 `/tmp/ui-template-governance-venv/bin/python`（缺失时先 `make bootstrap`）；validator 是 `scripts/validate_design_system.py validate <pkg> --kind package --json`。
- **幂等续跑（中断恢复）**：非用户显式重删的场景下，每步执行前先检查该步产物是否已存在且通过校验（template 目录 + validator 通过 → 跳过重建；输出根存在有效 checkpoint → 走 Apply 的 Impact-based Resume 续跑），从最近有效状态继续；续跑同样先过「计划确认」的简版流程。
- **生成物不入库**：example web（输出根及其全部内容，含 `.ui-template-apply/`、`.ui-template-design/`、构建产物与历史 `web-v*/`）是一次性测试生成物，本 skill 全程不执行 `git add`/`git commit`/`git push`，生成物保持未跟踪或被忽略状态（根 `.gitignore` 已忽略 `example/*/web/` 与 `example/*/web-v*/`）。输出根已被 git 跟踪、或 `.gitignore` 未覆盖输出根时列入计划待确认项；核对结果写入报告「生成物入库」行。`example/<name>/prompts/` 与 example 级配置不属生成物，仍按原状入库，不在本条约束内。
- **产物归属**：模板只写 `templates/<name>/`；web 及其 `.ui-template-apply/`、`.ui-template-design/` 只写 `example/<name>/` 下约定输出根。不自动 publish、tag、archive 或 promote；catalog replacement 需用户单独确认。

## 测试报告

结束后输出固定结构（成功与失败都用它）：

```markdown
# ui-template-test 报告
- mode: clean | increment
- 计划确认: <已确认（待确认项落定结果） | validate-only 未进两模式>
- template: <name>@<version>, contract digest <sha>, validator: pass/fail
- example web: <output_root>, apply phases completed: 0–9（列未完成项）, Phase 8 evidence: <n> records
- 生成物入库: <未提交（untracked/ignored）| 异常: <被跟踪/被暂存路径逐条>>
- 删除清单（clean 模式）: <paths>
- 委托执行: <实际读取并执行的各生产 skill 文件>
- 回归: <make validate / make test 结果；模板 validator 结果>
- 偏差与未决: <none 或列表>
```

任一 gate 失败时，报告阻断 gate 名称与稳定 issue code，声明 INDEX/production 未被改动（或已回滚）。
