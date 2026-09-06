# Change: Apply 消费仓卫生（pin / 选型 / closed 提示删除）

## Why

Apply 把官方 catalog 默默播种进消费项目 `templates/`，把「用模板做页面」变成「本仓开始经营模板库」。空仓又没有强制技术架构选型，Agent 容易直接开栈。会话账本 `.ui-template-apply/` 的生命周期也没写清，做完不知道能不能删。

## What Changes

- Apply Intake **默认只读 catalog**，把 name / version / digest / `origin` pin 在 `.ui-template-apply/`；不为了消费而创建项目 `templates/` 或 INDEX 行。
- 项目已有 `published` 行则只消费项目副本；项目 `retired` 仍拒绝，catalog 不得救回。
- `seed` / 领养改为 Authoring 显式动词：第一次要改模板、接受 feedback 落库、retire 或用户明确「把官方模板接到本仓」时，才把 pin 住的 catalog 副本写入项目库。已有同名行或目录仍不覆盖。
- Phase 0 判定 `greenfield | existing`。全新实现必须走闭集技术架构选型并经用户确认，未确认不得写应用源码；不得把某套栈写成 Apply 官方默认。`existing` 只记录观察到的栈，禁止静默换栈。
- Phase 9 通过且无未处置 proposed feedback 后会话 **closed**。收尾 **必须提示** 可以删除 `.ui-template-apply/`（生成页面不受影响；再 Apply 视为新 Intake）。未领养则提示本仓不应有 `templates/`。不自动删除。
- **不 BREAKING** 模板 schema v2。已播种项目继续走项目库。对外按 2.2.0 兼容：少写文件，checkpoint 增加可选字段。

## Capabilities

### New Capabilities

无。本 change 收紧已有 Apply 消费与 Authoring 库写路径。

### Modified Capabilities

- `ui-template-apply-workflow`: 空项目从 catalog pin 消费、不播种；greenfield 必须选型；Phase 9 closed 后必须提示可删 `.ui-template-apply/`。
- `ui-template-workflow`: 播种改为显式领养，不再是 Apply Intake 默认；写模板才创建项目库。
- `template-contract-validation`: catalog-only pin 不要求项目 INDEX；项目库一旦存在仍走现有 INDEX/core 校验。
- `workbench-shell-implementation`: 实例 Phase 0 不再假设 Apply 会播种；通用 resolve / 选型 / closed 提示仍由 Apply skill 执行。

## Impact

- `manage_template_index.py`（scripts 与 Author runtime）：`require-published` 默认 resolve、不播种；`seed` 仅显式。
- Apply skill 正文、`apply-workflow.md`、checkpoint schema、Authoring feedback/领养、`governance/FUNCTIONAL-LOOP.md` I3、README。
- eval：空仓 Apply 不得创建 `templates/`；greenfield 未确认不得落应用文件；closed 收尾含删除提示。
- 不改官方模板视觉/token，不 promote `example/**`，不把 catalog 变成可写库，不自动删除已有项目 `templates/` 或 `.ui-template-apply/`。
