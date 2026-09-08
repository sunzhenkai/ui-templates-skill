## Context

三个 public skill 的 runtime 已有 discovery wrapper，通过 `UI_DESIGN_SYSTEM_VALIDATOR` 或 `here.parents[3]/scripts/validate_design_system.py` 再 `subprocess.run` 共享实现。仓库内开发路径成立；`npx skills add` 复制的是 git 上的 `skills/<name>/`，不是 `make bundle` 注入后的 dist。因此共享实现必须进入生产 skill 树。wrapper 无身份护栏，环境变量指回自身即无限 exec。动机见 `proposal.md`。

权威实现仍是 `scripts/validate_design_system.py` 与 `schemas/design-system/v1/`。安装态副本必须与之字节一致，由治理检查锁死。

## Goals / Non-Goals

**Goals:**

- 同一份 validator 源在仓库路径与安装路径都能解析 schema。
- wrapper 在任何会递归的目标上零子进程失败。
- Design-only 与 Author/Apply 成对安装都能完成对应 `validate`。
- 副本漂移、缺 schema、缺共享文件在 `make bundle` / 治理检查失败。

**Non-Goals:**

- 不改 `design-system/v1` 校验语义、digest 算法或 JSON 字段。
- 不把 schema v2 `validate_templates.py` 发现协议并进本次。
- 不改 npx 安装通道去消费 dist/；不在本仓 `.agents/skills` 放公开镜像。
- 不在本 change 安装主机 earlyoom/`systemd-oomd`。
- 不用 in-process import 替换 `subprocess`（保持退出码与隔离）；护栏足够切断繁殖。

## Decisions

### D1. 生产源码内嵌共享副本，而不是只在 bundle 时注入

`npx skills add` 拷贝 git `skills/`。若只在 `make bundle` 写入 `shared_validate_design_system.py`，GitHub 安装树仍只有 wrapper，事故会再现。

选择：把共享实现与 `design-system/v1` schema 作为生产文件放进每个相关 skill 的 `runtime/`（Author、Design、Apply 各一份）。bundle allowlist 显式包含这些路径。治理测试断言三份副本与 `scripts/validate_design_system.py`、`schemas/design-system/v1/` 字节相同。

备选：只放在 Author，Design/Apply 去找兄弟 skill —— 违反 Design 可单独安装。

备选：改 vercel-labs/skills 安装器读 dist/ —— 超出本仓控制，且不能修已安装用户。

### D2. 权威脚本同时支持两种 ROOT

当前 `SCHEMA_DIR = Path(__file__).parents[1] / "schemas/design-system/v1"` 只服务 `scripts/`。安装态文件在 `runtime/shared_validate_design_system.py`。

选择：在权威脚本内做 fail-closed 有序发现：

1. `Path(__file__).parent / "schemas/design-system/v1"`（安装态，schema 与共享脚本同目录层）
2. `Path(__file__).parents[1] / "schemas/design-system/v1"`（仓库 `scripts/`）
3. 否则 `SCHEMA_DIR_MISSING`

skill 布局为 `runtime/shared_validate_design_system.py` 与 `runtime/schemas/design-system/v1/`，与现有 `runtime/schemas/template/` 并列。不维护一份打过补丁的 fork。

### D3. 稳定角色标记切断 wrapper→wrapper

仅比较 `resolve()` 与 inode 挡不住「Design wrapper 的 env 指向 Author wrapper」：Design 会先 `subprocess` 出 Author wrapper，再由 Author 自调用才失败，仍多一个进程，且依赖子 wrapper 也已打补丁。

选择：discovery wrapper 文件含稳定标记（例如 `DESIGN_SYSTEM_VALIDATOR_ROLE = "discovery"`）；共享实现标记 `"implementation"`。wrapper 在 exec 前读取目标文件头部/标记，角色不是 `implementation` 则 `VALIDATOR_SELF_INVOCATION` 且不创建子进程。自身路径、同 inode 同样失败。

子进程环境：若启动的是 implementation，将 `UI_DESIGN_SYSTEM_VALIDATOR` 设为该实现路径（或删除指向 wrapper 的值），避免未来实现误读。

### D4. 发现顺序（安装态优先共享副本）

有序候选：

1. `UI_DESIGN_SYSTEM_VALIDATOR`（必须通过 D3 护栏）
2. 本 skill `runtime/shared_validate_design_system.py`
3. 仅当仓库根同时存在 `schemas/design-system/v1/` 时：`scripts/validate_design_system.py`

禁止：把本 wrapper 或其他 wrapper 当作候选；禁止 `PATH`；禁止用 wrapper 路径去「补」环境变量。`SKILL.md` / references 按此改写，删除「env 或 `runtime/validate_design_system.py`」这种并列表述。

仓库内开发继续走候选 3，不必 export。

### D5. 版本与文档

行为对误配置从「挂起/繁殖」变为立即失败，对正确安装从「缺失」变为可校验。契约 family 不变，三个 public skill 与 bundle 同号 patch `3.0.0` → `3.0.1`。CHANGELOG 写清自调用失败码与安装态自带 validator。不改 archive 里的 3.0.0 release 证据。

### D6. 回归测试形态

- 单元：临时目录复制 wrapper，`UI_DESIGN_SYSTEM_VALIDATOR` 指向自身 / 指向另一 wrapper / 指向实现；断言退出码、issue code、子进程数不增加（可用 `os.fork` 计数或包装 `subprocess.run`）。
- 安装树：从 `skills/ui-template-design` 构造无 `scripts/` 的临时 skill 根，对 fixture Active Instance `validate --kind active` 成功。
- 治理：allowlist 缺共享文件或副本漂移时 `check_active_release` / distribution 构建失败。
- 禁止用真实 fork bomb 作为测试；护栏测试必须在创建子进程前失败。

## Risks / Trade-offs

- [三份副本漂移] → 单一权威源 + CI 字节比对；禁止手改副本。
- [schema 发现改坏仓库路径] → 候选 2 保持 `scripts/` 布局；现有 `make validate` 必须绿。
- [Agent 仍把 wrapper 写进 env] → 正文禁止该写法，且护栏使该写法立即失败而非繁殖。
- [已安装 3.0.0 用户] → 需重装/升级 skill 才带上共享实现；未升级则缺文件 fail closed（优于 fork bomb），CHANGELOG 写明。
- [Apply 是否必须带完整 schema] → 必须：Apply-only 虽不是对外入口，成对安装后 checker 走 Apply runtime；缺 schema 会在消费项目挂。三 skill 对称分发，避免隐式依赖 Author 路径。

## Migration Plan

1. 落地权威脚本 schema 发现、角色标记、三 wrapper 护栏与共享副本同步。
2. 更新 allowlist、SKILL/references、patch 版本与 CHANGELOG。
3. `make test`、`make eval`、`make validate`、`make bundle`；用临时安装树做 Design-only validate。
4. 发布/分发 3.0.1 后，已安装用户按现有 `npx skills add` 升级。
5. 回滚：恢复上一 bundle/skill 版本。旧 3.0.0 安装树仍缺共享实现，应 fail closed 而不是自调用；若回滚到未打护栏的 wrapper，禁止设置 `UI_DESIGN_SYSTEM_VALIDATOR` 为 wrapper。

## Open Questions

无。主机 OOM 守护是运维项，不阻塞本 change。
