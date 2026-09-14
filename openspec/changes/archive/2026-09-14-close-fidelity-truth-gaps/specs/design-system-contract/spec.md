## ADDED Requirements

### Requirement: Provenance, coverage and confidence consistency
统一 validator SHALL 在 package 与 active 校验中对 provenance、coverage 与 confidence 实施交叉校验，任一不一致 SHALL fail closed 并输出稳定错误码：evidence 的 `source_id` 与 `source_revision` MUST 解析到 `meta.sources[]` 中声明的来源；coverage 的每个 `declared` 项 MUST 恰属 `observed`、`defaulted`、`unsupported` 之一，三者两两互斥；`overall` confidence MUST NOT 高于必需维度中的最弱值，且某维度存在 `defaulted` 项时该维度 MUST NOT 为 `high`。

#### Scenario: evidence 指向未声明 revision
- **WHEN** evidence 条目的 `source_revision` 不在 `meta.sources[]` 任何声明的 revision 集合内
- **THEN** 校验以 `EVIDENCE_REVISION_UNDECLARED` 失败并指出该 evidence id

#### Scenario: coverage 未分类或重叠
- **WHEN** 某 `declared` 项未出现在任一分类数组，或同时出现在两个分类数组中
- **THEN** 校验以 `COVERAGE_PARTITION_INVALID` 失败并列出受影响项

#### Scenario: confidence 与 coverage 冲突
- **WHEN** `overall` 高于最弱必需维度，或某维度存在 `defaulted` 项却声明 `high`
- **THEN** 校验以 `CONFIDENCE_INCONSISTENT` 失败并指出维度

#### Scenario: 合法 package 不受影响
- **WHEN** evidence 来源可解析、coverage 为完备互斥分划且 confidence 与 coverage 一致
- **THEN** 校验通过，既有 digest 与 stable identity 语义不变

### Requirement: Oracle evidence structural validation
统一 validator SHALL 对认证报告中的 oracle 侧证据实施结构校验：证据引用 MUST 解析到存在且非占位的 artifact；声明为测量的证据 MUST 携带 measurement id、方法、数值或闭集语义、单位与 oracle revision；声明为截图的证据 MUST 通过图像内容校验。占位或结构不合规的证据 SHALL 使相关 Pattern Equivalence Record 失败。

#### Scenario: 占位文件伪装 oracle 证据
- **WHEN** oracle 证据引用解析到内容是复现说明的文本或 JSON 文件
- **THEN** 校验以 `CERT_ORACLE_EVIDENCE_PLACEHOLDER` 失败

#### Scenario: 测量结构不完整
- **WHEN** 测量证据缺少 measurement id、方法或 oracle revision 之一
- **THEN** 校验失败并指明缺失字段

#### Scenario: 截图为真实图像
- **WHEN** 截图证据通过图像内容校验并绑定同一 oracle revision
- **THEN** 该证据可用于 equivalence 判定
