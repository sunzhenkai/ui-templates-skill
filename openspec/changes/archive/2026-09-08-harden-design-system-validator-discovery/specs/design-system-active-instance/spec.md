## ADDED Requirements

### Requirement: 独立安装也可执行统一 validate
Design freeze 与 Active Instance `validate` SHALL 调用与 Author/Apply 同一语义的 `design-system/v1` validator。Design 单独安装、没有 Author/Apply、没有仓库根 `scripts/` 时 SHALL 仍能校验 `.ui-template-design`；缺少共享实现 SHALL fail closed。Design discovery wrapper SHALL 遵守自调用护栏，SHALL NOT 把 wrapper 路径当作 `UI_DESIGN_SYSTEM_VALIDATOR`。

#### Scenario: Design-only freeze validate
- **WHEN** 项目只安装 `ui-template-design` 且 Active Instance 文件齐全
- **THEN** Design 对 `.ui-template-design` 运行 `validate --kind active --json` 得到统一错误/digest 输出，不要求 Author skill 或本仓库路径

#### Scenario: Design wrapper 被指回自身
- **WHEN** `UI_DESIGN_SYSTEM_VALIDATOR` 指向 Design 的 discovery wrapper 或 Author 的 discovery wrapper
- **THEN** validate 以 `VALIDATOR_SELF_INVOCATION` 失败，Active Instance 不得因此进入 frozen
