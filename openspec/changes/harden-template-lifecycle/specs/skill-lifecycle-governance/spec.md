## Purpose

为 `ui-template` 与 `ui-template-apply` 建立可复现的双-skill 分发、安装、镜像、评估、CI 和版本发布治理，使外部用户获得完整兼容能力，仓库维护者能够在发布前确定性发现契约、文档与产物漂移。

## ADDED Requirements

### Requirement: 双-skill bundle
对外分发单元 SHALL 同时包含 `ui-template` 与 `ui-template-apply` 的生产文件、版本化 manifest 和许可信息。项目级 `ui-template-manager`、内部 patches/experience 及仓库专属配置 SHALL 不默认进入外部 bundle。

#### Scenario: 构建发布 bundle
- **WHEN** maintainer 构建可分发 artifact
- **THEN** artifact 同时包含两个 skill 的 `SKILL.md`、被引用 references、eval 运行所需生产资源、manifest 和 LICENSE

#### Scenario: 缺少任一 skill
- **WHEN** bundle 缺少 Authoring 或 Apply，或引用文件未打包
- **THEN** bundle validation 失败且不得发布

#### Scenario: 项目级 manager 被误打包
- **WHEN** 外部 bundle 包含 `ui-template-manager` 或仓库专属 OpenSpec skill
- **THEN** bundle validation 失败并报告非公开内容

### Requirement: 原子安装与卸载边界
安装器 SHALL 将双-skill bundle 写入临时 staging、校验 manifest 后原子替换目标 skill 目录，并 SHALL 清理源中已删除的普通生产文件。安装器 SHALL 不删除 bundle 目标之外文件，也不得无条件删除单独管理的历史审计档案。

#### Scenario: 安装到空项目
- **WHEN** 用户按 README 在临时空项目安装 bundle
- **THEN** 两个 skill 与全部引用文件存在，Authoring/Apply trigger smoke 均通过

#### Scenario: 重复安装新版本
- **WHEN** 新 bundle 删除了旧版本的普通生产文件
- **THEN** 重装后目标残留消失，且 bundle 外的其他 skills 不受影响

#### Scenario: 安装校验失败
- **WHEN** checksum、manifest 或引用完整性校验失败
- **THEN** 安装器不替换现有可用版本，并返回可操作错误

### Requirement: Manifest、兼容与可复现发布
manifest SHALL 记录 bundle version、两个 skill version、模板 schema 兼容范围、文件 SHA-256、生成工具版本和许可。发布 artifact SHALL 可从同一 revision 重建为内容等价结果，并 SHALL 附 checksum、CHANGELOG 和回滚入口。

#### Scenario: 兼容版本发布
- **WHEN** 发布只增加向后兼容行为
- **THEN** SemVer 和 CHANGELOG 按兼容策略更新，manifest 声明仍支持的 schema 范围

#### Scenario: 破坏性 schema 或 skill 契约发布
- **WHEN** schema version、origin 或 bundle 边界发生不兼容变化
- **THEN** 发布提升约定的破坏性版本并提供迁移说明，不以 patch 版本发布

#### Scenario: 重建 artifact
- **WHEN** 在固定工具版本下从同一 revision 两次构建 bundle
- **THEN** manifest 文件集合与内容摘要一致，任何差异均阻断发布

### Requirement: 生产源码与镜像治理
`skills/` SHALL 是生产 skill 正文的唯一源码。被跟踪的 `.agents` 或其他运行时镜像 SHALL 由确定性生成器重建，并 SHALL 在 CI 中检查生产文件零漂移；历史 patches/experience SHALL 按独立归档策略校验，不参与正文等价比较。

#### Scenario: 生产正文漂移
- **WHEN** 镜像中的 `SKILL.md` 或 reference 与 `skills/` 不一致
- **THEN** drift check 失败并指向文件级差异

#### Scenario: 只有历史档案不同
- **WHEN** 镜像包含有明确归属的历史 patch 而生产正文一致
- **THEN** 正文 drift check 通过，历史档案由独立策略决定保留、迁移或排除

#### Scenario: 重新生成镜像
- **WHEN** maintainer 运行 sync
- **THEN** 生成器从 staging 替换受管生产文件、写入 manifest，并不触碰不受管目录

### Requirement: 可执行 contract eval
仓库 SHALL 提供统一 eval runner，读取当前 Authoring 与 Apply cases，校验 ID/schema/fixture，并按 `judge: script` 或 `judge: llm` 执行。每次运行 SHALL 输出 JSON/JUnit、声明数/解析数/执行数、revision、fixture hash 和基线差异。

#### Scenario: deterministic case 运行
- **WHEN** case 可由路径、schema、路由边界、安装、反馈或 checkpoint 断言确定
- **THEN** 使用 script judge 运行并以非零退出阻断失败，不委托 LLM 猜测

#### Scenario: LLM case 运行
- **WHEN** case 必须评价自然语言行为
- **THEN** runner 使用固定 fixture、rubric 和结果 schema，并将模型/runtime fingerprint 写入结果

#### Scenario: case 数不一致
- **WHEN** 声明数、成功解析数与实际执行数不相等，或 ID 重复
- **THEN** eval 失败，不生成误导的绿色基线

#### Scenario: 历史 patch 数量不同
- **WHEN** 不可变历史 result 记录了旧 revision 的 case 数
- **THEN** runner 不改写历史，也不把旧计数与当前计数混合；当前结果绑定当前 revision

### Requirement: 最小 CI 门禁
每个变更 SHALL 运行 governance CI，包括模板 validator 正反 fixtures、OpenSpec strict、Markdown 本地链接、eval schema/runner、skill frontmatter/reference、bundle smoke、manifest/reproducibility 和生产镜像 drift。CI SHALL 不依赖修改或通过 `example/workbench-shell/web-v2/**`。

#### Scenario: governance 变更通过
- **WHEN** 所有契约、文档、bundle、eval 和镜像检查通过
- **THEN** governance job 成功并保留机器可读报告

#### Scenario: 注入契约错误
- **WHEN** mutation fixture 制造低对比色、未知 origin、断链、缺 skill 或镜像漂移
- **THEN** 对应 job 稳定失败并返回 finding code

#### Scenario: web-v2 状态变化
- **WHEN** `example/workbench-shell/web-v2/**` 存在已知问题或测试状态变化
- **THEN** 本 change 的 governance 验收不读取、不修改且不以该目录结果决定通过

### Requirement: 文档与安装入口一致性
README、AGENTS、active OpenSpec、生产 skills、templates 和发布说明 SHALL 描述相同的双-skill 职责、模板 schema、`apply/` 边界、安装命令和验证入口。这些发布与生产受管路径中的本地相对链接 SHALL 在发布前全部可解析；immutable archives、历史 patches 和尚未 promotion 的样例 SHALL 由各自策略检查。

#### Scenario: 用户按 README 安装
- **WHEN** 新用户只读取根 README 并执行安装步骤
- **THEN** 获得完整双-skill bundle，并能找到 Authoring、Apply、模板验证和升级说明

#### Scenario: 文档引用已删除路径
- **WHEN** README、AGENTS、active OpenSpec、生产 skill 或模板文档引用不存在的 `implementation/` 或其他本地路径
- **THEN** link/semantic validation 失败并阻断发布

#### Scenario: 历史文档保留旧术语
- **WHEN** archive change 或 immutable patch 记录当时的 `implementation/` 设计
- **THEN** 历史文件保持不变并被标识为档案，不参与 active 文档一致性判定

#### Scenario: web-v2 文档存在已知断链
- **WHEN** 本 change 运行文档治理检查
- **THEN** `example/workbench-shell/web-v2/**` 被记录为明确排除路径，不修改其文件，也不以其当前链接状态决定本 change 通过

### Requirement: 样例 promotion gate
任何样例 SHALL 在进入根 README、bundle 文档或“已支持”矩阵前被跟踪、绑定明确 change/revision，并通过其声明的 frozen install、build、静态检查、测试、多视口证据、反馈和本地化文档门禁。WIP 样例 SHALL 被明确标识且不计入发布能力。

#### Scenario: Promote 新样例
- **WHEN** maintainer 将 WIP 样例加入发布导航
- **THEN** promotion report 绑定 revision、命令、结果和证据，全部声明 gate 通过

#### Scenario: 样例仍未跟踪或测试失败
- **WHEN** 样例目录未被版本控制、仍持续变化或任一声明 gate 失败
- **THEN** 样例保持 WIP，不进入发布导航或兼容矩阵

#### Scenario: 既有样例不在本次修复范围
- **WHEN** 本 change 验证 lifecycle governance
- **THEN** 不要求修改 `example/workbench-shell/web-v2/**`，也不把其当前质量声明为本 change 的交付结果

### Requirement: 外部知识与依赖边界
bundle SHALL 不复制 `ui-ux-pro-max` 的数据集、持久化设计系统或 stack catalog。新增治理依赖 SHALL 采用固定版本和锁定清单，并 SHALL 在 manifest/许可清单中记录；外部知识只通过 Apply Query Contract 作为候选来源。

#### Scenario: 构建 bundle 时发现外部数据集
- **WHEN** artifact 包含第三方字体、图标、UI catalog 或 `ui-ux-pro-max` 数据副本
- **THEN** bundle validation 失败，除非该资产有显式分发需求、许可和独立批准

#### Scenario: 新增治理依赖
- **WHEN** validator、schema 或 release tooling 引入新包
- **THEN** 依赖使用精确版本并记录许可、用途和可复现安装方式
