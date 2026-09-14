## ADDED Requirements

### Requirement: Oracle-anchored expectation comparison
Apply 在 Phase 8 SHALL 于模板派生 scenario 之外，消费绑定当前 Active Instance package 的 measured expectation set，对每条 expectation 生成 current-build 比对记录（期望值、实测值、容差、结论、证据引用）。比对 SHALL NOT 读取 oracle 实例、oracle checkout 或 `meta.sources[]` 实现路径；expectation set 是唯一允许携带 oracle 侧测量的输入。expectation 缺失、过期或绑定失配时，Apply SHALL 把该 package 的保真状态标为 `fidelity-unverified`，SHALL NOT 输出保真通过结论。

#### Scenario: expectation 比对通过
- **WHEN** 当前构建在声明容差内满足全部 expectation，且 oracle/package 身份与 Active Instance 一致
- **THEN** Phase 8 记录逐条比对结果并允许保真结论

#### Scenario: expectation 超差
- **WHEN** 实测值与 expectation 的偏差超出声明容差
- **THEN** Phase 8 记录 failed 并要求按 `package | apply-skill` 归属回写，不得修改生成物闭合

#### Scenario: package 无 expectation set
- **WHEN** Active Instance 绑定的 published package 未携带 measured expectation set
- **THEN** Apply 显式标注 `fidelity-unverified` 并在汇报中说明未做 oracle 锚定比对，不得声称保真通过

#### Scenario: expectation 被用作 oracle 通道
- **WHEN** Apply 请求 oracle 实例、oracle 源码或历史生成物，或把 expectation set 之外的 oracle 侧数据写入 checkpoint
- **THEN** 触发 source-blind 违规判定，session 停止

### Requirement: Expectation drift revalidation
Phase 8 的 expectation 比对结果 SHALL 绑定 package digest、expectation set digest、build identity 与 browser identity；任一身份变化 SHALL 使既有比对结果过期，并要求重新比对。

#### Scenario: expectation set 更新
- **WHEN** 同一 package digest 下 expectation set 内容变化
- **THEN** 既有 Phase 8 比对结果失效，Apply 重新执行比对

#### Scenario: 构建变化
- **WHEN** build identity 变化而 expectation set 未变
- **THEN** 既有比对结果不得复用，必须对当前构建重新取证
