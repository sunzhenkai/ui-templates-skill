## Context

Apply 已有 Phase 1 token freeze、Phase 2 fidelity projection、Phase 4 component inventory 和 Phase 8/9 current-build gates。但“该用链接还是按钮”“状态该用什么元素表达”“主操作和关键信息放哪里”经常只留在 prose 审美里，导致同一 role 使用不同视觉 treatment、错误 primitive 或任务组被打散。

## Goals / Non-Goals

**Goals**

- 用稳定 local rule IDs 记录会话内设计约束，并让 Phase 8/9 证据可引用。
- 把信息语义和放置决策放进现有 Phase 1/2/4 产物，不新增阶段。
- 以实现前批判减少返工，以真实浏览器证据防止只靠代码审查宣称通过。

**Non-Goals**

- 不创建第二套模板设计权威。
- 不把 local IDs 混入模板 feedback 的 known rule IDs。
- 不新增 JSON Schema 文件或 checkpoint 字段。

## Decisions

1. **模板契约优先。** `frontend-design` 只提供设计论点、自我批判、信息表达和克制方法；冲突时按模板 `spec.md`、`tokens.yaml`、`fidelity.yaml`、已确认 design freeze、用户范围裁决。
   备选：让外部审美优先——拒绝，会破坏 template identity 与可复现验收。

2. **Local rules 是会话契约。** `01-token-map.yaml` 增加 `design_rules[]`，IDs 固定为 `LOCAL-STYLE-###`、`LOCAL-INFORMATION-###`、`LOCAL-PLACEMENT-###`。现有 verification `ruleId` vocabulary 只扩展这三个 closed prefixes；它们只存在于 `.ui-template-apply/`，不能作为 feedback target。
   备选：写入模板 spec——拒绝，那是 Authoring ownership。

3. **Route plan 与 component decision 是两个视角。** Route plan 解决页面职责、信息分组、阅读/焦点顺序和响应式放置；component decision 解决 primitive 语义、文案、状态和风格角色。二者互相引用但不重复。

4. **前后双评。** Phase 5 首个切片前做风险批判；Phase 8/9 用 Accessibility tree、computed style、键盘和视口证据复验。没有当前 build evidence 的设计结论不能通过。
