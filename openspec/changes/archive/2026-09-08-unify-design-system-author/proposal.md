## Why

`ui-template-author` 目前把抽取结果表达为 schema v2 template。统一契约要求 Author 成为 portable Template Package 的生产者，同时保留分层抽取、candidate-only、INDEX 生命周期和 feedback 治理。

## What Changes

- 将 Author 的发布产物从 schema v2 template 切换为 `design-system/v1` portable package；**BREAKING**。
- 将 L0–L6 变更集合标签映射到 `design-system.yaml`、`meta.yaml`、七层 core 与 `apply/`。
- 让 Author 只产出 portable core，不生成 binding、依赖清单、output root 或业务实现。
- 保留 Intake → Generate → Validate → Eval → Index → Report 主线，并接入统一 validator。
- 让 proposed feedback 消费 Stable Entity ID 和 package identity。

## Capabilities

### New Capabilities

- `design-system-authoring`: 从已声明 session source 抽取、验证、发布和维护 portable Design System Package 的行为契约。

### Modified Capabilities

## Impact

- 主要影响 `skills/ui-template-author/`、Author runtime、fixtures、evals 和官方 catalog 生成输入。
- 依赖 `unify-design-system-schema` 的 schema 与 validator。
- 不在本子 change 内迁移 `templates/workbench-shell`；官方迁移属于 release 子 change。
