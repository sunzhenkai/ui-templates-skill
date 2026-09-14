# Eval — 20260913-clean-mode-path-b-notes

## 回归（现有成功路径不被打断）

- 候选 diff 仅追加 Step 3 路径 B / Step 4 / Step 5 的说明块，未改动：来源显式确认 gate、删除清单与 `rm -rf --` 语义、retire→delete→adopt 动词序列、路径 A 流程、报告格式。
- 对照 `evals/evals.json` 三条用例逐条走查：id1（干净模式判定/计划确认/来源待确认项）、id2（增量模式停止项）、id3（不进入本 skill）的期望输出要素在候选稿下全部保持可满足；新增段落不改变任何判定与停止条件。
- 结论：**pass**。

## 模式（原失败场景按新指令可避免）

- `SOURCE_GRAPH_NOT_AT_REVISION`：Step 3 增补直接给出「graph 提交进 session source + request.revision 绑定 HEAD」机制，本会话该硬停止按新说明可前置避免。
- `architecture-site` 误判：Step 4 增补规定判定先于 adopt，并给出现实补救（find 证据 + `--explicit-greenfield` + 偏差记录），两次 run 的处置被固化。
- pins/镜像三轮试错：Step 5 清单与本会话实际修复顺序一致（bundle 镜像 → 测试 pins → 集合 revision/baseline），逐项覆盖 counts 52→55→59、FIXED_REVISION 重算、`revision does not match collection`、`BASELINE_DIFF` 四类实测失败。
- 模板重基：Step 4 序列与 1.3.0→1.3.1→1.3.2 两次实际重基步骤一致。

结论：**pass**。

## 契约（skill 自带 evals）

- `evals/evals.json` 为指令级期望（无自动脚本），已按上节逐条走查，候选稿不破坏任何期望要素；无分数可编造，不做虚构断言。
- 结论：**pass**。

## 副作用

- 触发范围：未触碰路由表与触发条件，无变化。
- 权限/破坏性操作：未新增任何删除或写入动作，仅知识性步骤与清单；`--explicit-greenfield` 的使用条件被收紧为「adopt 已发生 + 删除前证据」。
- 过拟合检查：新增内容不含本会话专属路径/文件名/机器环境；capture-graph 机制与镜像清单为仓级通用事实。
- 结论：**pass**。

## 结论

**pass** — 候选稿与 Proposal 一致，无夹带编辑，可提交用户确认晋升。
