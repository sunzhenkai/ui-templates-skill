## ADDED Requirements

### Requirement: Architecture site detection ignores session state

Apply 的 architecture-site 判定 SHALL 只依据输出根内的应用源码与依赖清单；会话状态目录（`.ui-template-apply` 账本、`.ui-template-design` Active Instance、`.git`）SHALL NOT 使输出根被判为 `existing`。adopt-only bootstrap 先落 Active Instance 后，输出根 SHALL 仍判定 `greenfield` 并等待架构确认。

#### Scenario: adopt 后仍判定 greenfield

- **WHEN** 输出根仅含 `.ui-template-design/`（design-system.yaml、binding.yaml、core/）与 `.ui-template-apply/`
- **THEN** `architecture-site` 判定 `greenfield`

#### Scenario: 工程文件出现仍判定 existing

- **WHEN** 同一输出根出现 `package.json` 或应用源码文件
- **THEN** `architecture-site` 判定 `existing`，与会话状态目录无关

### Requirement: Derivable Phase 8 scenario enumeration

Phase 8 required scenario 全集 SHALL 可由只读工具从 fidelity profile、Active Instance `core/layout.yaml` placement 与 measured expectation set 确确定性枚举，且与 checkpoint 校验的 fail-closed 集合同源同值。Apply 会话 SHALL 在采集 evidence 前获得该全集。

#### Scenario: 采集前枚举全集

- **WHEN** 会话以 fidelity/layout/expectations 三输入运行 `scenarios` 子命令
- **THEN** 输出的 scenario ID 集合与 checkpoint 对同一模板执行 `FIDELITY_SCENARIO_COVERAGE_MISSING` 校验所要求的集合一致

#### Scenario: 无 structural sidecar

- **WHEN** 模板不携带 fidelity sidecar 或 conformance 非 structural
- **THEN** 枚举结果为空集，chrome composition 类 scenario 保持 unavailable 语义

### Requirement: Apply artifact write-time lint

Apply 状态工具 SHALL 提供只读的产物写时校验入口，对单个 `.ui-template-apply` 产物报告：YAML/JSON 可解析、无裸日期（时间戳必须是带引号字符串）、digest 字段必须是 `{algorithm, value}` canonical 对象、值可 canonical JSON 编码。该校验 SHALL NOT 修改任何文件，SHALL NOT 替代 checkpoint/verification 门禁。

#### Scenario: 裸日期与字符串 digest 被拒

- **WHEN** 产物含 `created_at: 2026-09-20`（裸日期）或 `template_digest: git:abc`（身份字符串）
- **THEN** lint 以非零退出报告对应 finding

#### Scenario: 合规产物通过

- **WHEN** 时间戳为带引号字符串、digest 为 canonical 对象、flow 序列条目已加引号
- **THEN** lint 通过且不改动文件
