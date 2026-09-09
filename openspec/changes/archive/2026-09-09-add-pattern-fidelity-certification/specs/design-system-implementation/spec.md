## ADDED Requirements

### Requirement: Single source-blind implementation contract
Apply 的公开实现契约 SHALL 只有 `bootstrap | increment` 两种 Apply Mode；Apply SHALL 不定义或执行 source oracle 对照模式，SHALL 不读取原版 checkout、`meta.sources[]` 实现路径或历史生成物。原版对照结果只能作为模板治理链路的输入，不能改变 Apply 的实现依据。

#### Scenario: user asks for original alignment
- **WHEN** 用户要求对齐原版视觉
- **THEN** Apply 仍只消费 digest 一致 Active Instance，并将原版对照需求移交给模板认证或反馈链路

#### Scenario: source compare artifact appears in apply session
- **WHEN** Apply checkpoint 将 source oracle 或 source-compare 记录为实现依据
- **THEN** runtime 或 validator fail closed 并报告 source-blind violation

### Requirement: Pattern-bound business composition
Included route SHALL 映射到已声明 Page Type，并只组合该 Active Instance 中可解析的 Pattern 与 Primitive。业务页可以引入业务数据和局部展示结构，但可复用交互件、组合布局和页面骨架缺失时 SHALL 生成 package feedback，不得私造新的 reusable semantic 层。

#### Scenario: route uses declared pattern
- **WHEN** 实现一个 collection 页
- **THEN** Phase 证据记录其 page type、pattern 与 primitive 引用，并验证引用目标存在

#### Scenario: reusable control is absent
- **WHEN** 页面需要 package 未声明的可复用交互控件
- **THEN** Apply 停止该复用层实现并生成引用 stable ID 语义的 package feedback
