## Context

Author 的来源采集（`references/source-{web,repo,image,doc}.md`）与 provenance 校验（`EVIDENCE_SOURCE_DANGLING`、`EVIDENCE_REVISION_UNDECLARED`）已经保证 evidence 指向已声明来源；`validate_coverage_and_confidence` 保证 coverage 是完备互斥分划且 confidence 与之一致。缺口在**更上一层的声明准入**：现有 gate 只问「evidence 是否可解析」，不问「这条声明是否有资格进 package」。于是重复出现、局部样式、被孤立引用的 evidence，以及 update 时被静默删除的既有决策，都绕过了 gate。

`create-design-md` 提供了一套可借鉴的纪律：三证准入（Observation / Basis / Consequence）、recurrence 阈值、consequence-bearing prose 与 no-op pass、update diff 回归守卫。本 design 说明如何把这套纪律**转译为 `design-system/v1` 契约的可执行切片**，而不是照搬其单文件 `DESIGN.md` 产物模型。

## Goals / Non-Goals

**Goals:**

- 让「一条声明能否进 package」成为可复算的判据，而不只是作者自律。
- 把 recurrence 与 scope 语义落到 evidence 字段，使「单 surface 证据冒充产品级规则」可被 validator 拒绝。
- 让 update 的移除行为显式化，杜绝静默丢 ID。
- 保持既有无损语义：历史 package 不因新增可选字段失败，未声明变更仍保持原字节。
- 用稳定错误码 + eval 正反例，使新纪律可回归测试。

**Non-Goals:**

- 不引入 `DESIGN.md` 单文件产物模型，不改变七层 core 与 `evidence.yaml` 作为 provenance 权威的设计。
- 不重新定义 source 采集顺序、`meta.sources[]` 语义或 Apply 的 source-blind 不变量。
- 不把 Consequence 判定做成通用语义理解；只做「是否被消费层解析引用」的可计算投影。
- 不改 `.agents/skills`、public skill 镜像与 immutable history。

## Decisions

### D1. 三证准入映射为 evidence 结构 + 引用图

- **Observation** → evidence `locator`（`origin: source|computed` 时必填）。
- **Basis** → evidence `method` + 可解析 `source_revision`（或 `origin: default` 时的 `basis`/`decision_id`）。
- **Consequence** → 该 evidence 的 `target` 解析到 package 已声明的 token 路径（含 group/leaf 与 `token/` 前缀）或 stable entity/rule id，即它描述的是真实会被消费的产物。

理由：Consequence 天然是语义判断，但「`target` 是否解析到已声明产物」是可计算代理，能覆盖「悬空 evidence / 指向不存在产物」的候选，且不需要给每个实体新增反向引用字段。替代方案（真正的引用图，要求每个 token/entity 反向声明 evidence）需要大范围 schema 扩宽与大量既有数据修复，收益不足，被否；让模型判断每条 prose 是否有意义则不可复算、不可回归，亦被否。

### D2. recurrence 与 scope 放进 evidence，而非 prose

在 `evidence.schema.json` 增补可选 `scope`（`surface | product`，缺省 `surface`）、`surface`（可选 surface 标识）与 `recurrence_refs`（string 数组）。`scope: product` 时要求 `recurrence_refs` 解析到 active evidence 且覆盖 ≥2 distinct sampled surface；distinct 判定优先用显式 `surface`，缺省回退到 `locator` 归一化。

理由：`create-design-md` 的 recurrence 是「≥2 sampled templates 才可做 site-wide rule」。此处复用 evidence 已有多来源记录能力，不新造第二套 token/scope schema，也不新增独立 surface registry——`surface` 只是单条 evidence 的可选标签，缺省时由 `locator` 推导。缺省 `scope: surface` 保证历史 package 不回退失败。

### D3. 移除守卫放在 change-set gate，而非 package validator

`SILENT_DECISION_REMOVAL` 需要比较**本次 update 前后**两个 package 版本，属于 staging/change-set 语义，因此实现于 `run_authoring_gate.py` 与 `manage_template_index.py check-changeset`：对比 before/after 的 active stable ID 集合，若存在丢失且未在 after 记为 `retired`/`superseded`，fail closed 且不写 production INDEX。package validator 只负责单版本不变式（`CLAIM_ADMISSION_INCOMPLETE`、`RECURRENCE_UNSUPPORTED`）。

理由：单版本 validator 看不到「被删掉的东西」；把移除守卫塞进 validator 会迫使 validator 依赖历史快照，破坏 candidate-only。替代方案（用 git diff 判断）依赖工作区状态，不稳定，被否。

### D4. 纪律写入 skill 文档并与 validator 同步

- `references/extraction-layers.md`：加入「声明准入」小节与 no-op pass 定义，作为 L0–L6 抽取的统一前置。
- `references/source-*.md`：把三证与 recurrence 收成每来源一致的准入清单，明确「来源不可得时 omit 或收窄 scope，不得降级写入」。
- `references/authoring-report.md`：新增 `removal_set` 字段与准入摘要，供移除集报告。
- `SKILL.md` 不变量：补「声明必须过三证准入」与「update 不得静默移除」两句。
- 同步 `scripts/sync_design_system_validator.py` 覆盖的安装态副本，避免共享 validator 漂移。

### D5. 借鉴取舍与显式排除

| `create-design-md` 做法 | 采纳 | 取舍 |
| --- | --- | --- |
| 三证准入（Observation/Basis/Consequence） | 是 | 映射为 evidence 字段 + 引用图，可复算 |
| recurrence ≥2 才可 site-wide | 是 | 落成 `scope`/`recurrence_refs` |
| consequence-bearing prose + no-op pass | 是（文档纪律） | 不可自动判定，写进 skill 与 report |
| update diff 回归守卫 | 是 | 落成 change-set gate 的移除守卫 |
| 单文件 `DESIGN.md` 产物 | 否 | 保留七层 package |
| 「产物内不得有任何 citation/audit」 | 否 | 保留 `evidence.yaml` 作为 provenance 权威，只要求 prose/rules 干净 |
| 校验输出类别缺失即失败 | 部分 | 已由 `declared = parsed = executed > 0` 覆盖，仅补文档措辞 |
| 多来源优先级、安装 spec 版本探测 | 否 | 已由现有路由与 pinned 契约覆盖，另开 change |

## Risks / Trade-offs

- **引用图误伤合法孤立记录**：某些 evidence 可能是暂存或跨包引用。缓解：准入检查只覆盖 `origin: source|computed` 且 `kind` 不属于 `basis`/`default` 的条目；`default`/`basis` 条目豁免 Consequence。
- **surface 归一化歧义**：不同来源对「同一 surface」的 locator 形态不同。缓解：复用现有 locator/target 归一化，先在 eval 中用 fixture 固定判定；无法归一化时保守判为「未闭合」，宁可要求补齐也不放行。
- **既有 package 收紧**：声明 `scope: product` 但仅单 surface 的既有 evidence 会失败。缓解：缺省 `surface` 使多数历史条目不受影响；对明确声明 product 的条目按本 change 的「收窄或补齐」处置。
- **移除守卫误报**：把一次重构中的 ID 替换误判为静默删除。缓解：`retired`/`superseded` + 替代 ID 即可放行，且 report 列出移除集供人工复核。
