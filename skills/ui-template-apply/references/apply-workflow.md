# Active Instance Apply Phase 0–9 与状态产物

执行前读取 `active-implementation.md`；schema v2 `template-contract.md` 仅用于显式迁移读取。阶段不可跳过；阶段不可跳过；“有页面文件/任务打勾”不等于完成，checkpoint 中 complete 必须由存在且 digest 匹配的 artifact 和证据支撑。

## 目录

1. Active truth 与 apply mode
2. 标准目录
3. Phase 0 — Intake
4. Phase 1 — Design direction & token freeze
5. Phase 2 — IA/layout/routes
6. Phase 3 — Project structure
7. Phase 4 — Component inventory
8. Phase 5–7 — 实现进度
9. Phase 8 — Browser verification
10. Phase 9 — Review & feedback
11. checkpoint 与身份
12. 恢复：从最早失效 phase 重新打开
13. Feedback：UUID + normalized fingerprint

## Active truth 与 apply mode

Intake 只消费 `.ui-template-design/design-system.yaml`、`core/`、`binding.yaml`。必须声明 `mode: bootstrap | increment` 并运行统一 validator：

```bash
python3 skills/ui-template-apply/runtime/check_active_instance.py validate .ui-template-design --kind active --json
```

安装态使用 `runtime/shared_validate_design_system.py`；禁止把 discovery wrapper 写入 `UI_DESIGN_SYSTEM_VALIDATOR`（`VALIDATOR_SELF_INVOCATION`）。

- increment：缺失、未知 schema、capability 不足、contract/binding/projection digest 失配都停止。
- bootstrap：可从 published frozen package adopt-only 复制 core 并生成 binding；不得改 package identity、stable IDs 或 core 值。
- 旧 schema v2 template 和 `design-freeze/v1` 是 migration source，不是可直接实施输入。

digest 算法为 `sha256-canonical-json-v1`。

## 标准目录

所有消费项目状态固定在项目根 `.ui-template-apply/`：

```text
.ui-template-apply/
├── checkpoint.yaml
├── 00-intake.md
├── 00-architecture.yaml
├── 01-design-direction.md
├── 01-token-map.yaml
├── 02-routes.yaml
├── 03-structure.md
├── 04-components.yaml
├── 05-07-progress.yaml
├── 08-verification.json
├── evidence/
├── 09-review.md
└── feedback/
```

不得把这些消费项目工程决定回写模板。每个 artifact 都登记在 checkpoint 对应 phase 的 `artifacts[]`，digest 算法为 `sha256-canonical-json-v1`；YAML/JSON 安全解析后 canonicalize，Markdown 以换行归一后的文本 envelope canonicalize。

**产物写时纪律（写完即跑 `artifact-lint`，不要等 checkpoint 门禁才暴露）**：

```bash
python3 skills/ui-template-apply/runtime/check_template_apply_state.py artifact-lint <apply-root>/02-routes.yaml
```

1. YAML flow 序列（`[...]`、`{...}`）内的中文或含 `? : @ ,` 的条目一律加引号：`entry_points: ["快捷键帮助(?)", "各页对话框"]`；裸量会直接解析失败。
2. 时间戳一律写成带引号字符串（`created_at: '2026-09-20T00:00:00Z'`）；裸日期（`2026-09-20`）会被 YAML 解析为 date 对象，无法 canonical JSON 编码。
3. digest 字段（`template_digest`/`binding_digest` 等）必须是 `{algorithm: sha256-canonical-json-v1, value: <sha256>}` 对象，不得写成 `git:...` 之类的身份字符串（身份字符串属于 `source_identity`/`build_identity`）。
4. 单键值不要写 `key: -`（会被当作块序列标记）；空值写 `""` 或省略。

## Phase 0 — Intake（`00-intake.md`）

1. 模板解析：先运行 `ui-template-author/runtime/manage_template_index.py resolve <name>`（`require-published` 默认不播种）。项目 `published` 行 `origin=project`；项目 `retired` 停止且不得救回；项目没有该行时只读兄弟目录 `ui-template-author/catalog/` 并 pin，`origin=catalog`，不得创建项目 `templates/`。仅当项目库与 catalog 都没有该 published 模板时停止并移交 Authoring。
2. 记录 `00-intake.md`：模板 name/version/digest/`origin`/`resolved_path`、平台、成功流程，以及 `included/deferred/excluded` 范围。
3. 架构判定：判定对象是本次前端**输出根**（将写入应用源码的目录），不是仓库根或兄弟应用；先运行 `architecture-site <output-root>`。会话状态目录（`.ui-template-apply` 账本、`.ui-template-design` Active Instance）不是应用源码，不参与判定——adopt-only bootstrap 先落 Active Instance 后输出根仍是 greenfield。
   - `greenfield`：输出根不存在、为空、只有空子目录或 git 占位，或用户要求从零搭建。必须写出 `00-architecture.yaml`（含相对项目根的 `output_root`）并经用户确认闭集层（language、UI framework、bundler、routing、styling、state、data、unit/browser、package manager、repo shape），未确认不得写应用源码，不得把任何栈写成 Apply 默认。仓库已初始化但输出根仍是新应用时仍是 `greenfield`，必须停下选型。
   - 兄弟应用、workspace 约定或功能规格里的技术提及只可作为候选，不得当作确认；`project-init` 仅在用户明确要脚手架且所选栈落在其 reference 时作为确认后执行器。
   - `existing`：仅在该输出根已有依赖清单或实质源码时成立，只记录观察到的栈。
4. coverage 决定：对 defaulted/unsupported 项逐项作 accepted/deferred/excluded 决定。
5. `fidelity.yaml` 检测：structural 记录 profile/conformance/scope/canonical digest 与 unresolved decisions；无 sidecar 明确 `structural fidelity unavailable`（legacy-baseline）；style-only 明确未提供 layout/geometry/state；未知 profile 停止。checkpoint `template.digest` 必须绑定 `{template: meta, fidelity: profile}` 的 canonical digest；有 sidecar 但缺该绑定不得进入 Phase 5。
6. Gate：schema/origin/checker 通过，范围与非目标经确认。不得把原版源码或已有生成物写入 intake 作为实现输入；生成物落到本次约定的空目录或当前输出目录，不得参考已有生成物。用户要求对齐原版时仍只消费 Active Instance，并把对照需求移交模板认证链路（见 [source-blind-boundary.md](source-blind-boundary.md)）；不得读取原版或记录 oracle 实现输入。

`00-architecture.yaml` 使用 `architecture.schema.json`：必填 `output_root`（相对消费项目根，禁止 `..`）；`site` 为 `greenfield | existing` 且必须与对该输出根的探测一致——bootstrap 实现落地后探测翻转为 `existing` 是本次会话的预期结果，checkpoint 在 `confirmed_by_user: true` 且任一 Phase ≥5 complete 时不再报 `ARCHITECTURE_SITE_MISMATCH`，不要回改 Phase 0 产物。`layers` 固定 11 键，不得追加 `notes` 等扩展键，`observed_constraints`/`init_command` 是字符串不是列表：

```yaml
schema_version: 2
site: greenfield
output_root: apps/agent-web
confirmed_by_user: true
build_identity: build:<sha>
layers: {language: typescript, ui_framework: react, bundler: vite, routing: react-router, styling: tailwind, state: zustand, data: tanstack-query, unit_test: vitest, browser: playwright, package_manager: pnpm, repo_shape: monorepo-app}
```

greenfield 必须有 `confirmed_by_user: true` 与预声明 `build_identity`，可记录拟用 `init_command` 与 `observed_constraints`；existing 必须记录 `observed_stack`。greenfield 未确认前只允许写 `.ui-template-apply/`，不得写依赖清单、工程配置或应用源码；后续任何 phase 不得 complete。

## Phase 1 — Design direction & token freeze

- `01-design-direction.md`：mood、anti-pattern、主题、密度、边界/动效及外部查询记录；还必须记录页面单一职责、design thesis、信息词汇表、安静元素、模板兼容的视觉重点、禁止的默认套路和实现前自我批判。`frontend-design` 只提供 two-pass brainstorm、anti-default critique 与表达取舍；缺工具时手写同等字段。
- `01-token-map.yaml`：`schema_version: 2`、template/token digest、每个 template token 到项目 token 的映射；偏离含 rule ID、理由、确认。同时定义 `design_rules[]`，每条必须有 `id`、`kind: style | information | placement`、decision、适用 route/component、`token_paths[]`、`template_rule_ids[]`、候选方案与理由；用户确认的偏离必须记录 confirmation。IDs 使用闭集 `LOCAL-STYLE-###`、`LOCAL-INFORMATION-###`、`LOCAL-PLACEMENT-###`。
- style rule 把同一 semantic role（如 primary action、secondary action、status、metadata、input、data cell）绑定到一致 typography、color、spacing、radius、border、shadow、density 和状态 treatment；information rule 记录信息该由什么语义 primitive 承载；placement rule 记录任务组、主要信息/动作和阅读/焦点顺序。这些是会话内 local rules，不得写入模板、不得作为 feedback target。

Gate：Phase 0 architecture 已确认且当前 styling 层仍一致；所有可消费 token 已映射，无未解释 arbitrary value；主题角色/状态完整；三类 local design rules 可解析且不与模板 `spec.md`、`tokens.yaml`、`fidelity.yaml` 或已确认 design freeze 冲突。不得从 prose 重演精确值。

## Phase 2 — IA/layout/routes（`02-routes.yaml`）

记录 route、页面模式、入口/主要动作、URL params、`layout_ref`、`page_type`、`pattern_refs`、`scroll_owner`、`structural_verification`、响应式矩阵及无效状态；跨页目的地为 link。机器形状硬约束（由 checkpoint 路由闭合校验强制）：`structural_verification` 只接受字面量 `available | unavailable`，写 prose 即 `PLACEMENT_VERIFICATION_AVAILABILITY_INVALID`；`scroll_owner` 是**单字符串**且精确等于绑定 layout placement 的 scroll domain owner region id，多窗格滚动用 `multi_pane: true` 表达、不得写成列表（类型或悬空均报 `SCROLL_OWNER_UNTRACE`）；绑定 layout 有多于一个 scroll domain owner 时 route 必须 `multi_pane: true` 且页面根 overflow-hidden 分窗格滚动（`MULTI_PANE_ROOT_REQUIRED`）；`placement_plan.template_refs` 必填且解析到模板 stable ID（`PLACEMENT_TEMPLATE_TRACE_MISSING`/`PLACEMENT_TEMPLATE_REF_DANGLING`）。每个 included route 必须有 `placement_plan`：页面单一职责、主要信息、主要动作、信息分组、阅读/焦点顺序、动作顺序和响应式降级位置，并引用相关 `LOCAL-PLACEMENT-###`。结构化 placement 可用时，`layout_ref`、Pattern closure、relation/order、scroll owner 和 responsive mode 必须与 Active Instance topology 闭合；**topology 的嵌套关系同样是硬约束**：placement regions 的 `parent` / `contains` 树（如 inset 壳里 `page-header`、`page-toolbar` 嵌套于 `page-canvas`）必须按嵌套实现——header 属于哪张卡是采集事实，不是 Apply 的自由决定；regions 全部平级时才允许平级实现。不要求目标 DOM 或技术栈同构。无结构化 fidelity/topology 时 `structural_verification` 必须写 `unavailable`，不得把 prose slots/breakpoints 升格为 shell variant、ordered chrome slots、scroll owner 或 topology 约束。Gate：每个 included route 与该模板 `coverage.page_modes` 有确定映射；`pattern_refs` 全部存在且属于绑定 Page Type；placement plan 的主要信息/动作和分组可追溯到页面职责；已声明的 wrap/scroll record 不得被根滚动或自动换行替代。placement plan 的每条**布局形态决策**（页面 full-bleed/通栏、内容卡片化、浮层归属、二级导航位置、chrome 分隔方式等）SHALL 携带 `template_refs` 并解析到模板 placement geometry、rule 或 pattern 的稳定 ID；模板对该语义沉默而 Apply 欲自行决定时，该决策进入 unresolved 并停止等待用户裁决，SHALL NOT 以 local rule 静默补位；**给侧栏、分隔或 chrome 追加模板未声明的 border/ring 同样是布局形态决策**，fidelity 的 negative facts（如 `nav-group` border `none`）必须按无装饰实现，组件库默认边框不得覆盖；路由闭合校验对缺失或悬空的 `template_refs` 分别报 `PLACEMENT_TEMPLATE_TRACE_MISSING` 与 `PLACEMENT_TEMPLATE_REF_DANGLING`（phase 2）。当 binding 声明的 component system 在已加载 vendor 参考中提供壳层原语（如 inset 内容容器）时，壳层实现 SHALL 从该原语起步，偏离必须记录理由与用户确认。

## Phase 3 — Project structure（`03-structure.md`）

现场只消费 Phase 0 已确认架构，决定 shell/page/layout/shared/feature/state/data/styling/testing 边界和可执行命令。模板不提供默认目录或 adapter；existing 不得静默换栈。Gate：新增文件有唯一归属，数据/状态/样式不绕过边界。

## Phase 4 — Component inventory（`04-components.yaml`）

每项记录 semantic element、variants/sizes/states、keyboard/AT、source 与 template rule IDs，并增加 `semantic_decision`：用户任务、信息角色、候选语义元素、最终 primitive、选择理由、文案契约、风格角色、放置组、`LOCAL-*-###` 与 template rule IDs。placement-sensitive 使用（例如 shell/content region、section navigation、toolbar、overlay、master/detail、floating surface）必须额外声明 `route_refs`、`placement_role` 和授权它的 `placement_pattern`；该 Pattern 必须在对应 route 的 `pattern_refs` closure 内。选择类控件（select/combobox/dropdown）必须按模板 component anatomy 事实实现触发器结构：`whole-trigger` 表示整行触发器是唯一命中控件、尾随 affordance 图标是其内部装饰（命中区必须覆盖图标位置）；`split-trigger` 表示 affordance 独立可点。模板未声明触发器解剖时不得默认发明，进入 unresolved。链接类 semantic element 的静息 text-decoration 必须消费模板对应 context 的 default 态 state presentation（含 `none` negative facts），不得以浏览器或组件库默认下划线状态实现。状态、比较数据、元数据和操作入口按用户任务选择语义 primitive；不得因装饰便利、组件库默认值或视觉热点选错元素。将 included component/slot geometry 和 subject/context/state presentation 纳入 inventory/token map；保留 `none`、不对称 padding 等 negative facts，禁止组件库默认值覆盖 profile expected。Gate：included route 的交互全覆盖；semantic decision 无悬空 local rule；无嵌套交互；icon-only、浮层焦点和非颜色状态明确。

## Phase 5–7 — 实现进度（`05-07-progress.yaml`）

- Phase 5 entry gate：写入首个应用源码前，在代表切片记录 `prebuild_design_critique`，逐项判定 style consistency、information semantics 和 placement；任何 unresolved finding 先回 Phase 1/2/4 修正，不得带着已知冲突写代码。
- Phase 5：一个端到端代表切片，覆盖 shell、数据区、loading/empty/error、URL 恢复、窄屏、键盘与 computed style。
- Phase 6：完成所有 included page modes；deferred/excluded 不伪造证据。
- Phase 7：完成 Intake included 的全局系统（如搜索、创建、通知；仅当模板声明了 FAB 再验 FAB）。

共享 artifact 按 phase 分节，记录 route、状态、rule IDs、source revision、测试/浏览器 evidence refs。每阶段在 checkpoint 分别声明同一 artifact 的当前 digest。

## Phase 8 — Browser verification（`08-verification.json`）

记录必须符合 schema v2 `verification.schema.json`，`kind: phase-8-verification`，顶层绑定当前 template digest、source identity、build identity、browser identity。Phase 8 SHALL 在模板派生 scenario 之外消费随包发布的 measured expectation set（`.ui-template-design/measured-expectations.yaml`）：每个 `entries[]` 条目产生一条 `phase8:expectation:<id>` scenario，记录 expected/actual/tolerance/result 与 evidence ref；比对 SHALL NOT 读取 oracle 实例，也 SHALL NOT 把 oracle revision/locator 写入 checkpoint。checkpoint 的 `fidelity.expectation_digest` 绑定当前 expectation set，`fidelity.comparisons[]` 记录逐条结论；任一身份变化使既有比对结果过期并要求重新比对。绑定 package 未携带该集合时，`fidelity.status` 记 `fidelity-unverified` 并在汇报中说明未做 oracle 锚定比对，SHALL NOT 声称保真通过。每条 UUID record 必含：rule ID、`passed | failed | waived`、expected/actual、route、viewport、theme、state、evidence refs。evidence 文件放 `evidence/`；截图、trace、AX、console、computed-style 或脚本输出必须可定位。

按模板 coverage、included route 和 fidelity records 确定性生成 required scenario IDs，不使用固定“三视口/十项”等数量代替模板声明。**采集前先枚举全集**，缺口在写记录时即暴露，不要等 checkpoint 门禁：

```bash
python3 skills/ui-template-apply/runtime/check_template_apply_state.py scenarios \
  --fidelity <active-instance>/fidelity.yaml \
  --layout <active-instance>/core/layout.yaml \
  --expectations <active-instance>/measured-expectations.yaml
```

输出是采集全集（profile 布局/几何/状态 + placement geometry/pattern 闭包 + measured expectations 三类来源）。覆盖口径有两个集合：checkpoint 覆盖门禁按 **fidelity profile 派生集**（`derive_scenario_ids(fidelity)`）fail closed；`scenarios --layout --expectations` 全集是它的超集。**按全集采集**——只按 fidelity 子集采集会在 checkpoint 门禁才暴露缺口；每条 verification record 的 `scenario_ids[]` 声明其覆盖项。record UUID 逐条唯一：同一 scenario 在不同 viewport/theme/state 轮次各生成独立 UUID（uuid5 输入须含 viewport/theme/state 维度），复用 scenario 级 UUID 即 `VERIFICATION_RECORD_DUPLICATE`。chrome composition scenario 只从 structural sidecar 已声明的 variant/slot/anchor 派生；无 sidecar 时这些 scenario unavailable，且不得标 profile-verified。通用 skill 不要求 `chat-fab`、A–E 或 Board。每条 UUID record 必含：rule ID、profile record ID（若有）、`scenario_ids[]`、`passed | failed | waived`、expected/actual、route、viewport、theme、state、evidence refs。所有派生 scenario IDs 的并集必须完整覆盖；校验器对 missing scenario fail closed。required evidence 为 computed style、logical bounding geometry、scroll owner/overflow、state transition、overlay scope 与 Accessibility tree；截图只作辅助。console、AX、computed style、URL 恢复、交互与声明状态均须有相关 rule 证据。failed 未复验通过时 Phase 8 不 complete。不同框架/DOM 只要同一 scenario ID 通过即可，不要求源码同构。

## Phase 9 — Review & feedback（`09-review.md`, `feedback/`）

`09-review.md` 必须以 YAML front matter 开头；front matter 使用同一 verification schema，`kind: phase-9-review`，顶层同样必须绑定执行复验的 `browser_identity`。每条记录仅允许 `recheck-passed | recheck-failed`，并以 `phase8_record_id` 引用一条 Phase 8 UUID；引用的 rule ID、expected、route、viewport、theme、state 必须一致——**这六个字段直接从被引用的 Phase 8 record 复制，不要手写重述**（`expected` 措辞不同即 `VERIFICATION_RECHECK_IDENTITY_MISMATCH`）；`created_at` 写带引号字符串，`template_digest` 用 canonical 对象（见「产物写时纪律」）。`actual` 与 evidence refs 记录修复后的 current-build 复验结果。一个 Phase 8 record 最多对应一条 Phase 9 record，未知或重复引用均 fail closed。保留的 Phase 8 `failed` 仅在其关联记录为 `recheck-passed` 且 Phase 9 记录整体有效时闭合；未关联、`recheck-failed` 或身份过期仍阻止完成。正文可写 P0/P1/P2 解释与取舍。

Phase 9 先分类 feedback ownership：`package` 写 `design-system-feedback/v1` proposed 记录并移交 Author；`binding` 只按用户确认的 binding change set 修复；`apply-skill` 回写本 skill。旧 schema v2 feedback 只用于迁移读取。创建/合并规则见本文件“Feedback”。

Phase 9 有效通过且 feedback inbox 没有 `proposed` 时，会话才 `closed`。最终汇报必须输出 `session_closed: true`、`may_delete_apply_root: true`，以及固定句子：「可以删除整个 .ui-template-apply/；删除后生成页面不受影响；再次 Apply 视为新 Intake。」本次未领养项目库时还必须说明本仓不应存在 `templates/`。Apply 不自动删除任何目录。可用只读检查：

```bash
python3 ui-template-author/runtime/manage_template_index.py apply-close --apply-root .ui-template-apply --json
```

## checkpoint 与身份

新会话 `checkpoint.yaml` 符合 `design-system-apply-checkpoint/v1`，固定含 mode、0–9 十个有序 phase、contract id/version/digest、binding digest、projection digests、stable IDs、change set、output root、artifact digest、source identity、build identity、updated_at；旧 schema v2 checkpoint 只用于迁移或只读恢复审计。**新会话用 `checkpoint-init` 生成骨架**（自动计算 `template.digest`/`tokens_digest`，一次通过 `checkpoint` 校验，不手写、不试错）；该格式由 `validate_checkpoint` 逐项校验，`schema:` 标记不豁免其他文件的 schema 校验。恢复校验必须把 checkpoint `template.name`/`template.version` 分别绑定当前模板 meta 的 `name`/`template_version`（兼容显式 envelope 的 `version` 字段）；任一 identity 字段不一致均为 Phase 0 失效，不能只靠可伪造的 digest 通过。digest 统一为：安全解析值 → UTF-8 sorted-key canonical JSON（`ensure_ascii=false`、无多余空白、拒绝 NaN）→ SHA-256，算法标识 `sha256-canonical-json-v1`。因此 YAML 格式/键序变化不使 tokens 失效，语义变化会。

恢复用 `check_apply_resume.py` 计算 Impact-based Resume：digest 失配全量重开；否则按 change set 依赖面重开最早 phase。source identity：有 Git 时记录 commit + dirty diff digest；无 Git 时记录目标源码快照 digest。build identity 来自目标项目声明的构建命令/产物，必须非空且可复现；不得写“latest”。

工具入口按布局二选一，下例以仓库布局书写；安装布局把前缀换成 `python3 ~/.claude/skills/ui-template-apply/runtime/check_template_apply_state.py`（`check_active_instance.py` 等其他 runtime 工具同口径），无需设置 PYTHONPATH：

```bash
python3 scripts/check_template_apply_state.py checkpoint-init \
  --apply-root .ui-template-apply --template <template-meta-or-envelope> \
  --tokens <template/tokens.yaml> --scope <scope-yaml> \
  [--fidelity <template/fidelity.yaml>] [--mode bootstrap] [--origin catalog] \
  [--output-root apps/agent-web] [--contract-id <id> --contract-version <semver> --contract-digest <sha256>] \
  --source-identity <revision> --build-identity <build-id>
python3 scripts/check_template_apply_state.py digest <yaml-or-json-or-md>
python3 scripts/check_template_apply_state.py source-identity <project-root>
python3 scripts/check_template_apply_state.py architecture-site <output-root>
python3 scripts/check_template_apply_state.py build-identity <build-artifact> --command '<actual-build-command>'
python3 scripts/check_template_apply_state.py checkpoint \
  --apply-root .ui-template-apply --template <template-meta-or-envelope> \
  --tokens <template/tokens.yaml> --scope <scope-yaml> \
  --fidelity <template/fidelity.yaml> \
  --source-identity <revision> --build-identity <build-id> \
  --known-rule-id NN-001 --known-rule-id AX-001 \
  --known-rule-id LOCAL-STYLE-001 --known-rule-id LOCAL-INFORMATION-001 --known-rule-id LOCAL-PLACEMENT-001
python3 scripts/check_template_apply_state.py feedback .ui-template-apply/feedback \
  --apply-root .ui-template-apply --known-rule-id NN-001 [--known-rule-id AX-001 ...]
python3 scripts/check_template_apply_state.py feedback-merge .ui-template-apply/feedback <candidate.yaml> \
  --apply-root .ui-template-apply --known-rule-id NN-001 [--known-rule-id AX-001 ...]
```

`checkpoint` 输出两个独立维度：`checkpoint_valid` 只看 findings（门禁是否干净）；`earliest_phase` 是 resume 游标（会话中途 pending 阶段使其非 null，不是失败）。`digest` 对 `.md` 产物按换行归一 envelope 计算，与 checkpoint artifact 校验同口径。

## 恢复：从最早失效 phase 重新打开

恢复时从 Phase 0 顺序验证，不按“最后工作位置”猜测：

- checkpoint/verification 校验的 `known_rule_ids` 必须包含当前适用的模板 rule IDs 和 Phase 1 local design rule IDs；feedback `targets` 仍只能使用模板 rule IDs。

- scope 变化或 template identity/digest 变化 → 最早 Phase 0；
- token semantic digest 变化 → 最早 Phase 1；
- layout profile 语义变化（scroll owner、region、wrap/shrink、overlay、responsive、chrome composition）→ 最早 Phase 2，并使 Phase 8 相关证据过期；
- geometry/state profile 语义变化 → 最早 Phase 4，并使 Phase 8 相关证据过期；
- artifact 缺失、路径越界或 digest 不匹配 → 该 artifact 所属最早 phase；
- source/build identity 变化、Phase 8 缺失或身份不一致 → 最早 Phase 8；
- Phase 9 review 缺失/无效 → Phase 9；
- checkpoint 标为 complete 但必需 artifact 未登记 → 对应 phase。

最早 phase 标 pending，其后阶段标 stale 并清空旧 evidence refs；修复后重新计算 artifact digest。没有当前 Phase 8 evidence 时绝不允许完成。

## Feedback：UUID + normalized fingerprint

`LOCAL-STYLE-###`、`LOCAL-INFORMATION-###` 和 `LOCAL-PLACEMENT-###` 只用于当前 Apply 会话验证；它们不是模板 rule IDs，不得放进 feedback `targets` 或当作 reusable template gap 的规则上下文。

Apply 只创建 proposed，且文件必须命名为 `feedback/<record UUID>.yaml`，filename stem 与记录 `id` 不一致即拒绝整个 inbox。`evidence_refs` 至少包含一个非空引用，并必须作为相对 `.ui-template-apply/` 根的现存文件解析；绝对路径、`..` 或符号链接越界和缺失文件均 fail closed。UUID 用于记录身份；fingerprint 输入为 template name/version、NFKC+casefold+折叠空白后的 scenario，以及 sorted target rule IDs（无 target 时 scope），按 canonical JSON SHA-256。任何非空 `targets` 都必须在调用时提供完整 `known_rule_ids` 并逐项命中；缺少规则上下文或悬空 target 均不得写入。

每次创建/合并前先验证 candidate 与整个既有 inbox；任一记录 schema/history/fingerprint/filename/evidence/target 非法或存在多义 UUID/active fingerprint 时不得写入。验证通过后，同 UUID 或等价 active fingerprint 合并去重 evidence refs、保留原 ID/状态，不新建文件；无匹配记录的 UUID 目标路径若已存在则视为碰撞，绝不覆盖。写入必须使用同目录临时文件原子替换，随后重新验证整个 inbox；写后验证或 I/O 失败时恢复原字节（新文件则删除），回滚成功前不得返回成功。Authoring 状态机和 receipt 由其 `feedback-lifecycle.md` 所有。
