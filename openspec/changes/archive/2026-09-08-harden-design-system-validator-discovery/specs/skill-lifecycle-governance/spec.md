## ADDED Requirements

### Requirement: Bundle 分发共享 design-system validator
每个会发现统一 `design-system/v1` validator 的 public skill SHALL 在生产源码与发布 bundle 中自带共享实现及其必需 schema，使安装树不依赖仓库根 `scripts/`、不依赖另一个 public skill。allowlist 与 manifest SHALL 将这些文件纳入完整性检查；wrapper 与共享实现 SHALL 禁止内容漂移。缺实现、缺 schema 或副本与权威源不一致 SHALL 不得发布。

#### Scenario: 构建含共享 validator 的 bundle
- **WHEN** maintainer 构建公开 bundle
- **THEN** Author、Apply 与 Design 的安装树各自包含可执行的共享 validator 与 `design-system/v1` schema，且副本与仓库权威源字节一致

#### Scenario: bundle 只有 discovery wrapper
- **WHEN** artifact 含 discovery wrapper 但不含共享实现或其 schema
- **THEN** bundle validation 失败且不得发布

#### Scenario: Design-only 安装后 validate
- **WHEN** 空项目只安装 `ui-template-design`，无 Author/Apply、无仓库 `scripts/validate_design_system.py`
- **THEN** 对该项目 Active Instance 运行 Design 的 `validate` 能启动共享实现并返回统一 JSON，不得报共享 validator 未安装，也不得再 exec wrapper

### Requirement: Discovery wrapper 禁止自调用
discovery wrapper SHALL 在 `subprocess` 启动目标前解析最终路径；若目标为本 wrapper、与本 wrapper 同 inode、或目标文件声明自己是 discovery wrapper，SHALL 以非零退出与稳定 issue code `VALIDATOR_SELF_INVOCATION` fail closed，SHALL NOT 再创建子进程。`UI_DESIGN_SYSTEM_VALIDATOR` 指向 wrapper 时 SHALL 命中同一护栏，不得靠子进程继承环境变量继续繁殖。

#### Scenario: 环境变量指向自身
- **WHEN** `UI_DESIGN_SYSTEM_VALIDATOR` 解析为正在执行的 discovery wrapper
- **THEN** 进程立即以 `VALIDATOR_SELF_INVOCATION` 失败，进程树不增长

#### Scenario: 环境变量指向另一个 wrapper
- **WHEN** `UI_DESIGN_SYSTEM_VALIDATOR` 指向另一 public skill 的 discovery wrapper
- **THEN** 调用方以 `VALIDATOR_SELF_INVOCATION` 失败，不 `subprocess` 启动该 wrapper

#### Scenario: 环境变量指向共享实现
- **WHEN** `UI_DESIGN_SYSTEM_VALIDATOR` 指向共享实现且 schema 可用
- **THEN** wrapper 只启动一次该实现，并把子进程环境中的该变量保持为实现路径或清除 wrapper 路径
