# 干净模式：删除 → 重建 template → 重建 example web

适用：模板或 example web 已损坏/过期，或用户要求验证最新 Author/Apply skill 能从零复现整条链路。核心价值在于**先删后建**：删除保证生成阶段物理上无法参考以往文件。用户显式要求重删时以用户指令为准，不做“已存在即跳过”；幂等续跑条款只用于中断恢复。

## Step 0 — Intake 与事实收集（只读）

1. 确认模板名、输出根、需求源（见 SKILL.md 路由节）。读取 `skills/ui-template-author/SKILL.md` 与 `skills/ui-template-apply/SKILL.md`（本模式要按两者的现行 gate 执行，不能凭记忆）。
2. 收集后续校验与计划所需事实（本步只读）：
   - `git status --short`：记录删除清单内外的未提交变更；
   - 删除前证据：`ls` 目标路径、`templates/INDEX.md` 对应行、（web 存在时）其 `.ui-template-apply/checkpoint.yaml` 状态；
   - 模板身份：`manage_template_index.py resolve <name> --json` 或 validator 输出的 meta version + contract digest；catalog 是否有同名模板；
   - 模板 provenance：`meta.sources[].ref/revision/captured_at`（候选来源身份的一部分，进入计划「模板来源与重建路径」行；provenance 不是 session source，不得据此自行 clone 或读取路径）；
   - 输出现状：输出根是否存在、是否含应用源码、checkpoint 是否有效。
3. 用户陈述的现状与实际不符（如“web 已面目全非”但实际无应用源码）时如实记录，不阻塞、不虚构。

## Step 1 — 信息完整性校验与计划确认（共用 gate）

按 SKILL.md「信息完整性校验与计划确认」执行：跑完校验清单 → 输出固定格式执行计划 → 等待用户显式确认。本模式特别核对的项：

- 删除清单逐条路径（含 `templates/<name>`、输出根与历史 `web-v*/`）；清单内有未提交变更 → 待确认项；
- **template 来源（必为待确认项，不得代选）**：计划列出候选来源及其实际身份——catalog published 副本（version / contract digest / meta.sources 摘要）与/或用户本会话可提供的 session source——由用户显式选定。仅 catalog 可用时也要确认「领养 catalog 副本（含其来源身份）」这一决定本身，不得静默执行；用户要从源重建则必须给出 session source；
- greenfield 栈选择：用户请求或 prompts 已声明 → 记录来源；未声明 → 待确认项（十层闭集）；
- 需求源与 included/deferred/excluded 范围。

**Gate：计划未经用户确认，不得进入 Step 2 的任何删除。** 待确认项全部落定或被用户明示接受默认后才继续。

## Step 2 — 删除

**模板侧走 author 官方库动词**（`adopt` 对 INDEX 已有行会 `SEED_SKIPPED_EXISTS` 跳过复制，所以必须先 delete 移除行与目录，再重新领养）：

```bash
python3 skills/ui-template-author/runtime/manage_template_index.py retire <name> --reason "ui-template-test clean rebuild"
python3 skills/ui-template-author/runtime/manage_template_index.py delete <name>
```

`delete` 要求行先为 `retired`，成功后移除 INDEX 行并 `rmtree templates/<name>/`。

**web 侧**删除输出根及该模板的历史输出目录（含残留 `.ui-template-apply/`、`.ui-template-design/`、`node_modules`、构建产物）：

```bash
rm -rf -- example/<name>/web
rm -rf -- example/<name>/web-v*/   # 仅当存在历史版本目录
```

- 删除后 `find example/<name> templates/<name> -type f` 证明范围；剩余文件只允许是 `example/<name>/prompts/**`、`example/<name>/` 级配置（`.gitignore`、`.oxlintrc.json` 等）。
- `retire`/`delete` 任一步失败（如行不存在、状态非法）→ 停止并报告，不手工改 INDEX。
- 若 Intake 发现输出根存在**有效** `.ui-template-apply/checkpoint.yaml` 且用户意图是续跑而非重删 → Step 1 计划改为续跑（简版确认），不执行本步删除；用户显式要求重删时不适用此豁免。

## Step 3 — 重建 template（委托 ui-template-author）

按 `skills/ui-template-author/SKILL.md` 执行，二选一（以 Step 1 用户确认的来源为准，本步不重新决定来源）：

**路径 A：catalog 领养**——用户在计划确认中选定领养 catalog published 副本时执行。没有本会话 session source 时它是唯一合法的重建来源（author 禁止按 provenance 自行 clone 原仓库），但「就用 catalog」仍须经 Step 1 确认而非默认执行。

```bash
python3 skills/ui-template-author/runtime/manage_template_index.py adopt <name> --json
/tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate templates/<name> --kind package --json
```

- adopt 前核对 catalog 副本的实际身份（version / contract digest / meta.sources）与计划中用户确认的来源身份一致，不一致即停止报告；
- adopt 从 `skills/ui-template-author/catalog/<name>/` 字节一致复制到 `templates/<name>/` 并重写 published INDEX 行（Step 2 已 delete，行不存在，不会再触发 skip）；校验必须 `valid: true`、errors 为空；meta.sources 保持 catalog 原文，不改写；
- catalog 没有该模板 → 停止：向用户要 session source（走路径 B，重新过计划确认）或确认该模板尚未发布；
- **失败回滚**：validate 失败或 adopt 中途失败时，`rm -rf -- templates/<name>`；若 INDEX 行已写入，用 `retire` + `delete` 移除，恢复 Step 2 后（已删除）状态再出失败报告。

**路径 B：从源重建**——用户确认使用其本会话提供的可读 session source（仓库路径/设计文档/URL）时执行。走 author 完整 Generate → Validate（`--require-source-replay`）→ Eval → staging Index → Report；未冻结变更集合不得 Generate；任一 gate 失败停止，INDEX 由 staging gate 保证不变。

capture artifact 机制（确定性，先于 capture 运行）：literal graph 可位于显式 `--graph-root` 的受控 session/candidate artifact 目录；它以 canonical graph digest 与 source HEAD revision 共同绑定到 receipt。source checkout 只用于 `git rev-parse HEAD`，不得因 capture 被写入、暂存或提交。每次 graph 修改都重新 capture/replay 并更新 receipt；`--graph-root` 必须由本会话显式提供，不能从 provenance 推断。

## Step 4 — 重建 example web（委托 ui-template-apply）

输出根 = Step 2 删除的同一位置（现为空目录）。除本步命令外全部命令 cwd = 仓库根，apply 参数用显式相对路径。

1. **bootstrap Active Instance**（栈以 Step 1 计划确认结果为准；Step 2 已删除旧目录，陈旧的 `00-architecture.yaml`/`confirmed_by_user` 不存在，不存在“复用旧同意”通道）：

```bash
python3 skills/ui-template-apply/runtime/adopt_package.py \
  --package templates/<name> \
  --design-root example/<name>/web/.ui-template-design \
  --output-root example/<name>/web \
  --language typescript --ui-framework react --styling tailwind --component-system shadcn
python3 skills/ui-template-apply/runtime/check_active_instance.py validate example/<name>/web/.ui-template-design --kind active --json
```

（栈参数仅为示例写法；以计划确认的十层闭集为准。）

2. **Phase 0–9**：按 `skills/ui-template-apply/SKILL.md` 与其 `references/apply-workflow.md` 执行，状态写 `<output_root>/.ui-template-apply/`。关键 gate 提醒（细节以 apply skill 为准）：
   - Intake：`manage_template_index.py resolve <name>`；架构判定用 `python3 scripts/check_template_apply_state.py architecture-site <output_root>`；空输出根判 greenfield；`00-architecture.yaml` 需要 `confirmed_by_user: true` 与预声明 `build_identity`（依据即 Step 1 确认的栈）。
   - 需求源是 `example/<name>/prompts/README.md` 时，其功能范围 = included 范围（Step 1 已确认）；prompts 与模板 capability 冲突时按模板 capability 边界收敛并在报告记录。
   - Phase 8 必须有真实浏览器证据（无浏览器能力时停止请求运行方式，静态检查不替代）；Phase 9 通过且无 proposed feedback 才算会话 closed。
3. 每完成一个 phase 在测试报告记录，便于中断后续跑。
4. 执行顺序（判定器已知局限）：`architecture-site` 必须先于 `adopt_package` 运行——判定器跳过 `.git`/`.ui-template-apply` 但不跳过 `.ui-template-design/`，adopt 之后再判定会把 Active Instance 误报 `existing`。若 adopt 已发生，以删除前 find 证据 + `--explicit-greenfield` 处置并在报告偏差节说明。
5. 模板版本晋升后的重基序列（Impact-based Resume 全相位重开属预期，非故障）：按新契约更新 01-token-map / 02-routes / 04-components 的决策、`template_refs` 与 `pattern_refs` → 重算全部工件 digest → checkpoint `stable_ids` 并入新增 pattern/rule → 重绑 contract/template/binding digest 与 source_identity → Phase 8 证据全部重取后方可 complete。

## Step 5 — 回归与报告

```bash
make validate        # 或 /tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate templates/<name> --kind package --json
```

- `make test` / `make eval` 仅在 Step 3 走了路径 B（动过 author 语义）时必跑；路径 A 只要求模板 validator。
- 路径 B 契约收紧后的镜像与 pins 级联清单（逐项核对后再跑 `make test`，失败面几乎全部集中于此）：
  1. bundle 镜像同步：`skills/ui-template-author/runtime/` 下 `fixtures/eval/*.yaml`、`fixtures/repo-capture/source`、`evals/*.yaml`、`deterministic-baseline.json`、`contract_eval/runner.py`、`template_apply_state/*`、`template_authoring/*`、`shared_validate_design_system.py`，以及 `skills/ui-template-apply/runtime/` 同名镜像与 `evals/`；
  2. 测试 pins：`FIXED_REVISION` / `FIXED_CLOSURE_DIGEST`（fixture graph 变更后按测试 materialize 的同款 commit message/作者/日期重算）、eval `counts`/judges 计数、`test_contract_eval` 用例 id 注册表；
  3. eval 集合一致性：用例 `revision` 必须等于集合级 `revision`（否则 `EVAL_PARSE_FAILURE ... revision does not match collection`）；baseline 按.fixture 文件整体 sha 对账，新增用例必须登记，否则 `BASELINE_DIFF`。
- example web 自身的构建/lint/测试属 apply 产物质量，在 Step 4 内完成；root governance 不以 web 质量决定模板通过。
- 按 SKILL.md 报告模板输出（含「计划确认」行）；失败时给出阻断 gate 与 issue code，并如实申报 `templates/INDEX.md` 实际状态与已执行的回滚动作。
