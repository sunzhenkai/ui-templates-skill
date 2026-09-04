## 1. Effective contract 与 scope guard

- [x] 1.1 在实现开始前确认 `harden-template-lifecycle` 仍为 complete-but-active，并记录本 change 按 base specs 加该 active delta 实现；不得为消除 overlay 修改 base specs，也不得执行 archive。
- [ ] 1.2 仅检查仓库级 changed-path 名称元数据，确认当前没有以 `example/` 开头的变更；若存在则停止并请求隔离，不读取或处理文件内容。
- [ ] 1.3 扩展 governance scope guard，使 changed-path、fixture discovery、source binding、validator/eval input 或生成输出一旦包含 `example/` 前缀即以稳定 finding 失败；测试资产只能放在非 example 路径。
- [ ] 1.4 记录 core v2 模板、workbench 模板、validator/eval、bundle manifest 与镜像的实现前基线，且所有命令输入显式排除 `example/**`。

## 2. Fidelity v1 schema 与 canonical identity

- [ ] 2.1 在独立于 `schemas/template/v2/` 的 versioned schema family 中定义 `fidelity.yaml` 顶层 receipt、`repo-structural-v1` profile、structural/style-only conformance、platform、scope、provenance 和 unresolved 状态。
- [ ] 2.2 为 `layout_scenes` 定义 closed region/relation、arrangement、fill/shrink/wrap、per-axis scroll domain、unique owner、overlay scope/anchor 和 responsive mode 结构，允许多个独立或嵌套 scroll domains。
- [ ] 2.3 为 `component_geometry` 定义 component/slot identity、逻辑方向 padding/gap/inset/size/radius/surface/border/shadow token refs 以及 `none`/`zero`/`auto` 等闭集语义值。
- [ ] 2.4 为 `state_presentations` 定义 subject role、context、state、surface、背景/文字/边框角色、text decoration、visibility 和 container presentation，确保 negative facts 是显式 expected。
- [ ] 2.5 实现 profile loader 与 canonicalizer：稳定排序无序集合，保留 record/relationship/token/rule/source refs、negative facts、status、source-span digest 和 unresolved 集合，并忽略允许的 YAML/prose/locator 行号噪声。
- [ ] 2.6 将 canonical profile digest 纳入现有 template semantic identity，同时保持 core v2 无 sidecar 模板可标识为 legacy baseline，style-only receipt 可与 legacy baseline 区分，未知 schema/profile fail closed。
- [ ] 2.7 在非 example fixture 目录添加 structural、style-only、legacy baseline、unknown profile、canonical ordering 与 semantic-change vectors，并用单元测试固定 digest 和 identity 行为。

## 3. Portable validator 与 source replay

- [ ] 3.1 扩展模板发现与 schema validation，使可选 `fidelity.yaml` 走独立 profile schema，并输出按 conformance/facet/record/status 的稳定计数。
- [ ] 3.2 实现稳定 ID、rule/token/source ref、provenance 字段、unresolved 互斥状态和跨文件职责边界校验，拒绝 sidecar 复制精确 scalar token 值或创建悬空 rule。
- [ ] 3.3 实现 layout semantic checks：region/overlay 引用、每个 scroll domain 恰好一个 owner、多个 domain 合法、non-wrap/non-shrink/scroll boundary negative facts 完整。
- [ ] 3.4 实现 component geometry completeness 和 contextual state conflict checks，覆盖 Dialog 四向 padding 缺失、相同 context/state 的 `none`/`underline` 冲突及跨 context 非法推广。
- [ ] 3.5 实现 normative engineering-boundary checks，拒绝 framework/package/import/CSS class/hook/source directory/API/mock/data/state/runnable command，同时允许 provenance 中受限的安全相对 locator。
- [ ] 3.6 实现显式 source-ID→authorized-root replay：校验固定 revision、realpath/symlink/traversal 边界、locator、规范化 source-span SHA-256、usage closure receipt 与 published record，且永不执行来源代码或自动联网。
- [ ] 3.7 为 candidate-template/old-snapshot locator laundering、错误 checkout、revision mismatch、span mismatch 和 unresolved conflict 生成稳定 source-boundary findings。
- [ ] 3.8 在 portable 模式报告 replay `not-run`；在 structural Authoring 模式要求 `declared = resolved = executed = passed`，并保持所有 findings 稳定排序且退出码与汇总一致。
- [ ] 3.9 添加 validator/replay 正向、负向与 mutation tests，覆盖 Board、嵌套 scroll domains、Dialog、link contexts、overlay、unknown profile、path security 和 aggregate findings，且 scope guard 证明 discovery 未进入 `example/**`。

## 4. Repo Authoring workflow

- [ ] 4.1 更新 `skills/ui-template` 的 format/source-repo references，明确 `spec.md`、`tokens.yaml`、`fidelity.yaml`、split docs 和 `apply/` 的权威分工以及 profile v1 的三 facet/Non-Goals。
- [ ] 4.2 更新 repo Intake：固定授权、revision、platform 和 scene/component/context scope；默认 structural，只有用户明确要求视觉语言时才生成带理由且无伪造 structural records 的 style-only receipt。
- [ ] 4.3 实现声明安全子集内的 deterministic scope-relative usage closure，稳定输出 definitions、exports/imports、usages、exclusions、dynamic/unresolved 和摘要；移除“3–5 个代表组件”完成标准。
- [ ] 4.4 对 ambiguous theme/entry/definition、动态表达式、资源上限和同 context/slot 冲突实现 fail-unresolved/收窄 scope 行为，不做多数表决、静默抽样或常见默认推断。
- [ ] 4.5 实现 context-preserving normalization 与 negative-fact capture，使 navigation/entity-row/button/prose links、non-wrap/non-shrink、无 root scroll、无 shadow 等 facts 只在完整 closure 支持的范围内发布。
- [ ] 4.6 更新 Generate/Validate/Eval/Report gate：在 staging 生成 sidecar 与 capture receipt，required replay/reproducibility/eval 全通过后才更新 production template/INDEX，失败时保持 production INDEX 不变。
- [ ] 4.7 更新 `skills/ui-template/SKILL.md` 和相关 authoring report examples，报告 profile/version/scope/canonical digest/replay identity/unresolved 以及 baseline/style-only 降级，不引入 stack adapter 或 runnable starter。
- [ ] 4.8 添加 repo Authoring contract tests，验证相同 revision/scope/decisions 重复生成相同 profile digest、record identities/status/unresolved 集合，并验证 structural replay 不可运行时不能报告完成。

## 5. Apply Phase 0/2/4/8/9 integration

- [ ] 5.1 更新 `skills/ui-template-apply` template contract 与 Phase 0 Intake，校验 supported profile，记录 conformance/scope/digest/unresolved decisions，并对 legacy baseline、style-only 和 unknown profile 给出不同结果。
- [ ] 5.2 实现 Phase 2 layout projection，把 included scene records 转为稳定 region/arrangement/fill/shrink/wrap/scroll/overlay/responsive constraint IDs，不要求目标 DOM 或技术栈同构。
- [ ] 5.3 实现 Phase 4 geometry/state projection，把 component slot token mappings 和 contextual state negative facts 纳入 component inventory/token map，禁止组件库默认值覆盖 profile expected。
- [ ] 5.4 实现 Phase 8 deterministic scenario-ID derivation，并为 computed style、logical bounding geometry、scroll owner/overflow、state transition、overlay scope 和 Accessibility tree 定义 required expected/actual evidence；截图仅作辅助。
- [ ] 5.5 扩展 checkpoint invalidation：layout semantic change 从 Phase 2 重开，geometry/state change 从 Phase 4 重开，相关 Phase 8 evidence 全部过期，且无需新增 checkpoint 字段或 Apply phase。
- [ ] 5.6 更新 Phase 9 review/feedback，使 reusable mismatch 引用 profile record/rule/current-build identities，目标技术栈局部问题保留在消费项目。
- [ ] 5.7 更新 `skills/ui-template-apply/SKILL.md`、references、state/schema 和 fixtures，保持 Phase 0–9 单一状态机并禁止发布实现 adapter。
- [ ] 5.8 添加 Apply contract tests，覆盖 Board/root scroll、master/detail 双 scroll owner、Dialog 顶部 padding、link context decoration、overlay scope、不同 DOM 实现相同 assertion IDs 及 facet-specific recovery。

## 6. Workbench-shell structural pilot

- [ ] 6.1 仅使用 `templates/workbench-shell/meta.yaml` 声明的固定 repo/doc revisions 和授权本地 source roots，建立 source-direct replay receipt；若 checkout/revision 不可用则停止，不联网补取，也不以旧模板 snapshot locator 代替上游证据。
- [ ] 6.2 创建 `templates/workbench-shell/fidelity.yaml` 的 Web shell/canvas、Board non-wrap/non-shrink/inline scroll、master/detail 独立 block scroll、resizable boundary 和 responsive mode records，所有精确值引用现有 tokens。
- [ ] 6.3 添加 canvas-scoped/global overlay scope/anchor records，确保 portal/registry 实现不会把视觉归属误写成 DOM parent 或扩大到错误容器。
- [ ] 6.4 添加 Dialog content/header/close/footer 的四向逻辑 padding、gap、inset、surface、radius、shadow 与 border records，并用 direct provenance 证明 `padding_block_start`。
- [ ] 6.5 添加 navigation-link、entity-row-link、button-link 与 inline-prose-link 的 default/hover/focus records，保留 background/container state 与 `text_decoration: none`/`underline` 的 context boundary。
- [ ] 6.6 更新 workbench active `spec.md`/split docs/rule refs、`apply/quality.md` 和 `templates/INDEX.md` 的必要一致性，使 quality matrix 引用 record IDs 而不复制 token 值或第二套 profile。
- [ ] 6.7 对 workbench core v2、portable profile、required source replay、INDEX 和相关 eval 运行模板级 gate，并确认所有 observed records 指向声明来源而非候选/旧模板；全过程不得读取或运行 `example/**`。

## 7. Contract eval 与机器回归

- [ ] 7.1 在非 example 测试资产下创建 self-contained fixed-revision repo fixture，覆盖 shell/canvas、Board、nested scroll、overlay、Dialog 和四类 link context，不依赖网络或用户数据。
- [ ] 7.2 扩展 contract eval runner 的 command/JSON assertions，使其真实执行 capture、portable validation、source replay、canonicalization 和 Apply projection，而不是用 `file_contains` 代替行为。
- [ ] 7.3 添加 negative/mutation cases：删除 Dialog `padding_block_start`、把 navigation `none` 改为 underline、修改 scroll owner、悬空 token/rule/source ref、launder locator、unknown profile 和 unresolved 漂移。
- [ ] 7.4 添加 Authoring semantic reproducibility 与 Apply assertion reproducibility cases，比较 digest、record identities/status/unresolved、Phase 2/4 constraint IDs 和 Phase 8 required scenario IDs。
- [ ] 7.5 让普通 CI 仅运行 deterministic script judges；为显式授权的多 Agent 方差评估记录 model/runtime fingerprint，禁止默认向外部服务发送 repo、模板或用户数据。
- [ ] 7.6 更新 eval baselines、declared/parsed/executed counters 和 JSON/JUnit 报告，并断言报告的 discovery/input/exclusion 字段没有把 `example/**` 当作 fixture、source 或通过证据。

## 8. Distribution、compatibility 与生产文档

- [ ] 8.1 更新双-skill distribution allowlist 和 manifest 构建，使 bundle 包含 fidelity schema、portable validator、source replay runtime、non-example fixtures、eval assets 与 references；缺任一引用资源时构建失败。
- [ ] 8.2 扩展 compatibility metadata，分别声明 core schema v2 range 与 fidelity schema/profile range，并固定 baseline v2、style-only、supported structural 和 unknown-profile 行为。
- [ ] 8.3 更新 changelog、migration/rollback 指南、README、AGENTS 和生产 skill references，说明 sidecar compatibility、双 skill 配套升级、source replay gate 与 example exclusion；不修改 `docs/**` 治理排除内容或 immutable history。
- [ ] 8.4 若实现确需新增第三方依赖，先精确固定版本并更新依赖许可/用途记录；否则记录 profile 实现未新增 governance dependency。
- [ ] 8.5 构建两次 bundle 并比较 artifact/manifest digest，执行临时目录双-skill install smoke，验证 profile schema/runtime/fixtures 可发现且旧 v2 baseline 仍可消费。
- [ ] 8.6 以 production `skills/` 为唯一源码运行 allowlist mirror write，再运行 mirror check 证明 `.agents/skills/{ui-template,ui-template-apply}` 零漂移；不触碰 `.kiro/skills` shadow copy 或 immutable patches/experience。

## 9. Final validation 与交付边界

- [ ] 9.1 在运行验证前再次只检查仓库级 changed-path 名称元数据并由 scope guard 拒绝任何 `example/` 路径；不要打开、格式化、迁移、构建、测试或以样例内容作为输入。
- [ ] 9.2 运行 fidelity schema/canonicalizer、validator/replay、Authoring、Apply、workbench 和 scope guard 的 targeted unit/fixture tests，修复所有稳定 finding 与计数不一致。
- [ ] 9.3 在确认输入清单排除 `example/**` 后运行 canonical template validator、完整 Python tests 和 contract eval，并检查 JSON/JUnit 报告明确记录 exclusion 且全部通过。
- [ ] 9.4 运行 active-release、bundle reproducibility/install smoke 和 mirror check，确认 manifest/compatibility/rollback 资源完整且双-skill 安装路径可用。
- [ ] 9.5 运行 `openspec validate add-structural-fidelity-profile --strict`（若 CLI 要求则使用等价 change-scoped strict 形式）以及仓库全量 OpenSpec strict validation，修复本 change planning/spec consistency errors。
- [ ] 9.6 最终检查 changed-path 名称、scope report 和生成输出，证明 `example/**` 零 diff、零输入、零执行；确认未 archive、publish、tag 或 promote，再完成实现报告并等待独立后续请求。
