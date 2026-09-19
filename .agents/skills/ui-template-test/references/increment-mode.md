# 增量模式：更新 template → 增量同步 example web

适用：template 已更新（或用户要求先更新），example web 需要跟上变更，但不值得整链重删重建。核心价值：**未声明的变更保持原字节**——只有受影响的 phase 重开，其余产物不动。

前提：模板侧变更已发生或将发生。纯页面实现诉求（模板没动）不归本模式，移交 `ui-template-apply`。

## Step 0 — Intake 与身份基线（只读）

1. 确认模板名、example web 输出根、更新类型（update-from-source / update-portable / update-from-feedback）。
2. 收集并**交叉核对**身份基线（本步只读）：
   - 模板 meta version + contract digest；
   - web 侧 `.ui-template-design/binding.yaml` 的 `contract_version` + `binding_digest`；
   - `.ui-template-apply/checkpoint.yaml` 是否存在及其 phase 状态。
   - 生成物入库基线：`git ls-files -- <output_root>` 是否命中（命中即待确认项，按 SKILL.md「生成物不入库」处置）；本模式新增/重写的文件一律保持未跟踪。

## Step 1 — 信息完整性校验与计划确认（共用 gate）

按 SKILL.md「信息完整性校验与计划确认」执行：跑完校验清单 → 输出固定格式执行计划（本模式删除清单为 none）→ 等待用户显式确认。本模式特别核对的项：

- **变更集合**：用户未说明模板改了哪些层（tokens？layout？patterns？page-types？rules？）→ 待确认项，确认时问清；
- **更新来源（必为待确认项，不得代选）**：更新类型与来源由用户显式确认——update-from-source 需用户本会话给出 session source（author 禁止按 meta.sources 自行 clone）；update-from-feedback 需指明 feedback 来源路径；update-portable 需说明改动依据。用户声称"已升级"但来源不明时按停止项处理，不替用户推断来源；
- **停止项**（核出即停止，不进计划）：用户声称的模板版本 ≠ `meta.yaml` 实际 version（模板侧并未真正走完 author 更新流程）；web 无有效 Active Instance 或无 `checkpoint.yaml`（增量无 resume 对象）；输出根陈旧混乱无法建立身份基线。

停止时向用户报告差异与可选路径。若用户随后要求转干净模式，注意干净模式会删除模板端并从 catalog 重播种——与“只动 web”类约束冲突，必须重新过干净模式自己的计划确认（含删除清单）；catalog 版本落后于本地模板时提示升级会被回滚的风险。

**Gate：计划未经用户确认，不得进入 Step 2 的任何写入。**

## Step 2 — 更新 template（委托 ui-template-author）

按 `skills/ui-template-author/SKILL.md` 对应库动词执行（from-source 需本会话 session source；feedback 更新先跑其 feedback discovery）。产出新 version + 新 contract digest，且模板 validator 通过；INDEX 行由 author 流程更新。任一 gate 失败即停止，模板与 web 都保持更新前状态。

用户声称“已升级”但 Step 0–1 查实模板未变 → 停止澄清：要么先补 author 更新流程，要么确认无需模板侧动作（则本模式无意义，转常规 Apply increment）。

## Step 3 — 重同步 Active Instance（委托 ui-template-apply 的 adopt 路径）

`adopt_package.py` 对已存在 design-root 是原子重同步：替换 `design-system.yaml`/`meta.yaml`/`core/`，按传入栈参数重写 `binding.yaml`。**逐字段取原 binding 的 `stack.*` 值**（`language`/`ui_framework`/`styling`/`component_system`，可选项同理），不要改项目栈选择：

```bash
python3 skills/ui-template-apply/runtime/adopt_package.py \
  --package templates/<name> \
  --design-root <output_root>/.ui-template-design \
  --output-root <output_root> \
  --language <binding.stack.language> --ui-framework <binding.stack.ui_framework> \
  --styling <binding.stack.styling> --component-system <binding.stack.component_system>
python3 skills/ui-template-apply/runtime/check_active_instance.py validate <output_root>/.ui-template-design --kind active --json
```

- 校验必须通过且 `contract_version` 已是新版本。校验失败 → 停止；此时 web 侧仍是旧 core，报告并等用户决策（回滚模板侧未提交变更，或转干净模式需重新确认删除范围）。
- 用户明确要求连项目栈一起换（binding change）→ 按 apply 的 binding ownership 规则处理，需用户显式确认变更集合；本 skill 不静默换栈。

## Step 4 — Impact-based Resume（委托 ui-template-apply）

```bash
python3 skills/ui-template-apply/runtime/check_apply_resume.py <output_root>/.ui-template-apply/checkpoint.yaml \
  --design-root <output_root>/.ui-template-design --json
```

按其结论从最早失效 phase 重开（典型映射，最终以 apply skill 与 resume 输出为准）：

- template identity/digest 变化 → 最早 Phase 0（scope/coverage 重新确认）
- token 语义变化 → 最早 Phase 1（token map/local rules 复核）
- layout 语义（scroll owner、chrome、responsive）变化 → 最早 Phase 2，Phase 8 相关证据过期
- patterns/page-types 变化 → 最早 Phase 2（pattern 闭包与 placement plan 复核）；涉及组件语义时连带 Phase 4
- geometry/state 语义变化 → 最早 Phase 4
- 仅内容实现层面变化 → 对应实现 phase

重开范围内更新 `.ui-template-apply/` 工件并重实现受影响页面/组件；**变更集合未覆盖的路径保持原字节**（Step 1 计划中已确认的范围），不以“顺手美化”重写无关页面。重开产生的新文件同样保持未跟踪：全程不执行 `git add`/`git commit`，完成后按 clean-mode Step 4 第 6 条核对 `git status` 并记入报告「生成物入库」行。

## Step 5 — 复验与报告

- Phase 8：所有受影响 scenario 重新产生 current-build 浏览器证据；过期证据不得复用。
- Phase 9：recheck 记录引用 Phase 8 UUID；feedback inbox 无 proposed 才算 closed。
- 回归：模板 validator + web 自身 build/lint/test；报告按 SKILL.md 模板（含「计划确认」与「生成物入库」行），额外列出：本次变更集合 → 受影响 phase → 实际改动文件清单 → 保持原字节的范围声明。
