# Design: close-fidelity-truth-gaps

## Context

见 `proposal.md — Why`。设计约束来自既有不变量：Apply 必须零原版依赖（I2），生成物不是修复面（I1），未声明变更保持原字节（I4），catalog 是消费仓唯一 pin 源（I3）。现状的技术事实：`fidelity.yaml` 全部 observed record 的 locator 指向手写 `ui-source-graph.yaml`，replay 只证明「图与自身一致」；认证报告的 oracle 证据是内容为复现说明的 `.provenance.json` 占位文件，validator 仅做文件存在检查；Phase 8 required scenario 由模板自身派生；`meta.yaml` 的 coverage/confidence 与 evidence revision 没有任何 validator 约束；`catalog.py` 的 promotion guard 要求 schema 不可能出现的状态值。

## Goals / Non-Goals

**Goals:**
- 让「保真」有一次真正的外部锚定，且该锚定结果可被 Apply 在不接触 oracle 的前提下复验。
- 把 provenance、coverage、confidence 三条已声明但未执行的契约变成机器可校验。
- 让 promotion 与打包的 guard 与 schema、与「被提升对象」正确绑定。

**Non-Goals:**
- 不解决提取端手写 graph 的自动化（属 P2 与 extractor 能力问题）；本 change 通过 oracle 对照让 graph 误差变得可见，而不是消灭 graph。
- 不收敛逐轮必答矩阵、不合并 digest 链、不调整 skill 拆分。
- 不自动 promotion，不改变「用户单独确认」红线。

## Decisions

### D1: measured expectation set 作为 oracle 与 Apply 之间的唯一桥

gate 从 oracle 测量产出 `measured-expectations`（schema `design-system-measured-expectations/v1`），条目含 pattern/primitive ref、dimension、method、期望值、容差、oracle evidence ref、oracle revision，并绑定 package contract digest；该集合随 catalog 条目发布，Apply 在 Phase 8 消费。

- 备选：Apply 直接访问 oracle —— 违反 I2，排除。
- 备选：把期望值写进 package core —— 期望由包作者自产，等于把自证循环换个位置，排除。
- 备选：Phase 8 直接做截图比对 —— 不可机读、需要 oracle 侧图像，且与 source-blind 冲突，排除。
- 结果：断言由 oracle 侧产生、由 validator 校验结构、由 Apply 只读消费；source-blind 不变。

### D2: oracle 证据只接受两种形态

合法 oracle 证据为 (a) 真实截图 artifact（通过图像内容校验）或 (b) oracle 侧测量记录（含 measurement id、method、数值或闭集语义、单位、采集时间、oracle revision、内容摘要）。占位文件、复现说明、无 oracle 引用的自报数值判失败。

- 备选：只允许截图 —— 无法做容差判定，回到主观「一致」，排除。
- 备选：只允许测量 —— 丢失整体表面证据，排除。
- 结果：`CERT_ORACLE_EVIDENCE_PLACEHOLDER`、`CERT_ASSERTION_UNANCHORED` 两个稳定错误码，避免再次出现「文件存在即通过」。

### D3: 无 oracle 时用显式降级代替静默放行

oracle 不可部署时 gate 输出 `self-consistency` 结论并阻断 promotion，输出中不得出现 Visual Equivalence 措辞。这样「没有对照」与「对照通过」在机器与汇报上都可区分。

- 备选：允许无 oracle 发布但标注 —— 正是当前纸面 gate 的实际效果，排除。
- 备选：强制 oracle 部署否则 gate 报错不可用 —— 会让整个认证链路在 oracle 缺失时完全空转，采用降级语义更可诊断。

### D4: 交叉校验放在统一 validator，schema 只承担可表达的部分

coverage 三数组互斥、`overall ≤ 最弱必需维度`、evidence revision ∈ `meta.sources[].revision` 均无法用 JSON Schema 表达，落在统一 validator（package 与 active 共用路径），错误码 `EVIDENCE_REVISION_UNDECLARED`、`COVERAGE_PARTITION_INVALID`、`CONFIDENCE_INCONSISTENT`；schema 侧只补 oracle 证据与 expectation set 的结构定义。

- 备选：只改 schema —— 表达力不足，排除。
- 备选：只在 authoring gate 检查 —— 消费侧无法复验已发布包，排除。

### D5: promotion guard 与 schema 对齐并绑定被提升对象

guard 的通过条件改为读取认证 schema 允许的状态与独立 accepted 标记；同时校验被提升 package 的 id/version/contract digest 与认证报告一致；`build` 增加 catalog 与生产库一致性校验。

- 备选：保留 `status == "accepted"` 并放宽 schema enum —— 会让 failed 与 accepted 语义混淆，排除。
- 结果：修正当前「该拦的拦不住（build 绕过 guard）、该放行的放不了（guard 永远为假）」的死结。

### D6: workbench-shell 按 provenance 诚实性修复，不删证据

26 条旧 revision evidence：若确属历史来源，则在 `meta.sources[]` 增补对应 source 条目并修正其 `source_id`/`source_revision` 指向；若属误标，则按当前 session source 重新采集。coverage 与 confidence 按事实修正（补齐分划或把 unsupported 记全），不通过调低声明数绕开校验。

- 备选：删除旧 evidence —— 丢失 provenance，违反 I4 精神，排除。
- 备选：统一改写为当前 revision —— 制造虚假出处，排除。

## Risks / Trade-offs

- [oracle 不可部署导致所有 shell-bearing package 停在 `self-consistency`] → 先为 workbench-shell 建立可复现 oracle 部署（固定 revision + 固定命令 + 启动脚本），把「可部署」变成 gate 的前置检查项；确实不可部署时按 D3 诚实阻断，不降级为通过。
- [expectation set 覆盖面仍受 inventory 起草控制] → 要求 expectation 覆盖等于或包含 inventory，并由 validator 校验集合关系；inventory 仍需 source-derived（既有要求）。
- [收紧校验使既有 package 校验失败] → 分三批落地（validator 校验 → oracle 证据与 expectation → Apply 消费），并先完成 workbench-shell 数据修复再开门禁。
- [expectation set 成为新的 source-blind 泄漏通道] → 限定其只承载测量值/容差/证据引用，禁止 oracle 源码路径、DOM 片段、CSS class；validator 对禁止字段 fail closed。
- [与两个 pending change 在 archive 时冲突] → 本 change 用 ADDED requirement，不改 `Current-build verification` 标题；archive 顺序为两个 pending 先、本 change 后。

## Migration Plan

1. 落 validator 三条交叉校验与 workbench-shell 数据修复，使现存 package 合规（不改认证语义）。
2. 落 oracle 证据结构校验与 expectation set 生成（认证侧）。
3. 落 Apply Phase 8 消费与 `fidelity-unverified` 降级（消费侧）。
4. 修正 release guard 与 catalog 新鲜度校验；既有 `accepted` 结论按新要求重新认证后方可 promotion。
5. 回滚沿用 `governance/release/ROLLBACK.md`：本 change 不自动改写 Active Instance，仅新增校验与产物；回滚旧 bundle 时新校验自然失效。

## Open Questions

- expectation set 在 catalog 条目内的具体文件名与 carrier 结构，可在实现时按 package 格式约定确定，不影响 spec 与任务分解。
- oracle 可部署形态（本地容器镜像 vs 固定服务地址）实现时确定；两种形态都不改变本设计中的证据结构与降级语义。
