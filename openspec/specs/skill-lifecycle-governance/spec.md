## Purpose

为 `ui-template-author` 与 `ui-template-apply` 建立可复现的双-skill 分发、安装、镜像、评估、CI 和版本发布治理，并使 structural profile schema、eval 资产与 `example/**` 排除进入同一发布边界。

## Requirements

### Requirement: 双-skill bundle
对外分发单元 SHALL 同时包含 `ui-template-author` 与 `ui-template-apply` 的生产文件、版本化 manifest 和许可信息。项目级 `ui-template-manager`、内部 patches/experience 及仓库专属配置 SHALL 不默认进入外部 bundle。

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

#### Scenario: 升级时移除已退役 Authoring 目录
- **WHEN** 目标已有旧 public skill `ui-template`，且新 bundle 的 Authoring 身份是 `ui-template-author`
- **THEN** 安装成功后 `ui-template` 生产目录被移除，其 `patches/` 与 `experience/` 迁到 `ui-template-author`，其他非 bundle skill 不受影响

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

### Requirement: Structural profile 分发资源
双-skill bundle SHALL 包含 structural profile schema、portable internal validator、source replay 能力、固定 non-example fixtures、eval cases 和兼容说明。Authoring 与 Apply 的受管镜像 SHALL 由生产 allowlist 生成并对这些资源执行零漂移检查。

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
本 change 的 root validation、profile fixtures、source replay、eval、bundle、mirror 和 release evidence SHALL 明确排除 `example/**`。任何任务 SHALL 不修改、格式化、迁移、运行或 promote `example/workbench-shell/web-v1/**`、`example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 或其他生成样例代码；样例质量 SHALL 不决定本 change 通过。

#### Scenario: Root governance 验收
- **WHEN** 执行本 change 的 validate/test/eval/bundle/mirror 检查
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
仓库 SHALL 在 `governance/FUNCTIONAL-LOOP.md` 维护现行功能与目标。该文档 SHALL 属于 active/release，并与生产 skill、validator、eval 一致。`docs/functional-loop-review.md` SHALL 被标识为 superseded，不指导现行实现。

#### Scenario: 按功能文档安装与验证
- **WHEN** 维护者阅读 README 与 AGENTS
- **THEN** 能找到 FUNCTIONAL-LOOP、双 skill 入口、INDEX 状态和禁止改生成物的规约

### Requirement: 当前生成 web 治理排除
root governance SHALL 排除 `example/workbench-shell/web/**` 以及既有 `web-v1/**`、`web-v2/**`、`web-v3/**`。样例质量 SHALL 不决定发布通过。保真修复 SHALL NOT 以生成 web 源码为唯一交付。

#### Scenario: 治理验收
- **WHEN** 运行 validate/test/eval/bundle/mirror
- **THEN** 机器报告包含当前 `web/**` 排除，且不以该目录测试结果决定通过

### Requirement: 实例规格不得上升为产品契约
`workbench-shell-implementation` SHALL 只约束 `workbench-shell` 模板实例。通用 Authoring/Apply 契约 SHALL 不要求其他模板复制其 A–E、Shell 或业务页面集合。

#### Scenario: 新增非工作台模板
- **WHEN** Authoring 创建营销页或内容站模板
- **THEN** 不得因缺少 workbench A–E 模式而失败
