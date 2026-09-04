## Why

从仓库导入的 `workbench-shell` 与上游 Multica 壳不一致，不是 Apply 写错样例，而是 Authoring 只落下 token 和 A–E 抽象模式，没有把壳的变体、槽位顺序和锚点做成可验证事实。现有 `repo-structural-v1` 能约束滚动域和盒模型，却允许一份只有 `arrangement: horizontal` 的 shell scene 以 structural 名义发布；literal graph 又没有配套生成步骤，Agent 会退回散文抽样。现在需要堵住这条导入路径，否则后续 Apply 只能合法地长出通用工作台。

## What Changes

- 扩展 `repo-structural-v1` 的 layout topology：included **shell scene** 必须记录 chrome composition——有序槽位、shell 变体（`inset | flush`）、header trigger / FAB 的 region 锚点；`contains` 关系对同级 region 有稳定顺序。精确值仍只由 `tokens.yaml` 携带。
- 修改 repo Authoring：structural Generate-from-source 在缺 closed literal graph、graph 未覆盖声明 shell 的 chrome composition、或用 A–E/泛化文档覆盖来源 IA 时 **fail closed**，不得 Index，也不得把 `confidence.layout: high` 写进无 sidecar 候选。不引入 TSX/JS parser，也不执行来源代码；调用方必须在 session source 内提交完整 graph，capture 只校验闭包与 chrome 完整性。
- 双源导入时 **repo 壳拓扑优先于泛化设计文档**。`page_modes` A–E 只是 Apply 验收映射，不是导入时替换来源 scene/IA 的 schema。文档来源只补文档里真正给出的 token/规则。
- 扩展 validator、capture format、eval 与 Apply Phase 2/8：校验有序槽位、变体、锚点；Apply 不得在 profile 声明 `inset` 时改成左右硬切，也不得把 header-trigger 挪到画布悬浮控件。无 sidecar 的已发布 v2 模板继续 portable baseline，不得因此向用户索要历史路径。
- 已发布 `templates/workbench-shell/`：无 session source 时保持无 source-direct `fidelity.yaml` 的 `legacy-baseline`；将 `confidence.layout` 降为与缺失 chrome sidecar 一致的诚实值；prose 澄清 A–E 是映射而非壳配方。仅当用户本会话提供与声明 revision 一致的 session source 时，才允许 Generate-from-source 写入 chrome records。Chrome 的机器正向/负向证据由非 `example/**` fixtures 承担。
- **BREAKING**（仅 Authoring 完成条件）：新的 structural repo 导入若只有 token + 散文布局、或 shell scene 缺少 chrome composition，不得宣称完成。现有无 sidecar 模板的 portable 消费不破坏。
- 明确排除 `example/**`（含 `web-v1`/`web-v2`/`web-v3`）；不读取、修改、运行或以样例质量决定通过。不引入 schema v3、完整 UI DSL、AST 发布、stack adapter 或 runnable starter。不自动 archive `harden-template-lifecycle`、publish 或 tag。

## Capabilities

### New Capabilities

- （无）chrome composition 是 `structural-fidelity-profile` 的 layout topology 扩展，不新开 schema family。

### Modified Capabilities

- `structural-fidelity-profile`: layout scene 增加 shell 变体、有序 chrome 槽位与 trigger/FAB 锚点；缺这些的 included shell scene 不得标 observed structural。
- `ui-template-workflow`: structural 导入必须有 chrome-complete literal graph；禁止 A–E/文档泛化覆盖源 IA；无 sidecar 不得报 layout high；双源时 repo 壳拓扑优先。
- `template-contract-validation`: validator/capture 校验槽位顺序、变体、锚点、graph 缺失与 layout-confidence 门禁；fixtures 覆盖 inset vs flush 与 trigger 错锚。
- `ui-template-apply-workflow`: Phase 2/8 消费 chrome composition；profile 声明 inset/有序槽位时不得用 flush 硬切或画布悬浮 trigger 替代。
- `workbench-shell-implementation`: 诚实降级 layout confidence；A–E 降回映射；chrome 证据由 fixtures 承担；有 session source 才允许补 sidecar。
- `skill-lifecycle-governance`: bundle/eval/mirror 包含 chrome composition schema、fixtures 与 cases；继续排除 `example/**`。

## Impact

- 生产契约：`skills/ui-template/`（尤其 `source-repo.md`、`repo-capture-format.md`、`spec-format.md`、Authoring gate）、`skills/ui-template-apply/` Phase 2/8、`schemas/template/fidelity/v1/`、capture runtime、validator。
- 治理：非 example fixtures/eval、bundle allowlist、生产镜像、兼容矩阵（profile 语义增强；core v2 仍可读）。
- 真实模板：`templates/workbench-shell/` 仅做诚实 confidence 与 A–E 映射澄清；无用户给出的 session source 时不写 source-direct sidecar，不索取 multica 本地路径。
- 变更关系：按 `harden-template-lifecycle` 的 effective contract（base + 未归档 overlay）规划；归档该前置 change 需单独授权。
- 非目标：`example/workbench-shell/**`、通用 TSX parser、把 A–E 从 Apply 验收中删除。
