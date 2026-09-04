## Context

见 [`proposal.md`](proposal.md) 的 Why。当前 `repo-structural-v1` 的 `layoutScene` 只有 regions / 无序 relations / arrangement / scroll / overlay；literal graph 的 semantic 闭集没有 `inset|flush` 或槽位 role；capture 在缺 graph 时 `unsupported`，但 Authoring 仍可用散文完成并给 `confidence.layout: high`。workbench-shell 是无 sidecar 的 `legacy-baseline`，evidence locator 指向模板自身。实现必须落在现有 fidelity v1 + capture v1 上做兼容扩展，并继续把 session source 与 provenance 分开。

约束：不解析/执行来源 TSX；不改 `example/**`；无用户给出的 session source 时不给 workbench 写 source-direct sidecar；core schema v2 保持可读。

## Goals / Non-Goals

**Goals:**

- 把 shell chrome composition 做成 layout topology 的可验证子集，而不是第四个 facet 或 schema v3。
- 让 structural 导入在「无 graph / graph 无 chrome / 用 A–E 覆盖源 IA / layout high 无 sidecar」四条路径上 fail closed。
- 用非 example fixtures 证明 inset vs flush、槽位顺序、trigger 错锚；Apply Phase 2/8 投影同一组 identity。
- 诚实处理已发布 workbench：降低 layout confidence，澄清 A–E 映射。

**Non-Goals:**

- 不实现通用 TSX/CSS parser，不把 graph 生成外包给「读几个组件再猜」。
- 不把 chrome 做成完整组件 DSL 或视觉像素契约。
- 不在本 change 默认完成条件里 clone/绑定 multica checkout。
- 不删除 Apply 的 A–E 验收分类，不修改样例实现。

## Decisions

### 1. 扩展 `repo-structural-v1`，不为 chrome 新开 profile 或 facet

在现有 `layoutScene` 上增加**可选**字段；**语义层**仅当 `scene_kind: shell` 时必填：

```yaml
scene_kind: shell          # shell | board | master-detail | dialog | other
shell_variant: inset       # inset | flush；仅 shell
slots:
  - {id: slot.switcher, role: workspace-switcher, region: region.shell.nav, order: 0}
chrome_anchors:
  - {role: header-trigger, region: region.shell.page-header}
  - {role: chat-fab, region: region.shell.canvas}
```

`contains` 增加可选 `order`（整数）。shell scene 的同级 contains 必须有互斥 order。canonical digest 纳入 `scene_kind`、variant、slots 顺序、anchors、relation order。

非 shell scene（board/master-detail/dialog）不必填 chrome，避免把现有 Board 契约撑破。JSON Schema 保持这些字段 optional；Python 语义校验对 included shell 做 fail closed。

**替代方案：**所有 layoutScene 必填 chrome。拒绝，Board 没有 workspace-switcher。新 profile `repo-structural-v2`。拒绝，改动面大于当前信息损失。第四 facet `chrome_compositions`。拒绝，chrome 仍是 layout topology，拆 facet 会让 Apply 多一套投影。

### 2. Capture fact 闭集加法，不改 graph 顶层形状

`repo-literal-graph-v1` 仍只允许三类 facet。新增：

- properties：`shell_variant`、`slot_role`、`slot_order`、`anchor_role`
- semantic values：`inset`、`flush`，以及槽位 role 闭集（与 spec 列出的 role 对齐）

Agent 在 session source 里手写/用骨架工具填写 graph；`capture_repo_fidelity.py` 把这些 facts 归一成 layout records。没有 graph 文件 → 现有 `UNSUPPORTED_SOURCE_FORMAT`；有 shell usage 但缺 chrome facts → 新 code `CHROME_COMPOSITION_INCOMPLETE`，closure 不得 complete。

**替代方案：**新 `graph_type` 专放 chrome。拒绝，会分裂 closure digest。让 runtime 扫 TSX。拒绝，违反确定性/安全子集。

### 3. 只提供 graph 骨架与完整性检查，不提供「从源码提取」

Authoring 在 `source-repo.md` 增加强制步骤：structural Intake 之后、Generate 之前，session source 必须有 tracked literal graph。可提供 `runtime` 骨架命令，在 graph 路径写入含 required shell slot 占位的 closed YAML（空 facts 仍 incomplete）。完整性检查是机器门禁；填 facts 是获授权调用方的责任（人工或另一次已授权会话），本 skill 不声称能解析 TSX。

**替代方案：**把「Agent 阅读源码写 spec.md」合法化。拒绝，这正是当前漂移源。要求用户总是自备完整 graph 且无骨架。可接受但不必要；骨架降低格式错误，不降低完整性门禁。

### 4. `confidence.layout: high` 与 chrome sidecar 绑定

Portable validator 新增跨文件检查：`meta.confidence.layout == high` ⇒ 存在 structural sidecar 且每个 included `scene_kind: shell` 的 chrome 完整。无 sidecar 时 layout 最高 `medium`。replay `not-run` 不影响该检查。workbench 将 `layout` 从 high 改为 medium，不写假 sidecar。

**替代方案：**只在 Generate-from-source 强制、已发布模板豁免。拒绝，workbench 今天的 high 会继续误导 Apply。豁免会让「high + legacy-baseline」永远合法。

### 5. A–E 留在 coverage，移出壳配方权威

`page_modes` 枚举与 Apply Phase 0 映射不变。`routes-and-layouts.md` / playbook 改为：A–E 是验收分类；壳 chrome 以 profile slots 为准；无 sidecar 时写明 chrome unavailable，禁止把 flush 硬切写成已验证来源变体。双源冲突时 repo chrome facts 优先，文档只进 token/文档规则。

**替代方案：**从 meta 删除 A–E。拒绝，会破坏现有 Apply intake 与 quality 矩阵。

### 6. 现有 structural fixtures 必须升级，workbench 默认不绑上游

`skills/ui-template/runtime/fixtures/` 里带 `scene.shell` 的 graph/fidelity 补上 `scene_kind` 与 chrome；并新增 inset 正向 + flush/顺序/错锚/无 graph 负向。workbench 无 session source 时不生成 `fidelity.yaml`。用户后续提供 `879d0de…` 一致 checkout 时，再走 Generate-from-source——该任务可选，不是本 change 的默认完成门禁。

### 7. 兼容与版本

这是 profile **语义增强**：旧 structural sidecar 若含 shell scene 且无 chrome，新 validator 会失败。仓库内只有 fixture 模板属于此类，随本 change 迁移。core v2 与无 sidecar 模板行为除 layout-high 检查外不变。兼容矩阵声明：baseline v2 仍可消费；structural 导入需要 chrome-complete graph；bundle 随双-skill 版本提升。不把 profile 改名为 v2，除非实现时发现 JSON Schema 无法保持 `additionalProperties: false` 下的可选扩展——若必须破坏 closed object，再在实现中把 profile version 策略升级为单独决策并更新兼容文档。

当前判断：可选字段 + 语义必填可以保持 `profile: repo-structural-v1`。

### 8. Apply 投影不加阶段

Phase 2 constraint ID 增加 `shell_variant`、`slot:<role>:<order>`、`anchor:<role>→<region>`。Phase 8 required scenario 从这些 ID 派生（inset 画布几何、header-trigger 落在 page-header bounding box、槽位 DOM 顺序）。无 sidecar 时不生成这些 scenario，且不得标 profile-verified。

## Risks / Trade-offs

- **[Risk] Agent 仍手填错误 graph。** → 完整性门禁 + mutation fixtures + 冲突 unresolved；不解决「填了但填错」的全部情况，但堵住「不填也能发布」。
- **[Risk] 槽位 role 闭集不够用。** → 未知 role fail closed；新增 role 另开 change，禁止自由字符串。
- **[Risk] `scene_kind: other` 被滥用来逃避 chrome。** → included 名称/region 含导航壳却标 other 时语义校验失败或 unresolved；scope 声明的 shell scene 必须 `scene_kind: shell`。
- **[Risk] 降低 workbench layout confidence 被看成模板质量回退。** → Report/INDEX 说明这是诚实降级；恢复 high 的唯一路径是 session source + chrome sidecar。
- **[Risk] 可选字段让 JSON Schema 单独通过、语义失败。** → 现有分层已如此（schema + Python）；chrome 走同一层，稳定 issue code。
- **[Trade-off] 不解析 TSX 意味着第一次导入仍要人写 graph。** → 用骨架 + fail closed 换可重复性；自动提取留给未来独立、带受信 parser 的 change。

## Migration Plan

1. 记录 `example/**` 禁改 guard 与当前 validator/eval 基线；不 archive `harden-template-lifecycle`。
2. 扩展 fidelity schema 可选字段、capture 闭集、canonicalizer；升级现有 shell fixture 并加 chrome 正负向。
3. Validator：shell chrome 完整性、锚点 region、layout-high 一致性、无 graph 稳定失败。
4. 更新 `source-repo.md` / `repo-capture-format.md` / `spec-format.md` / Apply Phase 2/8 与 Authoring gate；可选骨架命令。
5. workbench：`confidence.layout` → medium；prose 澄清 A–E；不写 source-direct sidecar。
6. eval/bundle/mirror/兼容说明；`make mirror-write` 后 `mirror-check`。
7. 跑真实模板 portable validator、contract eval、OpenSpec strict、example scope guard。

回滚：恢复上一 bundle 与 workbench meta；新 chrome 字段对旧消费者是未知 optional（若已写入 sidecar，旧 validator 因 `additionalProperties: false` 会拒——因此发布前必须双-skill 同步升级）。Archive / 从源重导入 workbench 需单独请求。

## Open Questions

无。session source 是否在后续会话提供不影响本 change 的默认完成条件。
