# Design: 闭合模板功能与管理环

## Context

现行骨架已能创建、校验、索引和按 Phase 0–9 消费模板。缺口是管理动词不完整、抽取不能按层增量、生成物与产品仓耦在一起，以及保真修复没有强制回写 skill/模板。

## Goals / Non-Goals

**Goals**

- 用一份受治理文档固定闭环与 R1–R9。
- Authoring 能 list/show/create/update/retire/delete，INDEX 带状态。
- Apply 能干净实现，并能在有 oracle 时对照原版而不读源码。
- 治理排除当前生成 web，eval 阻断“修 web 过关”。

**Non-Goals**

- 本 change 不从 multica session source 重抽 workbench-shell，不写 `fidelity.yaml`。
- 不删除 `example/workbench-shell/web/` 工作树，只排除治理。
- 不把 `workbench-shell-implementation` 移出 base，只声明它是实例附录。
- 不交付 `split` 动词，不新增第三个公开 skill。

## Decisions

1. **INDEX 状态放在目录表，不进 `meta.yaml`。** 生命周期属于库目录，避免 schema 破坏性字段。validator 校验第五列闭集，并与目录存在性一致。
2. **retire 保留目录，delete 同时删行和目录。** draft 可直接 delete；published 必须先 retire。
3. **分层是 Authoring 协议，不是新 schema family。** 用 skill + eval 强制层 scope；未声明层保持原字节。
4. **保真对照不是 Phase 10。** 写入 `.ui-template-apply/source-compare.yaml`，checkpoint 仍是 0–9。
5. **新 eval 放独立 fixture 文件。** 避免改 `script-contracts.yaml` 导致全部旧 hash 失效。
6. **active overlay 是本 change。** `harden-template-lifecycle` 已 archive 并合入 base；effective contract = base + 本 delta。

## Risks / Trade-offs

- INDEX 从 4 列改为 5 列，所有 INDEX fixture 必须同步，否则 validator 失败。
- 排除 `example/workbench-shell/web/**` 后，治理不再读该生成物；本地仍可手工运行，但不能当发布证据。
- 不强制降低 workbench `confidence.components`，以免把诚实但未重抽的模板变成发布阻断；R5 由 Authoring 新更新强制。
