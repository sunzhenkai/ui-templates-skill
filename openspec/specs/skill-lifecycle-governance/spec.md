## Purpose

为 `ui-template-author` 与 `ui-template-apply` 建立可复现的双-skill 分发、评估、CI 和版本发布治理，并使 structural profile schema、eval 资产与 `example/**` 排除进入同一发布边界。本仓 `.agents/skills` 不承载公开 skill 运行时镜像。

## Requirements

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

### Requirement: 生产源码与本地技能目录边界
`skills/` SHALL 是生产 skill 正文的唯一源码。本仓被跟踪的 `.agents/skills` SHALL 只保留 repository-only `ui-template-manager`，SHALL NOT 包含 `ui-template-author`、`ui-template-apply`、`ui-template-design` 或公开 manifest 镜像。历史 patches/experience SHALL 按独立归档策略校验，不参与正文等价比较。

#### Scenario: 公开 skill 源码变化
- **WHEN** `skills/` 下公开 skill 正文或受管 runtime 资产变化
- **THEN** 变更只落在生产源码、schema、validator、eval 和派生活动文档；`.agents/skills` 不新增公开 skill 镜像

#### Scenario: 发现本地技能目录
- **WHEN** 治理检查枚举 `.agents/skills`
- **THEN** 只允许 `ui-template-manager`，发现其他公开 skill 目录或公开 manifest 时失败

#### Scenario: 构建公开产物
- **WHEN** maintainer 需要公开 bundle
- **THEN** 从 `skills/` 与版本化 allowlist 构建 artifact，不通过本仓 `.agents/skills` 暂存或安装

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

### Requirement: 最小 CI 门禁
每个变更 SHALL 运行 governance CI，包括模板 validator 正反 fixtures、OpenSpec strict、Markdown 本地链接、eval schema/runner、skill frontmatter/reference、bundle smoke、manifest/reproducibility 和本地 `.agents/skills` 边界检查。CI SHALL 不依赖修改或通过 `example/workbench-shell/web-v2/**`。

#### Scenario: governance 变更通过
- **WHEN** 所有契约、文档、bundle 和 eval 检查通过
- **THEN** governance job 成功并保留机器可读报告

#### Scenario: 注入契约错误
- **WHEN** mutation fixture 制造低对比色、未知 origin、断链、缺 skill 或公开 skill 进入本仓 `.agents/skills`
- **THEN** 对应 job 稳定失败并返回 finding code

#### Scenario: web-v2 状态变化
- **WHEN** `example/workbench-shell/web-v2/**` 存在已知问题或测试状态变化
- **THEN** 本 change 的 governance 验收不读取、不修改且不以该目录结果决定通过

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
根 README 与生产 skill 文档 SHALL 给出两个普通用户入口，且都使用显式 `-s` 的 `npx skills add`：成对 `ui-template-author` 与 `ui-template-apply`；以及单独的 `ui-template-design`。文档 SHALL NOT 把 `--all` 或未加 `-s` 的仓库级 add 写成官方安装。文档 SHALL NOT 把 Design 写成必须与模板对同时安装。`make bundle` SHALL 仍作为治理、checksum 与可复现发布通道被记录；根 Makefile SHALL NOT 声明 install 或本地公开 skill mirror 目标。

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

### Requirement: Structural profile 分发资源
双-skill bundle SHALL 包含 structural profile schema、portable internal validator、source replay 能力、固定 non-example fixtures、eval cases 和兼容说明。Authoring 与 Apply 生产源码 SHALL 由版本化 allowlist 构建进 bundle，并由 manifest 对这些资源执行完整性检查。

#### Scenario: 构建 profile-capable bundle
- **WHEN**maintainer 构建包含 structural fidelity 能力的 bundle
- **THEN**安装后的 `ui-template-author` 可生成/验证/replay profile，`ui-template-apply` 可消费 profile，全部引用 schema/fixtures/runtime 均存在且 manifest digest 正确

#### Scenario: Bundle 缺 profile schema
- **WHEN**SKILL/reference 声明 structural profile 但 artifact 缺少 schema、runtime 或 fixture
- **THEN**bundle validation 失败且不得发布

### Requirement: Structural contract eval 与方差报告
Contract eval SHALL 增加不依赖 `example/**` 的 repo Authoring 与 Apply cases，验证固定 revision/scope 的 canonical structural semantics、source replay、required scenario identities、负向 mutations，以及 **shell chrome composition**（variant、有序槽位、trigger/FAB 锚点、无 graph 失败、layout-high-without-chrome）。普通 CI SHALL 以确定性 script judges 阻断 schema/refs/replay/identity/chrome 漂移；受控多 Agent 方差评估 SHALL 记录 runtime/model fingerprint，不以自然语言主观评分替代 semantic assertions。

#### Scenario: Authoring semantic reproducibility
- **WHEN** 相同固定 repo fixture 被重复 Authoring
- **THEN** eval 报告 profile digest、record identities/status/unresolved 集合一致，任一语义漂移失败

#### Scenario: Apply assertion reproducibility
- **WHEN** 多个 Apply Agent 消费同一 profile 和 scope
- **THEN** Phase 2/4 constraints 与 Phase 8 required scenario ID 集合一致，即使目标实现结构不同

#### Scenario: LLM 方差评估未授权
- **WHEN** 普通离线 CI 没有显式授权模型调用
- **THEN** runner 只执行 script judges 和固定资产校验，不发送来源仓库、模板或用户数据到外部服务

#### Scenario: Chrome composition eval
- **WHEN** eval 运行 chrome 正向 fixture 与 inset→flush / 槽位重排 / 无 graph 负向 cases
- **THEN** 正向 digest 稳定；负向 cases 以稳定 issue code 失败；输入路径不含 `example/**`

### Requirement: Profile 兼容与发布语义
兼容矩阵、manifest 和 changelog SHALL 分别声明 template core schema 范围与 structural profile schema/profile 范围。无 sidecar 的 v2 模板 SHALL 保持 baseline 支持；未知 profile 或破坏性 profile 变化 SHALL 按兼容策略拒绝或提升约定版本，并提供迁移/回滚说明。

#### Scenario: 向后兼容 profile 增强
- **WHEN**bundle 增加 optional structural profile 支持且不改变 v2 core 解析
- **THEN**release metadata 声明 baseline v2 与 profile-capable 路径，旧模板继续可安装消费

#### Scenario: Profile schema 不兼容变化
- **WHEN**closed enums、record identity 或 required semantics 发生不兼容变化
- **THEN**profile version 和相应 skill/bundle version 按策略提升，旧 profile 不被静默按新语义读取

### Requirement: Example 治理排除保持有效
本 change 的 root validation、profile fixtures、source replay、eval、bundle 和 release evidence SHALL 明确排除 `example/**`。任何任务 SHALL 不修改、格式化、迁移、运行或 promote `example/workbench-shell/web-v1/**`、`example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 或其他生成样例代码；样例质量 SHALL 不决定本 change 通过。

#### Scenario: Root governance 验收
- **WHEN** 执行本 change 的 validate/test/eval/bundle 检查
- **THEN** 机器报告声明 `example/**` exclusion，且没有命令把样例路径作为输入或测试根

#### Scenario: Example 代码出现已知缺陷
- **WHEN** 生成样例存在 link、Dialog、layout 或其他实现问题
- **THEN** 本 change 只修模板契约、生产 skill 和治理 fixtures，不修改样例代码，也不将样例结果声明为已修复

#### Scenario: Diff 触及 example
- **WHEN** 实现或生成器产生 `example/**` diff
- **THEN** scope guard 失败并要求移除该 diff，不能通过更新 baseline 隐藏

### Requirement: Active change 顺序与历史边界
本 change SHALL 以 `harden-template-lifecycle` effective contract 为前置语义。若两个 changes 归档，maintainer SHALL 先归档前置 change，再归档本 change；任何 archive、publish、tag 或 sample promotion SHALL 需要独立请求。Immutable archive/patch/experience SHALL 不因 profile 术语做历史重写。

#### Scenario: 前置 change 尚未归档
- **WHEN**本 change 进行规划、实现或验证
- **THEN**工具按 base 加 active delta 解析 effective contract，不为消除 pending overlay 提前修改 base specs

#### Scenario: 准备归档本 change
- **WHEN**maintainer 请求归档但前置 change 仍 active
- **THEN**归档流程停止并要求先单独完成前置 change 的验证与归档

### Requirement: 功能闭环文档受治理
仓库 SHALL 在 `governance/FUNCTIONAL-LOOP.md` 维护现行功能与目标。该文档 SHALL 属于 active/release，并与生产 skill、validator、eval 一致。legacy review 文档 `docs/functional-loop-review.md` 已 superseded 并从仓库移除，不得再指导现行实现。

#### Scenario: 按功能文档安装与验证
- **WHEN** 维护者阅读 README 与 AGENTS
- **THEN** 能找到 FUNCTIONAL-LOOP、双 skill 入口、INDEX 状态和禁止改生成物的规约

### Requirement: 当前生成 web 治理排除
root governance SHALL 排除 `example/workbench-shell/web/**` 以及既有 `web-v1/**`、`web-v2/**`、`web-v3/**`。样例质量 SHALL 不决定发布通过。保真修复 SHALL NOT 以生成 web 源码为唯一交付。

#### Scenario: 治理验收
- **WHEN** 运行 validate/test/eval/bundle
- **THEN** 机器报告包含当前 `web/**` 排除，且不以该目录测试结果决定通过

### Requirement: 实例规格不得上升为产品契约
`workbench-shell-implementation` SHALL 只约束 `workbench-shell` 模板实例。通用 Authoring/Apply 契约 SHALL 不要求其他模板复制其 A–E、Shell 或业务页面集合。

#### Scenario: 新增非工作台模板
- **WHEN** Authoring 创建营销页或内容站模板
- **THEN** 不得因缺少 workbench A–E 模式而失败

### Requirement: Design 不进入模板对强制升级
`ui-template-author` 与 `ui-template-apply` 仍 SHALL 配套升级。`ui-template-design` SHALL NOT 被加入「必须与模板对同时升级」的约束。已装模板对的项目缺少 Design SHALL NOT 使模板产品校验失败。

#### Scenario: 只升级模板对
- **WHEN** 用户升级 Author/Apply 到新兼容版本，未安装 Design
- **THEN** 模板产品安装与校验通过

#### Scenario: 只升级 Design
- **WHEN** 用户升级 Design，不升级 Author/Apply
- **THEN** Design 安装器只替换 Design 目录，模板对保持可用

### Requirement: Bundle 3.0.0 unified release
Bundle `3.0.0` SHALL 同步声明 Author、Design、Apply 为 `3.0.0`，并将当前模板 contract 范围设为 `design-system/v1`。模板对安装边界 SHALL 保持 Author+Apply 成对，Design SHALL 保持独立安装与独立升级。

#### Scenario: 读取兼容矩阵
- **WHEN** 用户读取 bundle `3.0.0` compatibility
- **THEN** 三个 public skill 版本一致，当前 contract family 明确，Design 不被标记为模板对必需依赖

#### Scenario: 只安装 Design
- **WHEN** 用户执行单独 Design 安装命令
- **THEN** 安装不要求 Author/Apply，也不写入模板 catalog

### Requirement: Vendor assets in governed bundle
Bundle SHALL 只分发 vendor manifest 声明的 Apply reference 快照；每个快照 SHALL 记录 fixed revision、license、files、SHA-256 digests 和 allowed triggers。未声明文件、digest 不匹配、缺 license 或触发器不一致 SHALL 阻止构建。

#### Scenario: vendor audit
- **WHEN** bundle 构建扫描 vendor 目录
- **THEN** 每个文件都能追溯到 manifest 记录，且 manifest 的 allowed trigger 与 Apply skill 一致

#### Scenario: 未授权 vendor 文件
- **WHEN** vendor 目录出现未 allowlist 的文件
- **THEN** bundle 失败并报告路径，不得通过宽松 glob 自动纳入

### Requirement: Unified release regression
Bundle `3.0.0` release SHALL 运行 `make bootstrap`、`make validate`、`make test`、`make eval`、`make bundle` 与 `openspec validate --all --strict`，并保留 reproducible checksum、official migration、四类 fixture 和 bootstrap/increment 重生证据。

#### Scenario: release gate
- **WHEN** maintainer 请求 release verification
- **THEN** 全部固定命令与证据 gate 必须通过，缺失任一证据不得发布

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

### Requirement: Placement closure runtime distribution
The Author and Apply public bundle distribution SHALL include the schemas, shared validator implementation, Apply placement-closure checker logic, and deterministic fixtures/resources needed to validate placement topology and route closure in installed mode. Repository-only discovery wrappers SHALL NOT satisfy the distribution contract.

#### Scenario: Installed skill validation
- **WHEN** a consumer project invokes Author or Apply placement gates without the repository checkout
- **THEN** the bundled shared implementation validates the same stable fields and error codes as repository validation

#### Scenario: Missing bundled capability
- **WHEN** the bundle lacks a placement schema, checker, fixture, or shared validator dependency
- **THEN** bundle governance fails and the release is not promoted

### Requirement: Placement closure governance evals
Governance contract evals SHALL include deterministic Author and Apply cases for the generic placement contract. Evals SHALL count declared, parsed, and executed cases and SHALL fail on missing execution, unstable findings, example-based evidence, or source/oracle leakage into Apply.

#### Scenario: Negative evals block release
- **WHEN** a placement topology, source gate, route closure, or structural-availability mutation does not produce its expected stable failure
- **THEN** governance eval fails and production INDEX remains unchanged

#### Scenario: Generic fixture coverage
- **WHEN** contract evals run
- **THEN** positive and negative placement cases use stable semantic roles and fixtures that do not depend on `example/**`, a consumer application, or historical generated web output
