## MODIFIED Requirements

### Requirement: 双-skill bundle
对外分发单元 SHALL 同时包含 `ui-template-author` 与 `ui-template-apply` 的生产文件、Author 只读官方 catalog、版本化 manifest 和许可信息，并 SHALL 包含可单独安装的 `ui-template-design` 生产文件。模板产品校验 SHALL 在缺少 Authoring、Apply 或 catalog 时失败。公开产物缺少 `ui-template-design` SHALL 也不得发布。项目级 `ui-template-manager`、内部 patches/experience 及仓库专属配置 SHALL 不默认进入外部 bundle。缺少 Design SHALL NOT 被解释为可以去掉 Author/Apply 成对约束；缺少 Author/Apply SHALL NOT 被 Design 单独安装通道所豁免。

#### Scenario: 构建发布 bundle
- **WHEN** maintainer 构建可分发 artifact
- **THEN** artifact 同时包含 Author/Apply 的 `SKILL.md`、被引用 references、eval 运行所需生产资源、Author catalog、`ui-template-design` 生产文件、manifest 和 LICENSE

#### Scenario: 缺少任一 skill
- **WHEN** bundle 缺少 Authoring 或 Apply，或引用文件未打包
- **THEN** bundle validation 失败且不得发布

#### Scenario: 缺少独立 Design skill
- **WHEN** bundle 含 Author/Apply 与 catalog 但不含 `ui-template-design` 或其被引用文件
- **THEN** bundle validation 失败且不得发布

#### Scenario: 项目级 manager 被误打包
- **WHEN** 外部 bundle 包含 `ui-template-manager` 或仓库专属 OpenSpec skill
- **THEN** bundle validation 失败并报告非公开内容

#### Scenario: bundle 缺少 catalog
- **WHEN** bundle 含公开 skill 但不含官方 catalog 或其 published 模板
- **THEN** bundle validation 失败且不得发布

### Requirement: 原子安装与卸载边界
安装器 SHALL 将公开 bundle 写入临时 staging、校验 manifest 后原子替换**本次选中的** skill 目录，并 SHALL 清理这些目录中源已删除的普通生产文件。成对安装 Author/Apply SHALL NOT 删除或覆盖已安装的 `ui-template-design`。单独安装 `ui-template-design` SHALL NOT 删除或覆盖 Author/Apply，也 SHALL NOT 要求 catalog 存在于目标项目。安装器 SHALL 不删除 bundle 目标之外文件，也不得无条件删除单独管理的历史审计档案。

#### Scenario: 安装到空项目
- **WHEN** 用户按 README 在临时空项目成对安装 Author/Apply
- **THEN** 两个 skill 与全部引用文件存在，Authoring/Apply trigger smoke 均通过；不把缺少 Design 当作该安装失败

#### Scenario: 只安装 Design
- **WHEN** 用户在空项目只安装 `ui-template-design`
- **THEN** 目标出现 Design 生产文件，不出现 Author/Apply 不得视为失败，且不创建项目 `templates/`

#### Scenario: 成对升级保留 Design
- **WHEN** 目标已有 `ui-template-design`，随后只升级 Author/Apply
- **THEN** Design 目录保持可用，不被成对安装器删除

#### Scenario: 重复安装新版本
- **WHEN** 新 bundle 删除了旧版本的普通生产文件
- **THEN** 重装后目标残留消失，且未选中的其他 skills 不受影响

#### Scenario: 升级时移除已退役 Authoring 目录
- **WHEN** 目标已有旧 public skill `ui-template`，且新 bundle 的 Authoring 身份是 `ui-template-author`
- **THEN** 安装成功后 `ui-template` 生产目录被移除，其 `patches/` 与 `experience/` 迁到 `ui-template-author`，其他非本次目标 skill 不受影响

#### Scenario: 安装校验失败
- **WHEN** checksum、manifest 或引用完整性校验失败
- **THEN** 安装器不替换现有可用版本，并返回可操作错误

### Requirement: Manifest、兼容与可复现发布
manifest SHALL 记录 bundle version、各 public skill version（Author、Apply、Design）、模板 schema 兼容范围、文件 SHA-256、生成工具版本和许可。发布 artifact SHALL 可从同一 revision 重建为内容等价结果，并 SHALL 附 checksum、CHANGELOG 和回滚入口。Design 的兼容声明 SHALL 独立于模板 schema 范围；模板 schema 破坏性变更 SHALL NOT 单独迫使 Design 无故升主版本，除非其消费模板适配器不兼容。

#### Scenario: 兼容版本发布
- **WHEN** 发布只增加向后兼容行为
- **THEN** SemVer 和 CHANGELOG 按兼容策略更新，manifest 声明仍支持的 schema 范围

#### Scenario: 破坏性 schema 或 skill 契约发布
- **WHEN** schema version、origin 或 bundle 边界发生不兼容变化
- **THEN** 发布提升约定的破坏性版本并提供迁移说明，不以 patch 版本发布

#### Scenario: 重建 artifact
- **WHEN** 在固定工具版本下从同一 revision 两次构建 bundle
- **THEN** manifest 文件集合与内容摘要一致，任何差异均阻断发布

### Requirement: 可执行 contract eval
仓库 SHALL 提供统一 eval runner，读取当前 Authoring、Apply 与 Design cases，校验 ID/schema/fixture，并按 `judge: script` 或 `judge: llm` 执行。每次运行 SHALL 输出 JSON/JUnit、声明数/解析数/执行数、revision、fixture hash 和基线差异。Design 的独立完成夹具 SHALL 在没有 Author/Apply 安装、没有模板库的目录中执行。

#### Scenario: deterministic case 运行
- **WHEN** case 可由路径、schema、路由边界、安装、反馈或 checkpoint 断言确定
- **THEN** 使用 script judge 运行并以非零退出阻断失败，不委托 LLM 猜测

#### Scenario: LLM case 运行
- **WHEN** case 必须评价自然语言行为
- **THEN** runner 使用固定 fixture、rubric 和结果 schema，并将模型/runtime fingerprint 写入结果

#### Scenario: case 数不一致
- **WHEN** 声明数、成功解析数与实际执行数不相等，或 ID 重复
- **THEN** eval 失败，不生成误导的绿色基线

#### Scenario: Design 无依赖夹具
- **WHEN** 运行 Design 独立完成 case
- **THEN** fixture 不含 Author/Apply skill 目录与 templates/catalog，且 case 仍声明并执行成功

#### Scenario: 历史 patch 数量不同
- **WHEN** 不可变历史 result 记录了旧 revision 的 case 数
- **THEN** runner 不改写历史，也不把旧计数与当前计数混合；当前结果绑定当前 revision

### Requirement: 文档与安装入口一致性
README、AGENTS、active OpenSpec、生产 skills、templates、catalog 和发布说明 SHALL 描述相同的产品关系：Author/Apply 必须成对安装并携带 catalog；`ui-template-design` 可单独安装且不要求模板。这些发布与生产受管路径中的本地相对链接 SHALL 在发布前全部可解析；immutable archives、历史 patches 和尚未 promotion 的样例 SHALL 由各自策略检查。`docs/ui-template-design.md` 若存在 SHALL 被标识为规划草案，SHALL NOT 作为发布能力证据。

#### Scenario: 用户按 README 安装
- **WHEN** 新用户只读取根 README 并执行模板产品安装步骤
- **THEN** 获得成对公开 skill 与官方 catalog，并能找到 Authoring、Apply、模板验证和升级说明

#### Scenario: 用户按 README 安装 Design
- **WHEN** 新用户只读取根 README 并执行 Design 安装步骤
- **THEN** 能单独安装 `ui-template-design`，文档不把缺少 Author/Apply 写成该步骤失败

#### Scenario: 文档引用已删除路径
- **WHEN** README、AGENTS、active OpenSpec、生产 skill 或模板文档引用不存在的 `implementation/` 或其他本地路径
- **THEN** link/semantic validation 失败并阻断发布

#### Scenario: 历史文档保留旧术语
- **WHEN** archive change 或 immutable patch 记录当时的 `implementation/` 设计
- **THEN** 历史文件保持不变并被标识为档案，不参与 active 文档一致性判定

#### Scenario: web-v2 文档存在已知断链
- **WHEN** 本 change 运行文档治理检查
- **THEN** `example/workbench-shell/web-v2/**` 被记录为明确排除路径，不修改其文件，也不以其当前链接状态决定本 change 通过

### Requirement: npx skills 为对外安装入口
根 README 与生产 skill 文档 SHALL 给出两个普通用户入口，且都使用显式 `-s` 的 `npx skills add`：成对 `ui-template-author` 与 `ui-template-apply`；以及单独的 `ui-template-design`。文档 SHALL NOT 把 `--all` 或未加 `-s` 的仓库级 add 写成官方安装。文档 SHALL NOT 把 Design 写成必须与模板对同时安装。`make bundle` / `make install` SHALL 仍作为治理、checksum 与回滚通道被记录，但不得再作为唯一或首选用户入口。

#### Scenario: 新用户按 README 安装
- **WHEN** 用户只读根 README 并执行模板产品安装步骤
- **THEN** 两个公开 skill 与 Author catalog 出现在目标 agent skills 目录，且能找到 Apply 消费说明

#### Scenario: 新用户按 README 只装 Design
- **WHEN** 用户只读根 README 并执行 Design 安装步骤
- **THEN** 文档给出的命令只选择 `ui-template-design`，不要求同时列出 Author/Apply

#### Scenario: 文档推荐装全部仓库 skill
- **WHEN** 发布文档把 `npx skills add <repo> --all` 或未筛选的仓库 add 写成官方步骤
- **THEN** 文档一致性检查失败

### Requirement: 默认发现面不含内部 skill
本仓被 `npx skills` 默认发现的 skill SHALL 仅为 `ui-template-author`、`ui-template-apply` 与 `ui-template-design`。`ui-template-manager` 与本仓 OpenSpec skill SHALL 声明 `metadata.internal: true`（或等价隐藏），在未设置 `INSTALL_INTERNAL_SKILLS` 时不可被 list/add。

#### Scenario: 本地 list 公开 skill
- **WHEN** 在未设置 `INSTALL_INTERNAL_SKILLS` 的环境对仓库运行 `npx skills add . --list`
- **THEN** 输出含 `ui-template-author`、`ui-template-apply` 与 `ui-template-design`，不含 manager 与 OpenSpec skill

#### Scenario: 内部 skill 仍可本仓使用
- **WHEN** 维护者在本仓库直接读取 `.agents/skills/ui-template-manager` 或 OpenSpec skill
- **THEN** 这些文件仍存在且可路由，只是不被默认公开安装

## ADDED Requirements

### Requirement: Design 不进入模板对强制升级
`ui-template-author` 与 `ui-template-apply` 仍 SHALL 配套升级。`ui-template-design` SHALL NOT 被加入「必须与模板对同时升级」的约束。已装模板对的项目缺少 Design SHALL NOT 使模板产品校验失败。

#### Scenario: 只升级模板对
- **WHEN** 用户升级 Author/Apply 到新兼容版本，未安装 Design
- **THEN** 模板产品安装与校验通过

#### Scenario: 只升级 Design
- **WHEN** 用户升级 Design，不升级 Author/Apply
- **THEN** Design 安装器只替换 Design 目录，模板对保持可用
