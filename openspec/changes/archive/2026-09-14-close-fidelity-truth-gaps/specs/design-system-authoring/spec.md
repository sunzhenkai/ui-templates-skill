## MODIFIED Requirements

### Requirement: L0–L6 映射与诚实覆盖
Author SHALL 将 L0 身份、L1 chrome、L2 token、L3 scene/route、L4 primitive、L5 pattern 和 L6 apply mapping 映射到统一 package 对应层；coverage SHALL 以 observed、defaulted、unsupported 闭集记录，且 defaulted 证据不得支撑 high confidence。coverage SHALL 是 `declared` 的完备互斥分划：每个声明项恰属一个分类数组，不得遗漏或跨数组重复。维度 confidence SHALL NOT 高于覆盖事实所能支撑的程度，`overall` SHALL NOT 高于必需维度中的最弱值。写入 evidence 的每条 source 证据 SHALL 引用 `meta.sources[]` 中声明的 source id 与 revision；本次未声明来源 SHALL NOT 出现在 evidence 中。

#### Scenario: source 出现 chrome 与 components
- **WHEN** session source 包含 shell、token 和原子/复合组件
- **THEN** Author 分别写入 layout、tokens、primitives、patterns 的 stable IDs 与 source evidence

#### Scenario: 大量默认补全
- **WHEN** 多个组件只有默认值而缺少 source evidence
- **THEN** Author 标记 defaulted，并把相关 confidence 限制在非 high

#### Scenario: coverage 分划不完整
- **WHEN** 某声明项未出现在 observed、defaulted、unsupported 任一数组，或同时出现在两个数组
- **THEN** Author 在 Index 前修正分划，不得提交至 production INDEX

#### Scenario: evidence 混入未声明来源
- **WHEN** evidence 条目引用的 source revision 不在本次 `meta.sources[]` 声明集合内
- **THEN** Author 补齐来源声明或重新采集该条目，不得保留无出处的 provenance

#### Scenario: 维度 confidence 与实际覆盖冲突
- **WHEN** 某维度存在 defaulted 项而 confidence 声明为 high，或 `overall` 高于最弱必需维度
- **THEN** Author 下调 confidence 或补齐 source 证据后再校验
