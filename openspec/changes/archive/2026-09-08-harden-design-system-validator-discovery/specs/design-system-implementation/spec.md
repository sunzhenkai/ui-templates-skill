## ADDED Requirements

### Requirement: Apply Active Instance checker 发现协议
Apply 用于核对 Active Instance 的 discovery wrapper SHALL 与 Design/Author 使用同一共享实现与自调用护栏。`UI_DESIGN_SYSTEM_VALIDATOR` SHALL 只接受共享实现；指向任一 discovery wrapper SHALL 以 `VALIDATOR_SELF_INVOCATION` fail closed。安装态 Apply SHALL 不要求仓库根 `scripts/` 即可完成 digest 一致的 Active Instance 校验。

#### Scenario: 安装态 Apply 校验 Active Instance
- **WHEN** 消费项目已成对安装 Author/Apply，存在 digest 一致的 Active Instance，无本仓库 checkout
- **THEN** Apply checker 对 Active Instance 执行 `validate --kind active` 并返回统一结果，作为 bootstrap/increment 的 Active truth gate

#### Scenario: Apply 环境变量指向 wrapper
- **WHEN** `UI_DESIGN_SYSTEM_VALIDATOR` 指向 Apply 或 Author 的 discovery wrapper
- **THEN** checker 以 `VALIDATOR_SELF_INVOCATION` 失败并停止实施，不创建递归进程
