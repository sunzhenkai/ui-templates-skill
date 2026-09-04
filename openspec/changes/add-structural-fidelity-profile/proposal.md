## Why

同一代码仓库经不同 Agent 导入或消费后会出现显著结构与细节漂移，因为现有 schema v2 只确定 token 值，未机器表达非常规 layout 的区域/滚动关系、组件盒模型的 token 映射和按上下文区分的交互状态；现有 repo 抽样与 eval 仍允许 Agent 用常见默认值补齐。现在需要在不引入技术栈实现代码、不破坏既有 v2 模板的前提下，为仓库来源增加可重放、可验证的结构保真契约。

## What Changes

- 新增独立版本化的 `fidelity.yaml` compatible sidecar，profile `repo-structural-v1` 只表达三类技术栈无关、浏览器可观察事实：layout topology、component geometry、contextual state presentation；精确数值继续只由 `tokens.yaml` 携带，sidecar 仅引用 token path、稳定 rule ID 和直接来源 provenance。
- 修改 repo Authoring：新建/更新 repo 来源模板默认选择 structural profile；只有用户明确要求仅提取视觉语言时才使用 style-only。用固定 source revision、明确 scope 和 scope-relative usage closure 替代任意“追踪 3–5 个代表组件”，禁止把单一 context 的行为自动推广为全局规则，并将 `none`、不换行、不滚动等 negative facts 作为一等记录。
- 扩展 validator 与 Authoring source replay：校验 profile schema、token/rule/source 引用、scroll owner、上下文冲突、盒模型完整性、禁入工程内容及 unresolved 状态；有来源 checkout 时重放 locator/source-span digest，portable validation 不假设来源仓库仍存在。
- 修改 Apply：在既有 Phase 2/4/8 分别消费 layout、geometry/state 和确定性浏览器断言，不新增阶段、不要求目标源码或 DOM 同构；无 profile 的旧 v2 模板继续按 baseline fidelity 消费并明确报告降级。
- 将 `templates/workbench-shell/` 作为真实 repo+doc 正向实例，补充 source-direct structural fidelity 记录，并增加 navigation/list-row link hover、Dialog 顶部 padding、Board/主从滚动与 overlay scope 等回归证据。
- 扩展 contract eval、mutation fixtures、portable bundle/mirror 和兼容文档，使固定 repo fixture 的重复 Authoring 结果及多个 Apply Agent 生成的 required assertion identities 可比较。
- 明确排除 `example/**`，尤其 `example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 及任何生成样例代码；本 change 不读取、修改、运行或以样例质量决定通过，也不自动 archive 既有 change、publish、tag 或 promote 样例。
- 不引入 schema v3、完整 UI/组件 DSL、通用 AST/call-graph 发布、stack adapter、依赖/目录/API/data/state 选型或 runnable starter。

## Capabilities

### New Capabilities

- `structural-fidelity-profile`: 定义 repo structural profile sidecar、三类 source-derived observables、provenance、兼容降级、验证与可重复性契约。

### Modified Capabilities

- `ui-template-workflow`: repo Authoring 增加 fidelity profile 选择、确定性 scope/usage closure、上下文保留和 profile gate。
- `template-contract-validation`: validator 增加 structural profile、source replay、引用/冲突/完整性和 negative fixture 行为。
- `ui-template-apply-workflow`: Apply 在既有阶段消费 profile，并以 current-build computed style、geometry、scroll/overlay 与 state evidence 阻断偏差。
- `workbench-shell-implementation`: workbench-shell 模板增加结构保真正向实例和对应模板级验收，不涉及任何 example 实现。
- `skill-lifecycle-governance`: 双-skill bundle、eval、兼容矩阵和镜像包含 profile schema/runtime/fixtures，并保持 `example/**` 治理排除。

## Impact

- 生产契约与文档：`skills/ui-template/`、`skills/ui-template-apply/`、`schemas/`、active OpenSpec delta、README/AGENTS/发布兼容说明。
- 可执行治理：`scripts/template_validation/`、repo capture/source replay runtime、contract eval runner/fixtures/tests、bundle allowlist、生产镜像和 release metadata。
- 真实模板：`templates/workbench-shell/` 与 `templates/INDEX.md` 的必要一致性更新；不得从排除样例反推模板决定。
- 兼容性：schema v2 core 保持可读；`fidelity.yaml` 自带独立版本。旧 v2 模板无 sidecar 时仍可消费但报告 baseline fidelity；新 repo Authoring 默认产生 structural profile，未知 profile fail closed 或按明确兼容策略拒绝。
- 变更关系：本 change 按 `harden-template-lifecycle` 的 effective contract 规划；若归档，顺序必须先归档该前置 change，再归档本 change，且归档动作需单独授权。
