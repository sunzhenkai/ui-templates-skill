## Why

`ui-template-apply` 现以 schema v2 template 为主要输入，design freeze 只是可选投影。统一契约要求初始化和增量更新都消费有效 Active Instance，并按项目栈条件使用 vendor 规则。

## What Changes

- Apply 的实施真相切换为 `design-system/v1` Active Instance；**BREAKING**。
- 新增显式 `bootstrap | increment` mode，替代靠输出根状态的隐式判断。
- `bootstrap` 可从 published package adopt-only 建立 Active Instance；`increment` 缺少有效 Active Instance 即停止。
- checkpoint 使用 Impact-based Resume，记录 mode、change set、contract/binding/projection digests、stable IDs、build identity 和浏览器证据。
- vendor `frontend-design`、`shadcn`、`tailwind-css-patterns`、`tailwind-design-system` 按 binding 条件加载。
- Phase 9 feedback 按 `package | binding | apply-skill` ownership 分流。

## Capabilities

### New Capabilities

- `design-system-implementation`: 消费 Active Design System 执行前端初始化、增量更新、验证、恢复和反馈的契约。

### Modified Capabilities

## Impact

- 主要影响 `skills/ui-template-apply/`、Apply checkpoint schema、evals、vendor references 和 browser gates。
- 依赖 schema 子 change 的 validator；与 Author/Design 子 change 共享 package/Active Instance identity 但文件范围不重叠。
- 不修改 `example/**`；生成物只作为会话证据且治理排除。
