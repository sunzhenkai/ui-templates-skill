## MODIFIED Requirements

### Requirement: Structural contract eval 与方差报告
Contract eval SHALL 增加不依赖 `example/**` 的 repo Authoring 与 Apply cases，验证固定 revision/scope 的 canonical structural semantics、source replay、required scenario identities、负向 mutations，以及 **shell chrome composition**（variant、有序槽位、trigger/FAB 锚点、无 graph 失败、layout-high-without-chrome）。普通 CI SHALL 以确定性 script judges 阻断 schema/refs/replay/identity/chrome 漂移；受控多 Agent 方差评估 SHALL 记录 runtime/model fingerprint，不以自然语言主观评分替代 semantic assertions。

#### Scenario: Authoring semantic reproducibility
- **WHEN** 相同固定 repo fixture 被重复 Authoring
- **THEN** eval 报告 profile digest、record identities/status/unresolved 集合一致，任一语义漂移失败

#### Scenario: Apply assertion reproducibility
- **WHEN** 多个 Apply Agent 消费同一 profile 和 scope
- **THEN** Phase 2/4 constraints 与 Phase 8 required scenario ID 集合一致，即使目标实现结构不同

#### Scenario: LLM 方差评估未授权
- **WHEN** 普通离线 CI 没有显式授权模型调用
- **THEN** runner 只执行 script judges 和固定资产校验，不发送来源仓库、模板或用户数据到外部服务

#### Scenario: Chrome composition eval
- **WHEN** eval 运行 chrome 正向 fixture 与 inset→flush / 槽位重排 / 无 graph 负向 cases
- **THEN** 正向 digest 稳定；负向 cases 以稳定 issue code 失败；输入路径不含 `example/**`

### Requirement: Example 治理排除保持有效
本 change 的 root validation、profile fixtures、source replay、eval、bundle、mirror 和 release evidence SHALL 明确排除 `example/**`。任何任务 SHALL 不修改、格式化、迁移、运行或 promote `example/workbench-shell/web-v1/**`、`example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 或其他生成样例代码；样例质量 SHALL 不决定本 change 通过。

#### Scenario: Root governance 验收
- **WHEN** 执行本 change 的 validate/test/eval/bundle/mirror 检查
- **THEN** 机器报告声明 `example/**` exclusion，且没有命令把样例路径作为输入或测试根

#### Scenario: Example 代码出现已知缺陷
- **WHEN** 生成样例存在 link、Dialog、layout 或其他实现问题
- **THEN** 本 change 只修模板契约、生产 skill 和治理 fixtures，不修改样例代码，也不将样例结果声明为已修复

#### Scenario: Diff 触及 example
- **WHEN** 实现或生成器产生 `example/**` diff
- **THEN** scope guard 失败并要求移除该 diff，不能通过更新 baseline 隐藏
