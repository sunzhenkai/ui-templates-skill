## Why

`ui-template-design` 目前使用独立的 design-freeze v1 与阶段产物。统一契约要求它创建和维护消费项目内唯一可实施的 Active Instance，同时保留 Design 可单独安装、可独立冻结 Design System 的边界。

## What Changes

- 将 Design freeze 输出切换为 `.ui-template-design/` 下的 `design-system/v1` Active Instance 与 `binding.yaml`；**BREAKING**。
- 在 Intake 中区分 `bootstrap | refactor | iterate` 与 `blank | template-package | legacy-freeze-migration` 两个正交概念。
- 让 Design 拥有 core 与 binding 的完整编辑权，负责 stack/binding、Token Projection、Primitive/Pattern 绑定、Gallery 和 freeze。
- 领养 Template Package 时复制 portable core 且不重写 package 语义。
- 将旧 design-freeze v1 转为显式迁移来源，旧 freeze 不再被静默消费。

## Capabilities

### New Capabilities

- `design-system-active-instance`: 在消费项目创建、领养、迭代、投影和冻结可实施 Design System 的行为契约。

### Modified Capabilities

## Impact

- 主要影响 `skills/ui-template-design/`、Design runtime、checkpoint/eval 和消费项目 `.ui-template-design/` 状态。
- 依赖 `unify-design-system-schema`；与 Author 子 change 无文件重叠，但共享 package 领养语义。
- 不实现业务页面；业务实现仍属于 Apply。
