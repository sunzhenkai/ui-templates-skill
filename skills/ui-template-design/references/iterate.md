# 迭代更新

仅当任务类是 `iterate`：`design-system.yaml` 为 `status: frozen` 且 active 校验通过，且本次只改已声明层。不要重开完整阶段 0–9，不要做全量 inventory。

## 顺序

1. 读 `design-system.yaml` 身份与 digest，运行 `python3 runtime/check_active_instance.py validate <project-root>/.ui-template-design --kind active --json`。不匹配则停止，回到 [task-classes.md](task-classes.md)。
2. 写入变更集合：层（token / primitive / pattern / rules / gallery）与相对输出根的路径。
3. 只改点名层。后一层不得重写前一层精确值。
4. 跑 `runtime/scan_design_constraints.py`。扫描失败不得 freeze。（`check_design_freeze.py gate` 只用于 legacy-freeze 迁移。）
5. 视觉变更才跑 [visual-loop.md](visual-loop.md)；自愈仍最多 3 轮。
6. 用 `python3 runtime/check_active_instance.py compute-digest <project-root>/.ui-template-design/design-system.yaml` 刷新 `layer_digests` / `contract_digest`（及 binding/projection digest），再跑 active 校验。未声明路径保持原字节。

## 禁止

- 不得加载完整 inventory 或逐页重写 class。
- 默默覆盖根 `AGENTS.md`。
- 为过线在单个业务页写魔法数。
- 把 iterate 当成新项目初始化。

## Scope gate

把可改层与候选路径列成选项，同时声明不触碰集合。用户只给症状时，先提供「最小局部修复」「回写对应层」「扩展范围」的代价对比；确认前不得从症状跳到整层重写。
