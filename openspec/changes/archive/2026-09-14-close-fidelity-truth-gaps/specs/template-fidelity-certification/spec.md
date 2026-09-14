## ADDED Requirements

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

## MODIFIED Requirements

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
