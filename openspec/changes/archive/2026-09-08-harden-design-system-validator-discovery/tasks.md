## 1. Canonical validator

- [x] 1.1 在 `scripts/validate_design_system.py` 增加 `DESIGN_SYSTEM_VALIDATOR_ROLE = "implementation"`，并按 design D2 有序解析 schema 目录（`runtime/schemas/design-system/v1` 然后仓库 `schemas/design-system/v1`），失败码 `SCHEMA_DIR_MISSING`
- [x] 1.2 确认仓库路径 `python3 scripts/validate_design_system.py validate templates/workbench-shell --kind package --json` 仍通过，schema 发现未破坏现有 ROOT

## 2. Discovery wrappers

- [x] 2.1 三个 wrapper 写入 `DESIGN_SYSTEM_VALIDATOR_ROLE = "discovery"`，exec 前拒绝自身路径、同 inode、以及角色不是 `implementation` 的目标，稳定码 `VALIDATOR_SELF_INVOCATION` 且不调用 `subprocess.run`
- [x] 2.2 发现顺序改为：合法 `UI_DESIGN_SYSTEM_VALIDATOR` → 本 skill `runtime/shared_validate_design_system.py` → 仅当仓库根含 `schemas/design-system/v1/` 时的 `scripts/validate_design_system.py`；启动实现时把子进程环境中的该变量设为实现路径或清除 wrapper 路径
- [x] 2.3 抽出三 wrapper 共用的解析/护栏逻辑，避免三份行为分叉（可放 runtime 小模块或同步片段，但仍以各 skill 安装树自包含为准）

## 3. 生产副本与 allowlist

- [x] 3.1 增加从权威源同步到 Author/Design/Apply `runtime/shared_validate_design_system.py` 与 `runtime/schemas/design-system/v1/` 的可重复命令，并写入生产树
- [x] 3.2 更新 `governance/release/distribution-v1.yaml`，使三个 public skill 都包含共享脚本与 design-system schema；缺文件时 `make bundle` 失败
- [x] 3.3 在 `check_active_release`（或等价治理检查）断言三份副本与权威源字节一致，漂移失败

## 4. Skill 正文

- [x] 4.1 改 Author `SKILL.md` 与 package-format 发现协议：禁止把 wrapper 列为 `UI_DESIGN_SYSTEM_VALIDATOR` 候选；写明共享实现路径与 `VALIDATOR_SELF_INVOCATION` / `DESIGN_SYSTEM_VALIDATOR_MISSING`
- [x] 4.2 改 Design/Apply `SKILL.md` 与相关 references 的 validate 命令与发现协议，覆盖 Design-only 与成对安装，禁止 wrapper 自指
- [x] 4.3 同步派生入口（README / AGENTS / FUNCTIONAL-LOOP 中与发现协议冲突的句子），不改 archive

## 5. Tests and evals

- [x] 5.1 负向测试：env 指向自身、指向另一 wrapper；断言 `VALIDATOR_SELF_INVOCATION`、`subprocess.run` 未被调用（禁止真实 fork bomb）
- [x] 5.2 正向测试：env 指向共享实现只启动一次；无 env 的临时 Design-only 安装树（无 `scripts/`、无 Author）对 fixture Active Instance `validate --kind active --json` 成功
- [x] 5.3 治理/eval：allowlist 缺共享文件失败；现有 package/active contract eval 保持通过

## 6. Patch release metadata

- [x] 6.1 三个 public skill 与 bundle 版本 `3.0.0` → `3.0.1`（VERSION、distribution、compatibility、CHANGELOG），说明自调用失败码与安装态自带 validator；不重写 3.0.0 archive 证据

## 7. Gates

- [x] 7.1 运行 `make test`
- [x] 7.2 运行 `make eval`
- [x] 7.3 运行 `make validate`
- [x] 7.4 运行 `make bundle` 并确认产物含三份共享 validator 与 schema
- [x] 7.5 运行 `openspec validate harden-design-system-validator-discovery --strict`
