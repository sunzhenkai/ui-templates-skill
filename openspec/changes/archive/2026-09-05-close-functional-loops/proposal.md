# Change: 闭合模板功能与管理环

## Why

仓库已有双 skill、schema v2 与 Authoring/Apply 门禁，但缺少分层抽取协议、模板退役/删除、生成物隔离，以及“对照原版 → 回写 skill/模板 → 重生”的可复用更新环。迭代容易靠改 `example/**` 生成物过关，从而打断闭环。

## What Changes

- 把 `governance/FUNCTIONAL-LOOP.md` 定为现行功能/目标文档，并写入 Authoring/Apply 行为。
- Authoring 增加层 scope、INDEX `published|retired` 状态，以及 retire/delete 手续。
- Apply 增加干净实现与保真对照两种模式；retired 模板不得新消费；禁止读原版源码或历史生成物。
- 治理排除当前 `example/workbench-shell/web/**`；过期审查标为 superseded。
- `workbench-shell-implementation` 明确为实例附录，不上升为全体模板产品契约。

## Capabilities

### New Capabilities

无。本 change 只扩展已有 Authoring、Apply、治理与模板校验能力。

### Modified Capabilities

- `ui-template-workflow`: 分层抽取、模板生命周期动词、INDEX 状态。
- `ui-template-apply-workflow`: 干净/对照模式、拒绝 retired、禁止原版与历史 web。
- `template-contract-validation`: INDEX 第五列状态与 orphan 行。
- `skill-lifecycle-governance`: 功能文档、生成物排除、实例 spec 不得绑死产品。
- `workbench-shell-implementation`: 降为该模板实例附录。

## Impact

- 生产 INDEX 与 validator fixture 增加 `状态` 列。
- 新 contract eval 覆盖生命周期、分层更新、禁止改生成物。
- 不改 workbench-shell 视觉内容，也不重生 example web。
- 不 archive、publish 或 promote 样例。
