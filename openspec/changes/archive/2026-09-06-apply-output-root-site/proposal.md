# Change: Apply 按输出根判定 greenfield

## Why

sage 一类 monorepo 已经初始化，但本次要写的前端应用（如 `agent-web`）仍是空目录。Agent 把仓库根或兄弟包当成 `existing`，跳过技术架构选型；或把功能规格 / workspace 约定写成 `confirmed_by_user`。判定对象必须是本次前端输出根。

## What Changes

- Phase 0 `greenfield | existing` 只看本次将写入应用源码的输出根，不看仓库根、`.ui-template-apply/` 或兄弟应用。
- `00-architecture.yaml` 必填相对 `output_root`；checker 用它复跑探测，`site` 不一致则失败。
- 输出根不存在、为空、只有占位文件或空目录时仍是 `greenfield`，必须停下展示闭集层候选。
- 兄弟应用、workspace 约定、功能规格里的技术提及只可作为候选，不得当作已确认。
- 「已有项目不跑选型」收窄为：该输出根已有依赖清单或实质源码。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `ui-template-apply-workflow`: 输出根判定、嵌套新应用必须选型、禁止用仓库约定自动确认。

## Impact

- Apply Phase 0 探测 CLI 参数语义从「项目根」改为「输出根」。
- 进行中的 Apply 会话若缺 `output_root` 或 `site` 与输出根不一致，从 Phase 0 重开。
- 官方模板 `template_version` 不上涨。
