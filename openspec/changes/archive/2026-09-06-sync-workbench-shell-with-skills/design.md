## Context

见 `proposal.md` 的 Why。当前约束：

- 仓库根 `templates/workbench-shell/` 是官方 published 真相源；`skills/ui-template-author/catalog/` 必须是其派生副本。`make mirror-write` 已先 `catalog --write` 再写 `.agents` 镜像。
- 本会话没有与 `meta.sources[]` 声明 revision 一致的 session source，因此只能 `update-portable`。
- Authoring 现行壳形态闭集在 `skills/ui-template-author/references/extraction-layers.md`：展开 / rail 仍占位 / 离开布局 / overlay；断点与用户开关必须分开。
- Apply 通用手续（catalog 播种、`require-published`、模式 A/B）已在 skill 正文，模板 `apply/` 只做实例映射。
- `tokens.yaml` 已持有 `responsive.web.expanded-min`（1280）、`collapsed-min`（1024）、`narrow-content-threshold`（768）、`layout.sidebar-mobile-width`（288）、`page-header-height`（48）、`page-gutter`（16）。实例附录与 playbook 仍把这些像素写进 prose。

## Goals / Non-Goals

**Goals:**

- 只改 published 模板的 L3 / 平台 / apply 映射与实例附录措辞，使 Apply 只读模板即可执行现行 Phase 0 与壳形态验收。
- 用现有 catalog 写入器保持生产库与 catalog 零漂移。
- 用 `check-changeset` 把本次允许改写的相对路径冻住。

**Non-Goals:**

- 不改 token 精确值、不新增 rule ID、不写 `fidelity.yaml`。
- 不改通用 Author/Apply skill 正文或 schema。
- 不重生、不验收 `example/**`。
- 不涨 bundle / skill 主版本（只在 CHANGELOG Unreleased 记模板同步）。

## Decisions

### D1 只做 update-portable

本会话没有可读 session source。按 Authoring 不变量：不伪造 source-direct sidecar，不扫描 sibling/`/tmp`/`example/**`，不按 provenance clone。

备选：停下向用户要 `source-001`/`source-002` 本地路径。否决：与现行 portable 契约和实例附录冲突。

### D2 保留 workbench 别名，显式对照四态

继续使用本模板已有的 expanded / collapsed / overlay 作为本地名称（token 与 QUALITY-008 已绑定），在 `routes-and-layouts.md` 与 `platforms/web.md` 增加一行对照：

| 本地名 | 闭集形态 | 触发 |
| --- | --- | --- |
| expanded | 文档流展开 | Web 断点：`>= responsive.web.expanded-min` |
| collapsed | rail 仍占位 | Web 断点：`>= collapsed-min` 且 `< expanded-min` |
| overlay | 离开布局并变为 overlay | Web 断点：`< collapsed-min` |

Desktop 的 sidebar trigger（`AX-070` / `LAYOUT-014`）写成**用户/窗口开关**，不并入 Web 断点规则。Mobile 不使用该三态。未在来源出现的第四种独立「只离开布局、不成 overlay」标 `unsupported`。

备选：把本地名全部改成 rail/overlay。否决：会无谓改 QUALITY/RESP 既有用语，且不是视觉变化。

### D3 精确值只引用 token path

实例附录、`apply/` 与平台 prose 删除 1280/1024/288/48/16/768 字面量，改为现有 token path。`tokens.yaml` 字节保持不变，除非 validator 证明必须补 origin/evidence（不得改 `value`）。

备选：连 token 一起重抽。否决：无 session source，不能把 defaulted 抬成 observed。

### D4 `template_version` 升到 2.0.1

published 正文变了，checkpoint 会绑 `meta.template_version`。这是契约措辞对齐，不是视觉/token 破坏，用 patch。`captured_at` 与 INDEX 前四列保持 2026-09-03（采集身份，不是编辑日期）。

备选：保持 2.0.0。否决：Apply 恢复身份无法区分新旧正文。备选：2.1.0。过重，token 未变。

### D5 catalog 只经生成器回写

先改 `templates/workbench-shell/`，portable validator 通过后再：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py catalog --write
make mirror-write
make mirror-check
```

禁止手改 catalog 或 `.agents` 副本。`make mirror-write` 已含 catalog 写入；单独 `catalog --write` 便于先看生产库↔catalog drift。

### D6 模板 apply 不复制通用播种手续

`apply/playbook.md` Phase 0 只补：legacy-baseline、structural fidelity unavailable、A–E/平台 included 决定、禁止把 `meta.sources[]` 当实现输入。播种与 `require-published` 留在 Apply skill。

备选：把 seed 命令写进 playbook。否决：第二个模板会误继承 workbench 安装假设。

### D7 变更集合（check-changeset allow）

允许改写：

- `spec.md`（仅还原要点/入口需要时，不改 NN 语义）
- `routes-and-layouts.md`
- `platforms/web.md`、`platforms/desktop.md`、`platforms/mobile.md`（mobile 只澄清不套用 Web 三态）
- `apply/playbook.md`、`apply/quality.md`（quality 只去像素字面量，不新增 QUALITY ID）
- `meta.yaml`（只升 `template_version`）
- `evidence.yaml` 仅当 portable validator 要求补注释/active 依据，且不改 token value、不新增 observed

不改：`tokens.yaml` value、`components.md`、INDEX 行。

## Risks / Trade-offs

- [Risk] prose 对照四态被读成「已有 chrome sidecar」→ Mitigation：每处写明无 sidecar、不得标 profile-verified。
- [Risk] 升 `template_version` 使进行中 Apply checkpoint 失效 → Mitigation：这是正确行为；CHANGELOG 写明需从 Phase 0 重开。
- [Risk] 手改 catalog 造成 drift → Mitigation：只走 `catalog --write` / `mirror-write`，`mirror-check` 与 `test_catalog` 阻断。
- [Risk] 实例附录 MODIFIED 场景改用 token path 后，旧评测仍搜像素字面量 → Mitigation：任务里对实例附录与模板 prose 做字面量扫描；通用 skill 不改。

## Migration Plan

1. 按 D7 改生产模板 → portable validate `templates/workbench-shell` 与 INDEX。
2. `catalog --write` + `mirror-write` / `mirror-check`。
3. `make test` 中 catalog 零漂移与模板相关 unittest；`make eval` 跑现有 catalog/authoring contract（不新造 LLM case）。
4. CHANGELOG Unreleased 记 `workbench-shell` 2.0.1 为 portable 对齐。
5. 回滚：还原 `templates/workbench-shell/` 与 `openspec/specs/workbench-shell-implementation/spec.md`，再 `catalog --write`。

已安装消费项目：播种副本不会被 skill 升级覆盖。用户要官方 2.0.1 必须显式 refresh。这是已有播种规则，不是本 change 新行为。
