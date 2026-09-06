## ADDED Requirements

### Requirement: 官方 catalog 随公开 skill 分发
对外分发的 `ui-template-author` SHALL 在 skill 目录内携带只读官方 catalog，至少包含现行 published 模板 `workbench-shell` 及其 INDEX 行，以及每个模板的必备文件与已发布附件。`npx skills add` 与 `make bundle` 的公开产物 SHALL 都包含该 catalog。缺少 catalog、INDEX 行或任一 published 模板必备文件的公开产物 SHALL 不得发布，也不得被文档称为可 Apply。

#### Scenario: 构建含 catalog 的公开产物
- **WHEN** maintainer 构建 bundle 或检查将由 `npx skills` 拷贝的 Author skill 目录
- **THEN** 产物含 `ui-template-author` catalog INDEX、`workbench-shell` 的 `spec.md`/`tokens.yaml`/`meta.yaml`/`evidence.yaml` 及已发布附件，且 Apply skill 同时存在

#### Scenario: 公开产物缺少官方模板
- **WHEN** Author skill 或 bundle 没有 catalog、没有 `workbench-shell`，或 INDEX 缺少对应 published 行
- **THEN** 分发校验失败且不得发布

#### Scenario: 内部路由被公开
- **WHEN** `npx skills` 默认发现或 bundle 包含 `ui-template-manager` 或本仓 OpenSpec skill
- **THEN** 分发校验失败，或这些 skill 被标为 internal 且默认 list/add 不可见

### Requirement: npx skills 为对外安装入口
根 README 与生产 skill 文档的普通用户安装入口 SHALL 是成对安装两个公开 skill 的 `npx skills add` 命令，且 SHALL 显式指定 `ui-template-author` 与 `ui-template-apply`。文档 SHALL NOT 把 `--all` 或未加 `-s` 的仓库级 add 写成官方安装。`make bundle` / `make install` SHALL 仍作为治理、checksum 与回滚通道被记录，但不得再作为唯一或首选用户入口。

#### Scenario: 新用户按 README 安装
- **WHEN** 用户只读根 README 并执行安装步骤
- **THEN** 两个公开 skill 与 Author catalog 出现在目标 agent skills 目录，且能找到 Apply 消费说明

#### Scenario: 文档推荐装全部仓库 skill
- **WHEN** 发布文档把 `npx skills add <repo> --all` 或未筛选的仓库 add 写成官方步骤
- **THEN** 文档一致性检查失败

### Requirement: 默认发现面不含内部 skill
本仓被 `npx skills` 默认发现的 skill SHALL 仅为 `ui-template-author` 与 `ui-template-apply`。`ui-template-manager` 与本仓 OpenSpec skill SHALL 声明 `metadata.internal: true`（或等价隐藏），在未设置 `INSTALL_INTERNAL_SKILLS` 时不可被 list/add。

#### Scenario: 本地 list 公开 skill
- **WHEN** 在未设置 `INSTALL_INTERNAL_SKILLS` 的环境对仓库运行 `npx skills add . --list`
- **THEN** 输出只含 `ui-template-author` 与 `ui-template-apply`

#### Scenario: 内部 skill 仍可本仓使用
- **WHEN** 维护者在本仓库直接读取 `.agents/skills/ui-template-manager` 或 OpenSpec skill
- **THEN** 这些文件仍存在且可路由，只是不被默认公开安装

## MODIFIED Requirements

### Requirement: 双-skill bundle
对外分发单元 SHALL 同时包含 `ui-template-author` 与 `ui-template-apply` 的生产文件、Author 只读官方 catalog、版本化 manifest 和许可信息。项目级 `ui-template-manager`、内部 patches/experience 及仓库专属配置 SHALL 不默认进入外部 bundle。

#### Scenario: 构建发布 bundle
- **WHEN** maintainer 构建可分发 artifact
- **THEN** artifact 同时包含两个 skill 的 `SKILL.md`、被引用 references、eval 运行所需生产资源、Author catalog、manifest 和 LICENSE

#### Scenario: 缺少任一 skill
- **WHEN** bundle 缺少 Authoring 或 Apply，或引用文件未打包
- **THEN** bundle validation 失败且不得发布

#### Scenario: 项目级 manager 被误打包
- **WHEN** 外部 bundle 包含 `ui-template-manager` 或仓库专属 OpenSpec skill
- **THEN** bundle validation 失败并报告非公开内容

#### Scenario: bundle 缺少 catalog
- **WHEN** bundle 含双 skill 但不含官方 catalog 或其 published 模板
- **THEN** bundle validation 失败且不得发布

### Requirement: 文档与安装入口一致性
README、AGENTS、active OpenSpec、生产 skills、templates、catalog 和发布说明 SHALL 描述相同的双-skill 职责、模板 schema、`apply/` 边界、对外 `npx skills` 安装命令、治理 bundle 入口和验证入口。这些发布与生产受管路径中的本地相对链接 SHALL 在发布前全部可解析；immutable archives、历史 patches 和尚未 promotion 的样例 SHALL 由各自策略检查。

#### Scenario: 用户按 README 安装
- **WHEN** 新用户只读取根 README 并执行安装步骤
- **THEN** 获得成对公开 skill 与官方 catalog，并能找到 Authoring、Apply、模板验证和升级说明

#### Scenario: 文档引用已删除路径
- **WHEN** README、AGENTS、active OpenSpec、生产 skill 或模板文档引用不存在的 `implementation/` 或其他本地路径
- **THEN** link/semantic validation 失败并阻断发布

#### Scenario: 历史文档保留旧术语
- **WHEN** archive change 或 immutable patch 记录当时的 `implementation/` 设计
- **THEN** 历史文件保持不变并被标识为档案，不参与 active 文档一致性判定

#### Scenario: web-v2 文档存在已知断链
- **WHEN** 本 change 运行文档治理检查
- **THEN** `example/workbench-shell/web-v2/**` 被记录为明确排除路径，不修改其文件，也不以其当前链接状态决定本 change 通过
