## Why

Author/Apply skill 已补齐 catalog 播种、`legacy-baseline` Intake、壳展示四态（展开 / rail / 离开布局 / overlay）和 Phase 0–9 身份门禁，但官方 published `workbench-shell` 及其实例附录仍按旧措辞与硬编码像素描述。catalog 已是生产库字节副本，再分发会把过时实例语言带给安装用户。

## What Changes

- 以 `update-portable` 对齐 `templates/workbench-shell/` 的 L3 / 平台文档 / `apply/`：写清本模板实际出现的壳形态与触发分离，Phase 0 明确 `legacy-baseline` / structural fidelity unavailable，且不得把 `meta.sources[]` 当实现输入。
- 精确值继续只住在现有 `tokens.yaml`；不新造视觉值，不写 `fidelity.yaml`，不向用户索要 session source。
- 实例附录 `workbench-shell-implementation` 去掉 1280/1024/288/48/16 等硬编码像素，改为 token path；删除过时「任务 6.1」表述。
- 生产库更新后同步 Author catalog；`template_version` 因 published 正文变化递增。
- 不改通用 Author/Apply 产品契约，不 promote `example/**`，不 archive 其他 change。

## Capabilities

### New Capabilities

无。本 change 只对齐已有实例附录与已发布模板。

### Modified Capabilities

- `workbench-shell-implementation`: 实例附录与 published 模板必须跟上现行 skill 契约：token-only 精确值、壳形态四态映射、legacy-baseline Intake、catalog 派生同步与版本递增。

## Impact

- `templates/workbench-shell/`（`spec.md`、`routes-and-layouts.md`、`platforms/*.md`、`apply/playbook.md`、`apply/quality.md`、`meta.yaml`；必要时 `evidence.yaml` 只补 portable 依据，不伪造 observed）
- `skills/ui-template-author/catalog/`（由生产库重写，不得手改后漂移）
- `openspec/specs/workbench-shell-implementation/spec.md`（archive 后合入）
- 真实模板 validator、catalog check、相关 contract eval；CHANGELOG Unreleased 记一笔
- 不改 schema、通用 skill 正文、`example/**`、bundle 主版本（除非治理另有要求）
