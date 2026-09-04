## ADDED Requirements

### Requirement: Structural profile 分发资源
双-skill bundle SHALL 包含 structural profile schema、portable internal validator、source replay 能力、固定 non-example fixtures、eval cases 和兼容说明。Authoring 与 Apply 的受管镜像 SHALL 由生产 allowlist 生成并对这些资源执行零漂移检查。

#### Scenario: 构建 profile-capable bundle
- **WHEN**maintainer 构建包含 structural fidelity 能力的 bundle
- **THEN**安装后的 `ui-template` 可生成/验证/replay profile，`ui-template-apply` 可消费 profile，全部引用 schema/fixtures/runtime 均存在且 manifest digest 正确

#### Scenario: Bundle 缺 profile schema
- **WHEN**SKILL/reference 声明 structural profile 但 artifact 缺少 schema、runtime 或 fixture
- **THEN**bundle validation 失败且不得发布

### Requirement: Structural contract eval 与方差报告
Contract eval SHALL 增加不依赖 `example/**` 的 repo Authoring 与 Apply cases，验证固定 revision/scope 的 canonical structural semantics、source replay、required scenario identities 和负向 mutations。普通 CI SHALL 以确定性 script judges 阻断 schema/refs/replay/identity 漂移；受控多 Agent 方差评估 SHALL 记录 runtime/model fingerprint，不以自然语言主观评分替代 semantic assertions。

#### Scenario: Authoring semantic reproducibility
- **WHEN**相同固定 repo fixture 被重复 Authoring
- **THEN**eval 报告 profile digest、record identities/status/unresolved 集合一致，任一语义漂移失败

#### Scenario: Apply assertion reproducibility
- **WHEN**多个 Apply Agent 消费同一 profile 和 scope
- **THEN**Phase 2/4 constraints 与 Phase 8 required scenario ID 集合一致，即使目标实现结构不同

#### Scenario: LLM 方差评估未授权
- **WHEN**普通离线 CI 没有显式授权模型调用
- **THEN**runner 只执行 script judges 和固定资产校验，不发送来源仓库、模板或用户数据到外部服务

### Requirement: Profile 兼容与发布语义
兼容矩阵、manifest 和 changelog SHALL 分别声明 template core schema 范围与 structural profile schema/profile 范围。无 sidecar 的 v2 模板 SHALL 保持 baseline 支持；未知 profile 或破坏性 profile 变化 SHALL 按兼容策略拒绝或提升约定版本，并提供迁移/回滚说明。

#### Scenario: 向后兼容 profile 增强
- **WHEN**bundle 增加 optional structural profile 支持且不改变 v2 core 解析
- **THEN**release metadata 声明 baseline v2 与 profile-capable 路径，旧模板继续可安装消费

#### Scenario: Profile schema 不兼容变化
- **WHEN**closed enums、record identity 或 required semantics 发生不兼容变化
- **THEN**profile version 和相应 skill/bundle version 按策略提升，旧 profile 不被静默按新语义读取

### Requirement: Example 治理排除保持有效
本 change 的 root validation、profile fixtures、source replay、eval、bundle、mirror 和 release evidence SHALL 明确排除 `example/**`。任何任务 SHALL 不修改、格式化、迁移、运行或 promote `example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 或其他生成样例代码；样例质量 SHALL 不决定本 change 通过。

#### Scenario: Root governance 验收
- **WHEN**执行本 change 的 validate/test/eval/bundle/mirror 检查
- **THEN**机器报告声明 `example/**` exclusion，且没有命令把样例路径作为输入或测试根

#### Scenario: Example 代码出现已知缺陷
- **WHEN**生成样例存在 link、Dialog、layout 或其他实现问题
- **THEN**本 change 只修模板契约、生产 skill 和治理 fixtures，不修改样例代码，也不将样例结果声明为已修复

#### Scenario: Diff 触及 example
- **WHEN**实现或生成器产生 `example/**` diff
- **THEN**scope guard 失败并要求移除该 diff，不能通过更新 baseline 隐藏

### Requirement: Active change 顺序与历史边界
本 change SHALL 以 `harden-template-lifecycle` effective contract 为前置语义。若两个 changes 归档，maintainer SHALL 先归档前置 change，再归档本 change；任何 archive、publish、tag 或 sample promotion SHALL 需要独立请求。Immutable archive/patch/experience SHALL 不因 profile 术语做历史重写。

#### Scenario: 前置 change 尚未归档
- **WHEN**本 change 进行规划、实现或验证
- **THEN**工具按 base 加 active delta 解析 effective contract，不为消除 pending overlay 提前修改 base specs

#### Scenario: 准备归档本 change
- **WHEN**maintainer 请求归档但前置 change 仍 active
- **THEN**归档流程停止并要求先单独完成前置 change 的验证与归档
