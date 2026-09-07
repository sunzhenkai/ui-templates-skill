# Add Apply design decision gates

## Why

Template Apply 已能验证 token、可访问性与 current-build 行为，但对三类常见实现缺陷缺少可执行契约：同一信息角色的风格漂移、为了装饰或组件库默认值选错语义元素，以及主要信息/动作放置违反页面职责。现有美学方向和 component inventory 太宽泛，review 难以稳定判定。

## What Changes

- Phase 1 在美学承诺外增加模板兼容的 design thesis、信息词汇表和 local design rules。
- Phase 2 为每个 included route 增加 placement plan，保留 fidelity 已声明的 chrome、slot、anchor 和 negative facts。
- Phase 4 为每个组件增加 semantic decision，要求说明用户任务、信息角色、候选元素、选择理由、风格角色、文案和放置组。
- Phase 5 写入代表切片前必须完成三类风险的前置自我批判。
- Phase 8/9 增加 Design semantics & consistency 质量域，用 current-build evidence 复验风格、信息语义和放置。
- 现有 verification rule-ID vocabulary 增加三个 closed local prefixes，使 local design rule 可进入 Phase 8 schema；不新增 schema 文件。
- `frontend-design` 作为候选方法接入；模板 `spec.md`、`tokens.yaml`、`fidelity.yaml` 与已确认 design freeze 优先。

## Non-Goals

- 不新增 checkpoint phase 或改变身份模型。
- 不新增 Apply 会话产物 JSON Schema 文件。
- 不允许 `frontend-design` 覆盖模板精确值或结构约束。
- 不修改生成 web 或样例；生成物不是修复面。
