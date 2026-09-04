## 1. Effective contract 与 scope

- [x] 1.1 确认 `harden-template-lifecycle` 仍为 complete-but-active；按 base + 该 overlay 实现，不修改 base specs，不执行 archive。
- [x] 1.2 确认 governance scope guard 把 `example/**`（含 `web-v1`/`web-v2`/`web-v3`）排除在本 change 的输入、fixture discovery 与 diff 之外；若出现 `example/` 路径则停止。
- [x] 1.3 记录当前 fidelity schema、capture 闭集、workbench `confidence.layout`、validator/eval/bundle 基线，命令输入显式排除 `example/**`。基线：`harden-template-lifecycle` overlay 仍 active；workbench `layout: medium` 且无 sidecar；eval script cases 29 / declared 31。

## 2. Schema 与 capture 闭集

- [x] 2.1 在 `schemas/template/fidelity/v1/` 为 `layoutScene` 增加可选 `scene_kind`、`shell_variant`、`slots`、`chrome_anchors`；为 `contains` 增加可选 `order`；保持 `additionalProperties: false`。
- [x] 2.2 扩展 `repo-literal-graph-v1` 的 fact properties（`shell_variant`、`slot_role`、`slot_order`、`anchor_role`）与 semantic 闭集（`inset`/`flush` 及槽位 role）；未知值 fail closed。
- [x] 2.3 更新 canonicalizer：digest 纳入 scene_kind、variant、slots 顺序、anchors、relation order；非 shell scene 缺 chrome 不影响 digest 合法性。
- [x] 2.4 升级现有含 `scene.shell` 的非 example fixtures，补 `scene_kind: shell` 与完整 chrome；Board/master-detail/dialog 标对应 kind 且不要求 chrome。
- [x] 2.5 添加 chrome 正向 fixture（inset、有序 workspace-switcher/search/compose、header-trigger→page-header、chat-fab→canvas）与负向 mutation（flush 替换、槽位交换、错锚、无 graph）。

## 3. Validator 与 capture runtime

- [x] 3.1 语义校验：included `scene_kind: shell` 必须有 variant、有序 slots、header-trigger 与 chat-fab 锚点；缺一则稳定 code `CHROME_COMPOSITION_INCOMPLETE`。
- [x] 3.2 校验槽位 role 闭集、slot.region / 锚点 region 存在、同级 contains order 互斥；shell 标 `other` 以逃避 chrome 时失败。
- [x] 3.3 Capture：无 graph 保持 unsupported；shell usage 缺 chrome facts 时 closure 不得 complete，不生成部分 observed shell record。
- [x] 3.4 Portable 检查 `meta.confidence.layout == high` 当且仅当存在 chrome-complete structural sidecar；无 sidecar 时 high 失败、medium/low 通过；不请求 `meta.sources[]` 路径。
- [x] 3.5 为 3.1–3.4 添加单元/fixture tests；discovery 不得进入 `example/**`。

## 4. Authoring skill

- [x] 4.1 更新 `source-repo.md` 与 `repo-capture-format.md`：structural Intake 之后必须有 tracked literal graph；禁止用散文/抽样 TSX 代替；说明骨架工具不解析源码。
- [x] 4.2 更新 `spec-format.md` 与 `SKILL.md`：shell chrome 字段、A–E 仅为映射、双源时 repo 壳拓扑优先、layout high 需要 chrome sidecar。
- [x] 4.3 实现或接入 graph 骨架命令（写入 required shell slot 占位 YAML）；空 facts 仍 incomplete。
- [x] 4.4 更新 Authoring gate/report：缺 graph、chrome incomplete、A–E 覆盖源 IA 时不得 Index；style-only 须声明未提供 chrome fidelity。
- [x] 4.5 添加 Authoring eval/tests：无 graph 失败、chrome incomplete 失败、相同 chrome fixture 重复 capture digest 一致。

## 5. Apply 消费

- [x] 5.1 更新 Apply template contract 与 Phase 2：投影 `shell_variant`、`slot:<role>:<order>`、`anchor:<role>→<region>`；inset 不得改 flush，header-trigger 不得改画布悬浮。
- [x] 5.2 更新 Phase 8 scenario 派生：inset 画布几何、trigger bounding box、槽位顺序；无 sidecar 不生成这些 scenario，且不得标 profile-verified。
- [x] 5.3 Chrome composition 语义变化从 Phase 2 重开并使相关 Phase 8 证据过期。
- [x] 5.4 添加 Apply contract tests：inset vs flush 失败、错锚失败、baseline 无 chrome 明确 unavailable。

## 6. Workbench-shell 诚实降级

- [x] 6.1 将 `templates/workbench-shell/meta.yaml` 的 `confidence.layout` 改为 `medium`（或更低），保持无 `fidelity.yaml` 与 provenance 身份不变。
- [x] 6.2 更新 `routes-and-layouts.md`、`platforms/web.md`、`apply/playbook.md`：A–E 是验收映射；无 sidecar 时 chrome unavailable；不把 flush 硬切写成已验证来源变体。
- [x] 6.3 不写入 source-direct sidecar，不索取 source-001/source-002 本地路径，不扫描 sibling/`/tmp`/`example/**`，不按 ref clone。
- [x] 6.4 对 workbench 跑不带 `--source-root` 的 portable validator，确认零 error，且不再因 layout-high-without-chrome 失败。
- [x] 6.5 （非完成门禁）仅当用户本会话提供与声明 revision 一致的 session source 时，才允许 Generate-from-source 补 chrome sidecar。本会话未提供 session source，已跳过，未 clone / 未写 sidecar。

## 7. Eval、分发与文档

- [x] 7.1 扩展 contract eval cases：chrome 正向 digest、inset→flush / 槽位重排 / 无 graph / layout-high-without-chrome 负向；输入不含 `example/**`。
- [x] 7.2 更新 eval baseline 与 declared/parsed/executed 计数。
- [x] 7.3 更新兼容矩阵/changelog/README/AGENTS（不改 `docs/**`）：structural 导入需要 chrome-complete graph；旧 v2 无 sidecar 仍可消费但 layout 不得为 high。
- [x] 7.4 构建 bundle，allowlist 含新 schema/fixtures/runtime；`make mirror-write` 后 `make mirror-check` 零漂移。

## 8. Final validation

- [x] 8.1 再查 changed-path：`example/**` 零 diff。
- [x] 8.2 运行 targeted tests、`make validate`、`make test`、`make eval`，修复稳定 finding。
- [x] 8.3 运行 `openspec validate --change "capture-shell-chrome-fidelity" --strict` 与 `openspec validate --all --strict`。
- [x] 8.4 确认未 archive、publish、tag，也未 promote 样例；实现报告等待独立后续请求。
