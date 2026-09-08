## Why

schema、Author、Design、Apply 子 change 完成后，仓库仍以 schema v2 为当前发布格式。需要一个 breaking release 子 change 将兼容矩阵、官方 catalog、vendor 分发和派生文档原子切换到 `design-system/v1`。

## What Changes

- 发布 bundle `3.0.0`，Author、Design、Apply 同步进入 `3.0.0` 兼容线；**BREAKING**。
- 将 `templates/workbench-shell` 迁移为 `design-system/v1`、`capability: page-system`、version `3.0.0` candidate，并在用户单独确认发布后更新 Author catalog。
- 将当前发布格式改为 `design-system/v1`；schema v2 与 design-freeze v1 只保留显式 migration 入口。
- 将四个 vendor reference 与 vendor manifest 纳入 Apply bundle allowlist 和治理测试。
- 同步 `AGENTS.md`、README、`governance/FUNCTIONAL-LOOP.md`、release changelog、compatibility、migration、rollback、distribution manifest 和 OpenSpec base。
- 执行四类 fixture、官方迁移、双构建 checksum、bootstrap/increment 干净重生和完整治理回归。

## Capabilities

### New Capabilities

- `design-system-release`: 统一契约 breaking release、官方 catalog 切换、验收证据和回滚行为。

### Modified Capabilities

- `design-system-contract`: 定义当前发布兼容范围与旧格式迁移-only 语义。
- `template-contract-validation`: 将当前模板校验主线切换到 `design-system/v1`，schema v2 转为显式迁移输入。
- `skill-lifecycle-governance`: 更新 bundle `3.0.0`、vendor allowlist、双 skill 安装边界和发布验收。
- `workbench-shell-implementation`: 定义 workbench-shell 统一 package 迁移与 catalog 一致性要求。

## Impact

- 影响 `templates/workbench-shell/`、`skills/ui-template-author/catalog/`、`governance/release/`、README、AGENTS、Makefile、bundle manifest 和全部治理测试。
- 依赖 schema、Author、Design、Apply 四个子 change 全部完成。
- publish、tag 和 catalog promotion 仍需用户单独确认；本 change 产出的迁移结果默认是 candidate。
