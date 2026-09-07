# 迭代更新

仅当任务类是 `iterate`：已有 `frozen` freeze，且本次只改已声明层。不要重开完整阶段 0–9，不要做全量 inventory。

## 顺序

1. 读 freeze 身份与 digest。不匹配则停止，回到 [task-classes.md](task-classes.md)。
2. 写入变更集合：层（token / primitive / pattern / rules / gallery）与相对输出根的路径。
3. 只改点名层。后一层不得重写前一层精确值。
4. 跑 `scan_design_constraints.py` 与 `check_design_freeze.py gate`。扫描失败不得 freeze。
5. 视觉变更才跑 [visual-loop.md](visual-loop.md)；自愈仍最多 3 轮。
6. 刷新 `freeze.yaml` digest，绑定当前本体。未声明路径保持原字节。

## 禁止

- 不得加载完整 inventory 或逐页重写 class。
- 默默覆盖根 `AGENTS.md`。
- 为过线在单个业务页写魔法数。
- 把 iterate 当成新项目初始化。
