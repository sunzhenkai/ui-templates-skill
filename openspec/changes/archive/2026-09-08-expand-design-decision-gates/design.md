## Context

现有契约已经要求可观察任务类判定、greenfield 闭集确认和 unresolved UX 停止，但未系统约束后续层的选择呈现。Agent 可能在 token、Primitive、Pattern、规则、Gallery 和验证参数处使用常见默认，导致用户只看到成品而失去方向选择。

## Goals

- 用单一 `decision-gates.md` 定义提问格式、授权语义、账本和必经 gate，避免三类任务各自发明询问规则。
- 保持 progressive disclosure：所有任务类只额外必读一个短 reference；greenfield/existing/iterate 只补充模式特定说明。
- 把选择权绑定到完成定义，而不是只作为建议。
- 用户可以高效委托，但委托必须事前、显式、可追溯。

## Non-goals

- 不改变任务类判定顺序、runtime schema、digest 算法、扫描规则或 Gallery 完成条件。
- 不要求每个非阻塞细节都提问；已知、已记录、用户已授权或唯一合法结果不重复打扰。
- 不引入固定技术栈、组件库、视觉风格或固定问题清单。

## Approach

- 决策账本放在 `00-intake.md`，字段保持 YAML 可读：`question`、`options`、`selected`、`authority`、`consequence`。
- blocking gate 覆盖 Intake、Architecture、UX/Inventory、Tokens、Primitives、Patterns、Rules、Gallery、Verification 和 Freeze。
- `authority` 区分 `user` 与 `delegated`；delegated 必须有授权前展示的默认与影响。
- eval 用 file contains 断言固定关键契约，不模拟完整对话。

## Tradeoffs

- 初次建立系统会增加聚焦提问轮次；通过每轮最多 3 个 blocking question 和复用已记录决策控制成本。
- 用户授权仍要求展示影响，会比“Agent 直接选默认”慢，但避免 freeze 后返工。
