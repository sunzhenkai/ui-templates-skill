## Why

`ui-template-design` 已在任务类歧义和 greenfield 栈确认处要求询问，但视觉方向、inventory 范围、Primitive 领养方式、Pattern/Page Type、规则位置、Gallery/验证矩阵和 freeze 前汇总仍可能被 Agent 用默认值推进。用户对会进入 freeze 本体的决策缺少足够选择权。

## What Changes

- 新增 Design decision gates 契约：影响 token、Primitive、Pattern、规则、Gallery、验证或 freeze 的 blocking 决策必须展示至少 2 个合法候选与影响，等待用户选择或明确授权。
- 允许用户授权 Agent 决定，但授权前必须展示拟用默认、影响和可回退方式，并把 `authority` 记为 `delegated`。
- 要求 `00-intake.md` 建立 `decision_gates` 账本，记录 question、options、selected、authority 和 consequence。
- 三类任务类都加载同一 decision gates 规则；greenfield、existing refactor 和 iterate 分别补充架构、范围和 inventory 的选择说明。
- 未回答或被悬置的 blocking gate 不得推进到下层，也不得 freeze。
- Design contract eval 增加候选数量、授权记录、决策账本和 freeze 汇总断言。

## Impact

- 影响：`skills/ui-template-design/`、`ui-template-design-workflow` active spec、Design contract eval。
- 不变：Design 仍可独立运行；runtime freeze schema、扫描器、digest 算法、任务类判定顺序和 Author/Apply fail-open 适配不变。
- 兼容：已有 freeze 的 `iterate` 不重开全部 gate；只有本次点名层相关且缺失、歧义或失效的 gate 需要补充选择。
