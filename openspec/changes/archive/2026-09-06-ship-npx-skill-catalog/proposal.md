# Change: 随 skill 分发官方模板 catalog

## Why

公开安装通道是 `npx skills add`，它只拷贝 skill 目录。当前生产库停在仓库根 `templates/`，装完只有 Author/Apply 手续，没有可读的 published 模板；Apply Intake 对空项目等于读空气。开源用户的默认预期是装完就能用 `workbench-shell`，不是先自己抽一份模板。

## What Changes

- 把现行 published 官方模板（至少 `workbench-shell` 与其 INDEX 行）作为只读 **catalog** 放进 `ui-template-author` skill 目录，使 `npx skills add` 与 `make bundle` 都会带走完整模板文件。
- 对外主安装入口改为成对 `npx skills add sunzhenkai/ui-templates-skill -s ui-template-author -s ui-template-apply`；`make bundle` / `make install` 仍是治理与回滚通道，不再当普通用户入口。
- Apply/Author 在空项目或缺少同名 published 行时，从 Author `catalog/` 解析或播种到项目 `templates/`，然后按现有 `require-published` 消费。项目库仍是可写生产库；catalog 只读，升级 skill 不得覆盖用户已有模板。
- 收窄 `npx skills` 发现面：`ui-template-manager` 与本仓 OpenSpec skill 标为 internal，禁止把 `--all` 写成官方安装。
- README / AGENTS / skill 正文写清：没官方模板的安装物不得宣称可 Apply。

## Capabilities

### New Capabilities

无。本 change 扩展已有分发、Authoring 库解析与 Apply Intake。

### Modified Capabilities

- `skill-lifecycle-governance`: 公开分发必须包含官方 catalog；`npx skills` 为对外入口；内部 skill 不得被默认发现；bundle allowlist 与镜像同步 catalog。
- `ui-template-workflow`: 区分只读 catalog 与项目可写 `templates/`；缺项目行时从 catalog 播种；Authoring 只写项目库。
- `ui-template-apply-workflow`: 安装后无项目库时不得停成“没有模板”；必须能解析 catalog 中的 published `workbench-shell`（或播种后再 `require-published`）。
- `template-contract-validation`: catalog 与仓库根生产库必须是同一 published 集合的可校验副本；播种后的项目 INDEX 仍走现有校验。

## Impact

- `skills/ui-template-author/catalog/` 成为官方模板分发源；仓库根 `templates/` 仍是本仓生产库真相源，由生成/同步保证与 catalog 一致。
- `governance/release/distribution-v1.yaml` allowlist、bundle smoke、mirror、README 安装步骤、Author/Apply 路径解析与 contract eval 都要改。
- 不改 `workbench-shell` 设计内容，不 promote `example/**`，不 archive 其他 change，不把 `ui-template-manager` 或 OpenSpec skill 公开。
- 用户自建模板仍写在项目 `templates/`，不进 skill 升级覆盖面。
