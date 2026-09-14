## Purpose

定义 Template Package 发布或升级前的 source-blind 保真认证契约，使“视觉基本一致”由固定 oracle、固定 prompts、Pattern 级证据和机器可校验身份共同支撑，而不是靠历史生成物或主观判断。

## Requirements

### Requirement: Certification gate is a publish precondition
Template Certification Gate SHALL 是官方 Template Package publish 和 upgrade 的必要治理步骤；gate 未通过或证据缺失时，生产 INDEX 与 catalog SHALL 不切换。对声明 shell chrome composition 的模板（shell-bearing），catalog promotion 或 replacement SHALL 额外要求当前 accepted 的 certification report；缺失时 promotion SHALL 拒绝并指明所需认证输入。认证对照 SHALL 只发生在认证链路（固定 Visual Oracle revision、source-blind 干净 Apply、Pattern Equivalence Records），SHALL NOT 将 oracle identity 或对照产物注入 Apply checkpoint。

#### Scenario: candidate passes certification
- **WHEN** candidate package 的全部 certification inventory 成员都有有效 `passed` Pattern Equivalence Records
- **THEN** gate 输出 accepted 结果，并将 candidate 标记为可等待用户单独确认发布

#### Scenario: evidence missing
- **WHEN** 任一必需 Pattern 没有 current-build record、oracle record 或必要 assertions
- **THEN** gate 失败，生产 INDEX 与 catalog 保持原状

#### Scenario: shell-bearing 模板缺认证直提 catalog
- **WHEN** 声明 shell chrome composition 的模板候选在无当前 accepted certification report 的情况下请求 catalog promotion
- **THEN** promotion 拒绝并报告缺失的认证前置，catalog 保持原状

#### Scenario: 认证不污染 Apply
- **WHEN** 认证链路完成对照并产出 Equivalence Records
- **THEN** 记录停留在认证工件内；Apply checkpoint 校验继续拒绝 oracle identity 或 source-compare 输入进入实现会话

### Requirement: Certification uses source-blind generation
Certification Gate SHALL 使用固定 Visual Oracle revision、candidate package identity 和固定 prompts，通过普通 Apply 生成干净构建；Apply runtime SHALL 不接收原版 checkout、原版样式文件、`meta.sources[]` 实现路径或历史生成物作为实现输入。

#### Scenario: clean regeneration
- **WHEN** gate 为 candidate 执行认证
- **THEN** 它创建或使用显式声明的干净 output root，并记录 Apply Mode、package digest、oracle revision、prompts digest 和 build identity

#### Scenario: implementation isolation
- **WHEN** Apply runtime 请求原版源码路径或历史生成物
- **THEN** certification 失败并报告 source-blind violation，而不是让实现读取 oracle

### Requirement: Pattern Equivalence Record integrity
每个 certification inventory 成员 SHALL 至少有一条 Pattern Equivalence Record。Record SHALL 绑定 stable Pattern ID、package digest、build identity、oracle identity、route 或 composition、state、theme、viewport、verdict 和 evidence refs；缺失身份、身份失配或 verdict 非 `passed | failed` SHALL fail closed。

#### Scenario: complete record
- **WHEN** validator 读取一条 passed record
- **THEN** 它能核对 package、build 和 oracle identity，并找到截图与 assertions 证据文件

#### Scenario: stale build evidence
- **WHEN** record 的 build identity 与当前干净构建不一致
- **THEN** record 不可用于 certification，gate 要求重新生成并复验

### Requirement: Visual assertions support equivalence
Pattern Equivalence Record SHALL 使用 Visual Equivalence 而非像素全等。每条 record SHALL 至少覆盖结构或层级、间距或密度、排版、色彩或表面、边框或分隔线中的相关 assertions；只有截图或主观“一致”结论 SHALL 不能通过。每条 assertion SHALL 引用 oracle 侧测量 evidence ref；无 oracle 侧锚定的自报数值 SHALL fail closed，不得用于 equivalence 判定。

#### Scenario: density mismatch
- **WHEN** oracle 与 current build 的间距或行高几何 assertion 超出声明容差
- **THEN** record 为 failed，gate 不得接受

#### Scenario: equivalent implementation
- **WHEN** DOM 或技术栈不同，但结构、密度、排版、表面和状态呈现满足同一 Pattern assertions
- **THEN** record 可为 passed

#### Scenario: assertion 缺少 oracle 锚点
- **WHEN** 一条 verdict 为 passed 的 record 含未引用 oracle 侧测量的 assertion
- **THEN** gate 失败并要求补齐 oracle 测量或降级为 `self-consistency`

### Requirement: Oracle-measured certification evidence
每条 Pattern Equivalence Record SHALL 引用 oracle 侧可复核证据：真实截图 artifact，或 oracle 侧 DOM / computed-style 测量记录（含 measurement id、方法、单位、采集时间、oracle revision 与内容摘要）。证据 SHALL 通过内容结构校验；占位文件、纯文本说明、仅描述「应如何复现」的文件、以及无 oracle 侧引用的自报数值 SHALL fail closed。

#### Scenario: 占位证据被拒
- **WHEN** record 的 oracle 侧引用指向一个说明「oracle 部署可用时再替换此文件」的文本或 JSON 占位文件
- **THEN** gate 以 `CERT_ORACLE_EVIDENCE_PLACEHOLDER` 失败，record 不得计为 passed

#### Scenario: oracle 侧测量齐备
- **WHEN** record 引用 oracle 侧采集的几何或 computed-style 测量记录，且测量 id 可解析到 oracle revision
- **THEN** gate 可将该 record 判为 passed，并把测量值纳入 equivalence 比对

#### Scenario: 仅自报数值
- **WHEN** assertion 的 observed 值由 candidate 侧单方填写且不引用任何 oracle 侧测量
- **THEN** gate 以 `CERT_ASSERTION_UNANCHORED` 失败

### Requirement: Oracle availability downgrade
oracle 不可部署或无法采集测量时，gate SHALL 输出 `self-consistency` 结论，SHALL NOT 输出 Visual Equivalence 结论；`self-consistency` 结论 SHALL NOT 满足 promotion 前置条件。

#### Scenario: oracle 不可用
- **WHEN** gate 无法访问固定 oracle revision 的可部署实例
- **THEN** gate 输出 `self-consistency` 与缺失项清单，promotion 保持阻断，输出中不得出现 Visual Equivalence 结论

#### Scenario: 降级后尝试发布
- **WHEN** release 请求引用的认证结论为 `self-consistency`
- **THEN** promotion 以 `CERT_SELF_CONSISTENCY_ONLY` 失败

### Requirement: Measured expectation set
gate SHALL 从 oracle 测量产出绑定 package identity 的 measured expectation set，条目 SHALL 至少包含 dimension、method、期望值、容差、oracle evidence ref 与 oracle revision。该集合的 Pattern 覆盖 SHALL 等于或包含 certification inventory；catalog 条目 SHALL 同时携带 package 与 expectation set，缺失或绑定失配 SHALL 拒绝 promotion。

#### Scenario: expectation 覆盖完整
- **WHEN** certification inventory 包含全部需复用 Pattern
- **THEN** expectation set 为每个 inventory 成员提供至少一条 oracle 锚定期望，且每条绑定当前 package digest 与 oracle revision

#### Scenario: expectation 缺失
- **WHEN** catalog 条目缺少 expectation set，或其绑定的 package digest 与当前 candidate 不一致
- **THEN** promotion 以 `EXPECTATION_SET_MISSING` 或 `EXPECTATION_DIGEST_MISMATCH` 失败

#### Scenario: oracle 或 prompts 变化
- **WHEN** oracle revision 或 prompts digest 在 expectation set 生成后变化
- **THEN** expectation set 过期并要求重新认证

### Requirement: Certification inventory checks family coverage
Certification Gate SHALL 从固定 oracle 生成 source-derived certification inventory，并将其与 candidate 的 Page Type → Pattern → Primitive 闭集比对。inventory 中缺失、悬空、重复或粒度错误的成员 SHALL fail closed；inventory 只是 gate 审计输入，SHALL 不写入 package 第八层。

#### Scenario: missing source pattern
- **WHEN** oracle inventory 包含可复用 Pattern，但 candidate 没有等价 stable ID 与 evidence
- **THEN** gate 失败并输出 `package` ownership 缺口

#### Scenario: over-fragmented fact
- **WHEN** candidate 把同一 source-only 视觉事实拆成多个不可复用 micro-primitives
- **THEN** gate 失败并要求按 Fidelity Granularity 合并或调整归属

### Requirement: Failure writeback and regeneration
认证失败差异 SHALL 归类为 `package | apply-skill | certification-prompt`。修复只能写入对应 package、skill、schema、validator 或固定 prompts；随后 SHALL 重新执行 source-blind 干净 Apply 和完整 gate。禁止通过修改上一轮生成物后重跑对照来闭合失败。

#### Scenario: package gap
- **WHEN** record failed 的原因是 pattern 或 token 契约缺失
- **THEN** gate 输出 package feedback，要求更新 candidate 后重新认证

#### Scenario: generated artifact patch
- **WHEN** 认证输出目录在失败后被手工修补并复用旧 identity
- **THEN** gate 因身份过期或 source-blind/regeneration violation 拒绝结果
