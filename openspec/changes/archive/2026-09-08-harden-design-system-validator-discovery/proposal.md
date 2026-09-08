## Why

安装态三个 public skill 的 design-system discovery wrapper 会 `subprocess.run` 再拉起「共享 validator」，但 bundle 没有附带真正的 `scripts/validate_design_system.py`，`SKILL.md` 又把 wrapper 写成 `UI_DESIGN_SYSTEM_VALIDATOR` 候选。Agent 把环境变量指回 wrapper 后，子进程继承同一变量，形成无限自 exec；2026-09-08 一次 Codex `danger-full-access` 会话因此繁殖约万级 `validate_design_system.py` 进程，打满主机内存并使 ssh 超时。需要立刻让安装态 fail closed 且可独立完成校验，而不是继续依赖本仓库 checkout。

## What Changes

- 三个 discovery wrapper（Author `runtime/validate_design_system.py`、Design/Apply `runtime/check_active_instance.py`）在解析目标等于自身、同 inode、或目标自身声明为 discovery wrapper 时立即失败，稳定 issue code，禁止再 `subprocess.run`。
- 每个会发现统一 validator 的 public skill 在 bundle 中自带共享实现副本与其必需的 `design-system/v1` schema；Design 单独安装也必须能 `validate` Active Instance，不得依赖 Author 或仓库根 `scripts/`。
- Author/Design/Apply 的发现协议改为：`UI_DESIGN_SYSTEM_VALIDATOR` 只能指向共享实现，不得指向 wrapper；缺实现时 `DESIGN_SYSTEM_VALIDATOR_MISSING`，不得用 wrapper 路径「补」环境变量。
- 增加确定性测试：自调用护栏、安装树（含 Design-only）校验、allowlist/bundle 含共享实现与 schema。
- 兼容发布：三个 public skill 与 bundle 同号升 patch（从现行 `3.0.0` 到 `3.0.1`），不改 `design-system/v1` 契约语义。
- 不改：主机 earlyoom/`systemd-oomd`、Codex 会话恢复、schema v2 portable checker、生成 web。

## Capabilities

### New Capabilities

### Modified Capabilities

- `skill-lifecycle-governance`: bundle allowlist 与安装完整性必须包含共享 design-system validator 及其 schema；discovery wrapper 禁止自调用；Design-only 安装仍能完成统一 validate。
- `design-system-authoring`: Author 发现协议不得把 wrapper 当作 validator；Validate gate 在安装环境使用共享实现或显式实现路径。
- `design-system-active-instance`: Design freeze/validate 在无 Author、无仓库 `scripts/` 时仍 fail closed 地调用统一 validator，不得自 exec wrapper。
- `design-system-implementation`: Apply 的 Active Instance checker 遵守同一发现与自调用护栏。

## Impact

- 生产源码：`skills/ui-template-{author,design,apply}/runtime/` 三个 wrapper、对应 `SKILL.md`/references 发现协议、`governance/release/distribution-v1.yaml` 与 bundle 构建复制逻辑。
- 共享实现：从 `scripts/validate_design_system.py` 与 `schemas/design-system/v1/` 生成安装态 `runtime/shared_validate_design_system.py` 及 schema 副本；治理检查禁止 wrapper 与实现漂移。
- 测试/eval：新增自调用负向 fixture、安装树正向 validate；`make test` / `make eval` / `make validate` / `make bundle`。
- 发布：`governance/release/VERSION`、compatibility、CHANGELOG；不提升 contract family，不重写已 archive 的 `3.0.0` release 证据。
- 明确排除：主机 OOM 守护、example web、`.agents/skills` 公开镜像。
