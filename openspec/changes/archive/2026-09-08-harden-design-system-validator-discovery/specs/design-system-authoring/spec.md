## ADDED Requirements

### Requirement: Author validator 发现协议
Author Validate gate SHALL 按有序候选发现统一 package validator：显式 `UI_DESIGN_SYSTEM_VALIDATOR`（必须是共享实现）、本 skill 安装树内的共享实现、仅当仓库根同时含 `schemas/design-system/v1/` 时的该根 `scripts/validate_design_system.py`。discovery wrapper SHALL 不是 validator 候选，也 SHALL NOT 被写入 `UI_DESIGN_SYSTEM_VALIDATOR`。候选缺失、能力不足或目标为 wrapper SHALL fail closed，不得从任意 `PATH` 猜测，不得继续尝试未知同名程序。

#### Scenario: 安装态 package validate
- **WHEN** 消费项目只安装 Author/Apply，无本仓库 checkout
- **THEN** Author 使用本 skill 内共享实现对 candidate package 执行 `validate ... --kind package --json` 并得到稳定排序输出

#### Scenario: 禁止把 wrapper 当作实现
- **WHEN** Agent 或环境把 `UI_DESIGN_SYSTEM_VALIDATOR` 设为 Author discovery wrapper
- **THEN** Validate 以 `VALIDATOR_SELF_INVOCATION` 失败，不把任务标为校验通过，也不繁殖进程

#### Scenario: 共享实现缺失
- **WHEN** 安装树缺少共享 validator 或 `design-system/v1` schema
- **THEN** Author 以 `DESIGN_SYSTEM_VALIDATOR_MISSING` 失败并停止 Index，不改生产 INDEX
