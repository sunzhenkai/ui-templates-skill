# workbench-shell provenance 与 coverage 修复记录

本记录对应 `close-fidelity-truth-gaps` tasks 2.1–2.6，属于命令式校验收紧后对存量数据的修复。

## 1. revision 归属判定（task 2.1）

修复前 `core/evidence.yaml` 有 51 条记录，其中 26 条（`kind: component`，`captured_at 2026-09-09`）声明 `source_revision: 879d0de9166261c26ec35b69f5cec9382191eda1`，但当时 `meta.sources[]` 只声明 `source-001`（revision `92e96f0d…`）。

判定为**历史来源、非误标**，依据：

1. `AGENTS.md` 出处段记录 workbench-shell 3.0.0 继承 schema v2 时期的两项并列 source，其中一项即固定 revision `879d0de9166261c26ec35b69f5cec9382191eda1` 的原版仓库源码。
2. 26 条记录覆盖的组件名（workspace-switcher、search-input、checkbox、switch、tabs、pagination、avatar、skeleton、menu、tooltip 等）不在 1.3.x reimport capture 的 `scope.components`（app-sidebar、chat-fab、command-palette、data-table、dialog、page-header 共 6 项）内，不可能是 1.3.x 采集产物。
3. 远程可复现性实测：`git ls-remote` + `git fetch --depth 1` 对 `879d0de…` 与 `200dcb44…` 成功，对声明的 `92e96f0d…` 失败——后者是 session-local capture-graph commit，未发布到上游。

## 2. 修复内容（tasks 2.2–2.4）

- `meta.sources[]` 增补显式来源 `source-002`（`879d0de…`，公开可复现）；`source-001.ref` 追加 `(session-local capture graph; not published upstream)` 标注，使不可复现性成为契约事实而非隐含知识。
- 26 条历史 evidence 的 `source_id` 由 `source-001` 改为 `source-002`，`source_revision` 保持不变（不伪造出处）。
- `coverage.components`：35 个 declared 项全部能对应到 package 内真实实体且有 active evidence，故完整归入 `observed`，`defaulted` 与 `unsupported` 清空；原先 `button`/`input` 同时出现在 observed 与 defaulted 的重叠消除。
- `confidence.overall` 由 `high` 下调为 `medium`：`layout` 为 `medium`，按「overall 不高于最弱必需维度」约束必须下调。`components: high` 保留（defaulted 已清空，且全部组件有 active evidence）。
- 附带修正：`evidence-component-section-nav` 的 `target` 原为 `page-type/collection`（与 locator `…/component.settings-nav` 不符），改为 `pattern/section-nav`；`page-type/collection` 仍另有 evidence 覆盖。

## 3. 未声明变更保持原字节（task 2.6 证明）

本次只改动三个文件，`git diff --stat templates/workbench-shell`：

```
 core/evidence.yaml      | 54 ++++++++++++++--------------
 design-system.yaml      |  4 +--
 meta.yaml               | 36 ++++++++++++++++---
```

- `core/evidence.yaml`：仅改 26 条 `source_id` 行与 1 条 `target` 行，其余记录原字节未动。
- `design-system.yaml`：仅重算 `layer_digests` 与 `contract_digest` 数值，`updated_at` 之外的元数据未改。
- `meta.yaml`：仅 sources / confidence.overall / coverage.components 三处。
- `core/tokens.yaml`、`core/primitives.yaml`、`core/patterns.yaml`、`core/page-types.yaml`、`core/layout.yaml`、`core/rules.yaml`、`fidelity.yaml`、`apply/` 均未触碰。

## 4. 校验结果（task 2.5）

```
validate --kind package                        -> valid: true, errors: 0
validate --kind package --require-component-family -> valid: true, errors: 0
```

counts 重算后 `contract_digest` 与全部 `layer_digests` 匹配（校验器无 `DIGEST_MISMATCH`）。
