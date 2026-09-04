## Context

见 [`proposal.md`](proposal.md) 的动机。当前 effective contract 是 `openspec/specs/` 加尚未归档的 `harden-template-lifecycle` delta：schema v2 以 `tokens.yaml` 固定精确值、以 `evidence.yaml` 审计 token/default/asset，但 component/layout 文档仍主要是 prose，repo 指南允许主观选择代表组件，validator 不重放来源 locator，contract eval 也不执行真实 repo 导入。

本仓库必须继续保持：`skills/` 是双 public skill 生产正文唯一源码；模板不包含技术栈 adapter、工程目录、依赖、API/data/state 选型或 runnable starter；`example/**` 是治理排除域；workbench 模板只能依据其已声明的固定 repo/doc revisions，不能从样例实现反推。

## Goals / Non-Goals

**Goals:**

- 在不升级 schema v3 的情况下，为 repo 模板增加可发现、独立版本化、可重放的 structural fidelity compatible extension。
- 把当前三类真实信息损失转成机器契约：非常规 layout topology、component slot geometry、contextual state presentation。
- 让 Authoring 的 source capture/replay、portable validation、Apply Phase 2/4/8 和 current-build evidence 使用同一组稳定 record identities。
- 保持旧 v2 模板可消费，并让 baseline/style-only/structural 三种状态显式可区分。
- 以 workbench-shell 模板和非 example fixtures 证明 link context、Dialog 顶部 padding、Board/主从 scroll/overlay 等行为。

**Non-Goals:**

- 不设计完整 UI/组件 DSL、任意图查询或 graph transform 语言，也不发布完整 AST/call graph/source code snapshot。
- 不规定 React/Vue、Tailwind/CSS、组件库、DOM 层级、项目目录或其他消费实现选择。
- 不以 screenshot pixel clone 为唯一目标，也不要求不同技术栈生成同构源码或 DOM。
- 不修改、读取、运行、格式化、迁移或 promote `example/**`，不把任何生成样例代码作为 fixture、来源或验收证据。
- 不修复 `.kiro/skills` shadow copy 漂移；该问题需独立治理，不与 profile contract 混合。
- 不自动 archive `harden-template-lifecycle`、publish、tag 或变更 release promotion 状态。

## Decisions

### 1. 使用独立 profile schema，而不是修改 v2 core 或直接进入 schema v3

新增独立 schema family，例如 `schemas/template/fidelity/v1/`，模板 sidecar 固定为 `fidelity.yaml`：

```yaml
schema_version: 1
profile: repo-structural-v1
conformance: structural # structural | style-only
platforms: [web]
scope: {...}
layout_scenes: [...]
component_geometry: [...]
state_presentations: [...]
unresolved: []
```

新 repo Authoring 总是产出 sidecar：默认 `structural`；用户明确选择 style-only 时，sidecar 仍作为持久 receipt，三类 structural records 为空并记录理由。旧 v2 模板没有 sidecar时是 `legacy-baseline`。因此 Apply 能区分用户主动 style-only 与历史模板缺失，而无需向 closed `meta.yaml` 偷加字段。

存在 sidecar 时未知 schema/profile fail closed；不存在 sidecar 时 core v2 继续按 baseline 消费。profile 语义内容进入 template identity，但不新增 checkpoint 字段。

**替代方案：**直接扩展 `meta.yaml`/`evidence.yaml`。拒绝，因为 closed v2 schema 与旧 validator 会把同一 schema version 解释成不同字段集合。直接 schema v3 也拒绝，因为当前问题不要求重做 token/origin/checkpoint 契约。

### 2. Profile v1 只开放三个有限 facet

#### Layout scene

记录抽象 region IDs、visual/logical ownership、arrangement、fill/shrink/wrap、按 inline/block 轴声明的 scroll domains、overlay scope/anchor 和有限 responsive modes。每个 scroll domain 有唯一 owner，但一个 scene 可以有多个独立或嵌套 domains；portal/teleport 不用 DOM parent 表达。

v1 不开放任意 relationship vocabulary。允许集合固定在能验证当前缺陷的语义：contains/owns、horizontal/vertical/overlay、fill、shrink/non-shrink、wrap/non-wrap、scroll owner、viewport/region scope、mode override。

#### Component geometry

按 component + slot 记录逻辑方向 geometry；v1 closed properties 至少包含 padding 四向、gap、inset 四向、size、radius、surface、border 和 shadow。精确值只能是 token ref；`none`、`zero`、`auto` 等有限语义值显式枚举。几何记录不包含组件源码、primitive、variant class 或 event handler。

#### Contextual state presentation

按 subject role + context + state + surface 记录背景/文字/边框 token refs、text decoration、visibility 和 container presentation。context 至少区分 navigation-link、entity-row-link、button-link、inline-prose-link，不设置“所有 link”隐式继承。`none` 是 normative expected，不是字段缺失。

**替代方案：**只做 structural boundary（scroll/action/modal）。拒绝，因为它不能直接约束 Dialog `padding-block-start` 和 link hover decoration。完整 component recipe 又过宽，会复制 Apply 的组件 inventory，因此 v1 只记录 source-observed geometry/presentation。

### 3. 按职责划分事实权威

- `spec.md`：设计意图、Non-negotiables 与稳定 rule identity。
- `tokens.yaml`：所有精确数值唯一载体。
- `fidelity.yaml`：token 在何种 scene/component slot/context/state 使用，以及区域关系与 negative facts。
- `components.md`、`routes-and-layouts.md`、平台文档：人类解释，只引用 rule/profile record IDs，不复制机器关系或精确值。
- `apply/`：阶段映射、取证方式和通过条件，不重新定义 expected。

Profile record 必须引用已存在 rule ID；sidecar 不能创建 core 文档中没有身份的独占规则。Validator 检查跨文件 refs 和禁止精确值重复，不尝试用 NLP 判断两份 prose 是否等价。

**替代方案：**保持 `spec.md` 对所有内容的无差别最高优先级。拒绝，因为 prose 与结构化关系一旦同权重复，无法可靠判定冲突。采用职责分区后，冲突表现为越权或悬空引用，可确定性失败。

### 4. Record identity、provenance 与 canonical semantics

三类 records 使用稳定 domain ID（scene/geometry/state）和 rule ID。Observed record 内联最小直接 provenance：source ID、revision、locator、method、source-span SHA-256、captured_at、confidence；locator 可以是固定 revision 的相对 path+symbol、selector 或 pointer，但 normative 字段不得包含工程实现。

Canonicalization：

- mapping key 与无序集合稳定排序；
- token/rule/source refs 保留原义；
- record identities、relations、negative facts、status 与 unresolved 集合进入 digest；
- 描述文本、YAML 格式和 locator 行号可排除；
- source-span digest、symbol/semantic selector 不排除。

Profile change按 facet 计算影响：layout 变化最早重开 Phase 2；geometry/state 变化最早重开 Phase 4；全部使 Phase 8 相关证据过期。

### 5. Repo Authoring 使用 scope-relative usage closure

Authoring Intake 固定授权、revision、platform、scenes/components/contexts scope 和 conformance。Capture 先形成只读 staging receipt：排序后的 definitions、exports/import closure、usages、exclusions、dynamic/unresolved 和内容摘要；receipt 用于 gate，不作为完整 source IR 发布到模板。

完成条件从“3–5 个代表组件”改为：

1. 找到 scope 内 canonical definitions；
2. 枚举 included scenes 中相关 usages/call-sites；
3. 按 context/slot 分组；
4. 一致事实进入 record；
5. context 不同则拆分；
6. 冲突进入 unresolved，只有现有 rule 或显式 decision 可裁决；
7. 达到确定性资源上限时请求收窄 scope或标 unsupported，不能静默抽样。

静态分析只支持声明的安全子集，不执行来源仓库代码。动态表达式不能解析时 fail unresolved，不由 Agent 推断成 source。默认值仍可使用，但必须是显式 default decision，不能冒充 structural observation。

### 6. Validator 分 portable 与 session-source replay 两层；provenance 不是 checkout

必须先区分：

- **Session source**：本次 Generate/从源更新时，用户明确给出的可读来源（本地路径，或本会话授权读取的 Git 地址）。只有这条路径可以绑定 `--source-root`。
- **Provenance**：已写入 `meta.sources[]` / evidence 的出处身份（id/type/ref/revision/captured_at）。导入完成后模板自包含。它不是文件系统绑定，也不是下次 Authoring 的必填输入。

Portable validation 始终运行：profile JSON Schema、重复键/ID、closed enums、token/rule/source refs、scroll domain、region/overlay refs、geometry 完整性、context conflicts、unresolved 状态、canonical digest、prohibited engineering content 和机器计数。对已发布模板、无 session source 的校验，portable 通过且 replay 为 `not-run` 即为成功路径；不得因此向用户索要历史绝对路径，不得扫描 sibling checkout、`/tmp`、`example/**`，不得按 `meta.sources[].ref` 自行 clone。

Source replay **仅**在本次会话的 Generate-from-source 提供了 session source 时运行。CLI/runtime 使用该会话显式 source-ID→root 绑定，验证 root 边界、revision、locator、span digest、capture receipt 和 published record。JSON 报告分别给出 `declared/resolved/executed/passed`。在这条路径上，structural completion 才要求 required replay 全部 executed/passed；缺 session source 时不得把已发布模板标为 Authoring 失败。

所有 session source paths 做 realpath/symlink/parent traversal 防护。Replay 只读，不执行来源命令，也不把源码内容写入 bundle/report。

### 7. Apply 复用现有 Phase 0–9，不增加平行状态机

- Phase 0：验证 profile，记录 conformance/scope/digest/unresolved decisions；legacy baseline 与 style-only 显式降级。
- Phase 2：把 included layout records 投影到现有 route/layout artifact 的稳定 constraint identities。
- Phase 4：把 geometry/state records 投影到现有 component inventory/token map。
- Phase 8：由 records 确定生成 scenario IDs，并采集 current-build computed style、logical geometry、scroll owner/overflow、state transition、overlay scope 与 AX evidence。
- Phase 9：review 汇总 profile record passed/failed/waived/recheck，并为可复用缺口创建 feedback。

截图只作辅助。目标实现可以使用不同框架、CSS 和 DOM，只要相同 observable contract 通过；profile 不生成 stack adapter。

### 8. Workbench-shell 是已发布模板边界，不是「再要一次上游路径」的口子

`templates/workbench-shell/` 已从声明 revision 导入，`meta.sources[]` 只证明出处身份。现有 evidence 的 `v1-source-token-migration` / 模板内 locator 是迁移历史，不能冒充 live 上游 observation，也**不能**推导出「必须再提供 multica 与文档的本地绝对路径」。

本 change 对 workbench 的默认完成条件是：portable core v2 通过，无 sidecar 时明确 `legacy-baseline`，replay `not-run`。Board/Dialog/link/overlay 的 structural 机器证据放在非 example fixtures。只有用户在后续会话明确给出与声明 revision 一致的 session source 时，才允许 Generate-from-source 并写入 source-direct `fidelity.yaml`。

任何 capture、测试、评审、diff 或命令若访问 `example/**` 都由 scope guard 阻断。Pilot 不声明样例已修复，也不运行样例 build/test。

### 9. Eval 分确定性 CI 与授权方差评估

新增 self-contained fixture repo，不使用外部网络或 `example/**`，覆盖：

- shell/canvas + nested scroll domains + region-scoped overlay；
- horizontal non-wrapping Board；
- navigation/entity-row/button/prose link context；
- Dialog 四向 padding、close inset 和 footer geometry；
- dynamic unresolved、source mismatch、locator laundering、unknown profile。

普通 CI script judge 执行 capture/replay/canonicalization/validator/Apply projection，并要求固定输入重复结果完全一致。多 Agent Authoring/Apply variance 只在显式授权的受控环境运行，记录模型/runtime fingerprint；比较 semantic digest、constraint IDs 和 required scenario IDs，不比较自然语言措辞。

Contract eval runner 扩展真实命令/fixture assertion 类型，而不是继续用 `file_contains` 证明行为。任何 declared/parsed/executed 数不一致仍 fail closed。

### 10. Bundle、镜像与兼容元数据同步

Distribution allowlist 加入 profile schema、portable validator/source replay runtime、fixtures 与 deterministic baseline。Manifest/compatibility 分别声明 core template schema 与 profile schema/profile ranges；双 skill 必须同时升级。`make mirror-write` 只更新 allowlist 受管生产镜像，历史 patches/experience 保持不可变。

不新增第三方依赖优先；若确需 parser 依赖，必须精确固定并完成许可/用途记录。Release artifact 保持可复现，unknown profile 不静默降级。

### 11. Active overlay 与 archive 顺序

实现与验证按 base + `harden-template-lifecycle` active delta 理解有效契约，不为消除 pending overlay 修改 base specs。若后续收到 archive 请求，必须先归档并验证 `harden-template-lifecycle`，再归档本 change；两者均不在本 change 自动执行。

## Risks / Trade-offs

- **[Risk] sidecar 演化成通用组件/layout DSL。** → v1 schema 使用 closed facets/properties，超出三类 observables 的需求另开 change；review 以 Non-Goals 做 scope gate。
- **[Risk] structural 默认增加大型 repo 的扫描成本。** → scope-relative closure、稳定资源上限和显式缩小范围；禁止无界全仓 call graph。
- **[Risk] 静态来源无法表达运行时 computed 结果。** → 允许已授权浏览器/运行态 evidence 作为 method；不可获得时 unresolved 或降低 conformance，不伪造 high confidence。
- **[Risk] source-span digest 因无语义格式变化频繁失效。** → digest 针对规范化 span/symbol，locator 行号排除于 canonical profile digest；revision 改变仍要求 replay。
- **[Risk] profile 与 prose 漂移。** → 职责分区、稳定 rule refs、禁止机器关系/精确值在 prose 重复，并用 validator 检查悬空/越权。
- **[Risk] baseline 模板给用户“可用但不保真”的模糊体验。** → Intake/Report/Apply 明确显示 legacy-baseline 或 style-only，不使用 profile-verified 文案。
- **[Risk] Agent 把 `meta.sources[]` 当成必须再提供的本地 checkout。** → skill/spec 明确 session source vs provenance；已发布模板 portable 成功；禁止索要历史路径、扫描 sibling/`/tmp`/`example/**` 或按 ref clone。structural 机器证据以非 example fixtures 离线保证；workbench 无 session source 时保持 `legacy-baseline`。
- **[Risk] 误触生成样例代码。** → tasks、scope guard、CI report 和最终 diff 检查统一排除 `example/**`，发现 diff 立即失败而不是修补样例。
- **[Trade-off] 不要求 DOM/CSS 同构会保留部分视觉差异。** → 以 observable topology/geometry/state 与 current-build evidence 定义保真边界；像素级 reference scene 留给后续独立能力。

## Migration Plan

1. **前置与路径保护**：确认 `harden-template-lifecycle` effective contract；记录 `example/**` 禁读/禁改/禁运行 guard 和当前生产/template/bundle基线，不执行 archive。
2. **Profile schema 与 fixtures**：添加独立 fidelity v1 schema、canonical examples、bad/mutation/self-contained repo fixtures和 semantic digest vectors；core v2 schema保持不变。
3. **Validator/canonicalization/source replay**：先实现 portable semantic checks，再实现显式 source-root replay与稳定 JSON counters；所有负例和路径安全测试通过后才接 Authoring。
4. **Authoring contract**：更新 repo guide、spec-format、SKILL gate、capture receipt、structural/style-only report 和 eval cases；验证失败保持 production INDEX 不变。
5. **Apply contract**：更新 template contract、Phase 0/2/4/8/9 投影、checkpoint invalidation、browser evidence 和 feedback；不增加新阶段或工程 adapter。
6. **Workbench 边界**：无 session source 时不生成声称 source-direct 的 sidecar、不索取本地上游路径；portable 验证已发布 core v2；structural 正向实例由 fixtures 承担。用户后续提供 session source 时再走 Generate-from-source。不访问 `example/**`。
7. **Eval 与分发**：扩展 runner assertion、baseline、tests、bundle allowlist、manifest/compatibility/changelog/rollback 文档和双 skill 生产镜像。
8. **最终验证**：运行 schema/validator 正反 fixtures、source replay fixture、真实模板 validator、contract eval、OpenSpec strict、bundle reproducibility、install smoke、mirror check、active release 和 example scope guard；确认 `git diff -- example` 为空且没有命令读取样例。

回滚时恢复上一双-skill bundle、compatibility 与模板版本；移除新 sidecar 后旧 v2 core 仍可按 baseline 消费。已生成的 capture/replay 报告保留为审计记录，但不把未知 profile 静默降级。Archive、publish、tag 和 sample promotion 仍需单独请求。
