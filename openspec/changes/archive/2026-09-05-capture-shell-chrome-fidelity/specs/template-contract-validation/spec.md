## ADDED Requirements

### Requirement: Chrome composition 机器校验
Validator 与 capture runtime SHALL 校验 included shell scene 的 `shell_variant` 闭集、slots 稳定 ID/role/region、同级顺序、header-trigger 与 chat-fab 锚点，以及这些字段对 token/rule 的引用形状。缺字段、未知 role、顺序冲突、锚点 region 不存在或 variant 非 `inset|flush` SHALL 产出稳定 issue code 并使候选失败。literal graph 缺失、非 `repo-literal-graph-v1`、或 shell usage 无 chrome facts 时，structural capture SHALL `unsupported` 或 `incomplete`，不得生成部分 observed shell record。

#### Scenario: 正向 inset 槽位图
- **WHEN** fixture graph 为 shell 声明 inset、有序 workspace-switcher/search/compose，且 header-trigger 锚在 page-header
- **THEN** portable validation 通过，并输出 chrome/slot/variant 的非零计数

#### Scenario: header-trigger 锚到画布
- **WHEN** profile 将 `header-trigger` 锚在 `page-canvas` 而 page-header region 存在
- **THEN** validator 报告锚点 finding 并失败

#### Scenario: 无 graph 文件
- **WHEN** structural capture request 指向不存在或非 closed YAML/JSON 的 graph_path
- **THEN** runtime 以稳定 code 失败，不解析 TSX，不抽样源码

### Requirement: layout 置信度与 sidecar 一致性校验
Portable validator SHALL 检查 `meta.confidence.layout` 与 chrome-complete sidecar 的关系：`high` 要求存在通过校验的 structural `fidelity.yaml` 且每个 included shell scene 具有完整 chrome composition。无 sidecar 的合法 v2 模板在 `layout` 为 medium/low 时 SHALL 通过；为 high 时 SHALL 失败。本检查不得请求 `meta.sources[]` 的本地路径，也不得把 replay `not-run` 当作本 finding 的理由。

#### Scenario: workbench 诚实 baseline
- **WHEN** 无 sidecar 模板将 `confidence.layout` 设为 medium
- **THEN** 该项检查通过

#### Scenario: high 但无 chrome sidecar
- **WHEN** 模板 `confidence.layout` 为 high 且缺少 chrome-complete `fidelity.yaml`
- **THEN** validator 非零退出并报告稳定 code

## MODIFIED Requirements

### Requirement: Structural fixtures 与机器回归
仓库 SHALL 提供不依赖 `example/**` 的正向、负向、mutation 和固定 repo fixtures，覆盖非换行横向 Board、嵌套 scroll domains、navigation/entity-row/button-link context、Dialog 逻辑方向 padding、overlay scope、shell chrome composition（inset vs flush、有序槽位、header-trigger/chat-fab 锚点）、source replay、unknown profile 和 semantic reproducibility。机器结果 SHALL 稳定排序且失败退出码与 findings 一致。

#### Scenario: Negative facts mutation
- **WHEN** fixture 将 navigation link 的 `text_decoration: none` 改为 underline 或删除 Dialog `padding_block_start`
- **THEN** 对应 context/geometry finding 稳定出现且命令非零退出

#### Scenario: Repo fixture 重复运行
- **WHEN** 相同 fixture revision、scope 和 decisions 被重复 capture/normalize
- **THEN** canonical structural digest 一致，任何 record identity/status/unresolved 漂移阻断 eval

#### Scenario: 测试发现 example 路径
- **WHEN** profile validator/eval 的发现域包含 `example/`
- **THEN** governance scope 检查失败，且该路径不得作为 source fixture 或通过证据

#### Scenario: Chrome composition mutation
- **WHEN** fixture 将 `shell_variant` 从 inset 改为 flush，或交换 workspace-switcher 与 compose 的顺序，或把 header-trigger 改锚到 page-canvas
- **THEN** 对应 chrome finding 稳定出现且命令非零退出
