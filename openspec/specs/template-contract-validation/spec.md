## Purpose

为所有 UI 模板提供版本化、可迁移且 fail-closed 的机器契约与验证行为，覆盖 schema v2 core 文件以及可选 `fidelity.yaml` structural profile。

## Requirements

### Requirement: 版本化模板 schema
每个模板 SHALL 声明受支持的 schema version 和 template version。schema v2 SHALL 定义 `spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml`、optional `apply/` 及拆分设计文档的结构、闭集枚举和引用关系；未知 version SHALL 被明确拒绝。

#### Scenario: 读取 schema v2 模板
- **WHEN** 模板声明 schema v2 且所有必需文件与字段存在
- **THEN** validator 按 v2 契约验证，消费者可读取明确的版本和兼容信息

#### Scenario: 缺少或未知 schema version
- **WHEN** 模板未声明 schema version 或声明消费者不支持的 version
- **THEN** validator 和消费者均 fail closed，并报告支持范围与迁移入口

#### Scenario: schema 与 prose 冲突
- **WHEN** 机器 schema 和权威格式文档对同一字段给出不同约束
- **THEN** repository validation 失败并要求统一两者，不允许任选其一发布

### Requirement: 统一 token leaf 与 origin
schema v2 中每个可消费 token leaf SHALL 是包含非空 `value` 和 `origin` 的记录；有量纲的数值 SHALL 声明单位。`origin` SHALL 仅允许 `source | computed | estimated | default`，复合值、列表和映射 SHALL 作为记录的 `value`，不得以裸 leaf 绕过校验。

#### Scenario: 合法 token leaf
- **WHEN** token 包含合法 value、适用单位和四种 origin 之一
- **THEN** schema 验证通过并保留原始值类型

#### Scenario: 裸值或未知 origin
- **WHEN** token 以裸 scalar/list/map 表示可消费值，或使用 `observed` 等未知 origin
- **THEN** schema 验证失败并返回完整 token path

#### Scenario: 有量纲数值缺少单位
- **WHEN** 字号、长度、圆角或其他有量纲数值没有 schema 定义的 unit
- **THEN** 验证失败；unitless、颜色或枚举值按 schema 明确豁免

### Requirement: Coverage 与置信度契约
`meta.yaml` SHALL 以闭集状态表达平台、视口、主题、page modes、组件和 states 的 `observed`、`defaulted` 与 `unsupported` coverage，并 SHALL 支持来源列表和分维度置信度。相同项不得同时出现在多个 coverage 状态。

#### Scenario: 完整 coverage
- **WHEN** 模板声明多个平台和 A–E 页面模式
- **THEN** 每个平台、模式、组件和状态都有且只有一个 coverage 状态，Apply 可据此生成 decision 表

#### Scenario: coverage 重叠或缺失
- **WHEN** 同一项同时标记 observed/defaulted，或声明平台没有对应 coverage
- **THEN** validator 失败并报告重叠或缺失项

#### Scenario: 多来源置信度
- **WHEN** 布局来自文档而视觉值来自默认补全
- **THEN** meta 分别记录 layout 与 visual confidence，overall 不高于最弱必需维度

### Requirement: Token 与资产证据
每个 `source`、`computed` 或 `estimated` token SHALL 在 `evidence.yaml` 中有唯一 active 证据；每个 `default` token SHALL 有 basis 或 decision ID。归档资产 SHALL 记录来源、许可/再分发决定和隐私处理。`superseded` 记录的 `supersedes` SHALL 向前指向取代它的唯一 active evidence，目标 SHALL 具有相同 kind/path，且不得悬空、自引用或成环。

#### Scenario: 来源 token 可追踪
- **WHEN** token origin 为 source
- **THEN** evidence 记录 token path、source ref/revision、locator、captured_at、confidence 和 active status

#### Scenario: computed 或 estimated token 可追踪
- **WHEN** token 来自 computed style 或图片反推
- **THEN** evidence 记录方法、定位或 artifact，并能区分 computed 与 estimated

#### Scenario: 默认值有依据
- **WHEN** token origin 为 default
- **THEN** evidence 记录默认 basis 或稳定 decision ID，不要求伪造外部来源

#### Scenario: 资产不可分发或含敏感信息
- **WHEN** 来源资产许可不允许再分发或包含账号、内部数据等敏感内容
- **THEN** Authoring 不将原资产放入可分发模板，或先完成记录在案的脱敏处理

### Requirement: Fail-closed 颜色与对比度验证
validator SHALL 解析契约支持的 HEX、opaque OKLCH 和带 alpha 的颜色，并 SHALL 在实际声明背景上合成后检查适用 required pairs。每个主题 SHALL 报告 `checked`、`failed`、`skipped`、`waived`；required pair 无法解析、缺少背景或被静默跳过 SHALL 导致失败。

#### Scenario: OKLCH 文本 pair 通过
- **WHEN** foreground/background 使用合法 OKLCH 且对比度达到 required threshold
- **THEN** pair 计入 checked 并通过，而不是因非 HEX 被忽略

#### Scenario: alpha 颜色合成后失败
- **WHEN** 带 alpha 的文本或状态色与实际背景合成后低于 threshold
- **THEN** validator 报告合成后的 ratio、pair、主题与 token path 并失败

#### Scenario: required pair 无法检查
- **WHEN** required role 缺少值、颜色无法解析或背景关系不明确
- **THEN** validator 失败；仅有明确规则 ID、理由和期限的 waiver 可进入 waived

#### Scenario: 非文本焦点指示
- **WHEN** 模板声明 focus ring
- **THEN** validator 或证据 gate 按其实际相邻/合成颜色检查非文本 3:1，不虚构不存在的 foreground token

### Requirement: 跨文件语义与引用验证
validator SHALL 验证 required files、规则 ID、token/evidence path、coverage、主题角色一致性、optional `apply/` 边界、相对链接、INDEX/meta 一致性和禁入工程内容。一次运行 SHALL 汇总所有 findings。

#### Scenario: 悬空规则或 evidence 引用
- **WHEN** `apply/` 引用不存在的规则 ID，或 evidence 指向不存在的 token path
- **THEN** validator 返回所有悬空引用并失败

#### Scenario: INDEX 与 meta 漂移
- **WHEN** INDEX 的名称、描述、来源类型或日期与 meta 不一致
- **THEN** validator 报告字段级差异并失败

#### Scenario: 禁入工程内容
- **WHEN** 模板包含 `implementation/`、stack adapter、代码目录、API/mock 分层或消费项目业务域
- **THEN** validator 报告位置并失败，不只检查根目录固定文件名

#### Scenario: 合法 apply 指南
- **WHEN** `apply/` 只引用规则 ID、阶段和取证方式且不复制精确值
- **THEN** validator 接受该目录并验证必需 playbook 存在

### Requirement: 迁移与兼容失败语义
系统 SHALL 提供显式、可重复执行的 v1→v2 迁移入口。迁移 SHALL 保留可消费值和来源语义，生成需要人工补充的 evidence/coverage 清单，并 SHALL 不覆盖未确认的用户决定。常规 v2 validation SHALL 不静默兼容 v1。

#### Scenario: 迁移合法 v1 模板
- **WHEN** 用户对 v1 模板运行迁移
- **THEN** 产出 v2 候选、迁移报告和待确认项，原 v1 文件可恢复且未被无提示破坏

#### Scenario: 重复执行迁移
- **WHEN** 对同一输入和决定重复运行迁移
- **THEN** 产出语义等价且无重复 evidence 或 rule ID

#### Scenario: 直接消费 v1
- **WHEN** v2-only 消费者直接读取 v1 模板
- **THEN** 明确拒绝并指向迁移入口，不把裸 leaf 或旧 origin 猜成 v2

### Requirement: 机器可读结果与回归 fixtures
validator SHALL 同时提供人类可读摘要和稳定的 JSON 结果，包含 schema version、模板 identity、finding code/path/severity、检查计数与退出状态。仓库 SHALL 维护 good、bad 和 mutation fixtures，证明每类关键错误会导致非零退出。

#### Scenario: CI 消费 JSON
- **WHEN** CI 以 JSON mode 运行 validator
- **THEN** 输出可解析且 finding 顺序稳定，退出码与 failed findings 一致

#### Scenario: 负向 fixture
- **WHEN** fixture 包含低对比 OKLCH、裸 leaf、未知 origin、coverage 重叠、悬空引用或禁入内容
- **THEN** 对应稳定 finding code 出现且命令非零退出

#### Scenario: 当前模板正向验证
- **WHEN** 已迁移模板满足全部 v2 契约
- **THEN** good fixture 和真实模板均通过，并对每个主题报告非零适用 contrast checks

### Requirement: Structural profile schema 与跨文件语义验证
Validator SHALL 验证 `fidelity.yaml` 的独立 schema/profile version、conformance、稳定 IDs、rule/token/source refs、layout regions/scroll domains/overlay refs、component slots/geometry refs、context/state 闭集、negative facts、provenance 和 unresolved 互斥状态。一次运行 SHALL 聚合全部 findings，并输出稳定 code/path/details。

#### Scenario: Profile 正向实例
- **WHEN** profile 的 layout、geometry、state records 均完整且所有 refs 可解析
- **THEN** portable validation 通过并输出按 facet/record/status 的非零计数

#### Scenario: Dialog padding token ref 悬空
- **WHEN** component geometry 引用不存在的 spacing token path
- **THEN** validator 报告稳定悬空引用 finding，并使候选失败

#### Scenario: Scroll domain owner 不唯一
- **WHEN** 一个声明的 scroll domain 没有 owner 或有多个 owner
- **THEN** validator 报告 domain 与冲突 region IDs；其他独立 domain 不受影响

#### Scenario: Contextual state 冲突
- **WHEN**相同 subject/context/state/surface 同时声明 `text_decoration: none` 与 `underline`
- **THEN** validator 报告冲突记录并失败，不按文件顺序任选其一

### Requirement: Profile 工程边界验证
Structural profile normative data SHALL 只包含技术栈无关设计语义。Validator SHALL 拒绝依赖、框架 primitive、package/import、CSS class、hook、项目源码目录、API/mock/data/state 选型和 runnable command；provenance locator MAY 包含安全相对 source path、symbol、selector 或 pointer。

#### Scenario: Normative 字段包含 Tailwind class
- **WHEN** layout、geometry 或 state expected 中写入 source class string
- **THEN** validator 报告禁入工程内容并要求改为结构语义、闭集值或 token ref

#### Scenario: Locator 包含安全 source path
- **WHEN** provenance locator 使用固定 revision 下的安全相对路径与 symbol
- **THEN** portable validator 接受其形状，source replay 再验证目标与摘要

### Requirement: Authoring source replay 模式
Validator/runtime SHALL 提供显式 source replay 模式，将 profile source IDs 绑定到**本会话**用户提供的固定 checkout，并验证 revision、locator、source-span digest、usage closure receipt 和 published record。未提供 session source 的 portable 模式 SHALL 明确报告 replay not-run，且对已发布模板这是合法成功结果，SHALL NOT 据此向用户索要 `meta.sources[]` 对应的本地路径。仅当本会话正在 structural Generate-from-source 时，completion SHALL 要求对该 session source 的 required replay 全部 executed/passed。

#### Scenario: 固定 checkout 匹配
- **WHEN** caller 为本会话 required repo source 提供 revision 一致的 session source root
- **THEN** replay 报告 `declared = resolved = executed`，每条 observed record 有匹配 locator/span digest

#### Scenario: Evidence laundering
- **WHEN** 本会话 Generate 写入的 record 的 source revision 字段声称上游 repo，但 locator 实际指向候选模板或无关 checkout
- **THEN** replay 返回 source-boundary finding 并失败

#### Scenario: Portable validation 无来源
- **WHEN** Apply、发布检查或对已发布模板的校验只拥有模板目录
- **THEN** validator 仍执行全部内部 profile checks，并将 replay 标为 not-run 而非伪造 passed，也不得把 not-run 升级为「请提供本地绝对路径」

#### Scenario: Provenance 不是 checkout
- **WHEN** 已发布模板声明了 repo/doc source IDs 但调用方未传 `--source-root`
- **THEN** portable 模式完成内部检查；SHALL NOT 失败于缺失历史 source root

### Requirement: Chrome composition 机器校验
Validator 与 capture runtime SHALL 校验 included shell scene 的 `shell_variant` 闭集、slots 稳定 ID/role/region、同级顺序，以及**已声明**锚点的 role/region。`header-trigger` 与 `chat-fab` 仅当 slot 或 graph 声明了该 role 才必填。缺字段、未知 role、顺序冲突、已出现锚点的 region 不存在或 variant 非 `inset|flush` SHALL 产出稳定 issue code 并使候选失败。literal graph 缺失、非 `repo-literal-graph-v1`、或 shell usage 无 chrome facts 时，structural capture SHALL `unsupported` 或 `incomplete`，不得生成部分 observed shell record。

#### Scenario: 正向 inset 槽位图
- **WHEN** fixture graph 为 shell 声明 inset 与有序 slots，可选锚点若出现则 region 存在
- **THEN** portable validation 通过，并输出 chrome/slot/variant 的非零计数

#### Scenario: 已声明锚点 region 不存在
- **WHEN** profile 写出某个锚点但其 region 不在该 scene 的 regions 中
- **THEN** validator 报告锚点 finding 并失败

#### Scenario: 空 chrome_anchors 仍完整
- **WHEN** included shell 有 variant 与有序 slots，且 slots 未声明锚点 role，`chrome_anchors` 为空
- **THEN** chrome composition 通过，不得报 `CHROME_COMPOSITION_INCOMPLETE`

#### Scenario: 无 graph 文件
- **WHEN** structural capture request 指向不存在或非 closed YAML/JSON 的 graph_path
- **THEN** runtime 以稳定 code 失败，不解析 TSX，不抽样源码

### Requirement: layout 置信度与 sidecar 一致性校验
Portable validator SHALL 检查 `meta.confidence.layout` 与 chrome-complete sidecar 的关系：`high` 要求存在通过校验的 structural `fidelity.yaml` 且每个 included shell scene 具有完整 chrome composition。无 sidecar 的合法 v2 模板在 `layout` 为 medium/low 时 SHALL 通过；为 high 时 SHALL 失败。本检查不得请求 `meta.sources[]` 的本地路径，也不得把 replay `not-run` 当作本 finding 的理由。

#### Scenario: workbench 诚实 baseline
- **WHEN** 无 sidecar 模板将 `confidence.layout` 设为 medium
- **THEN** 该项检查通过

#### Scenario: high 但无 chrome sidecar
- **WHEN** 模板 `confidence.layout` 为 high 且缺少 chrome-complete `fidelity.yaml`
- **THEN** validator 非零退出并报告稳定 code

### Requirement: Structural fixtures 与机器回归
仓库 SHALL 提供不依赖 `example/**` 的正向、负向、mutation 和固定 repo fixtures，覆盖非换行横向 Board、嵌套 scroll domains、navigation/entity-row/button-link context、Dialog 逻辑方向 padding、overlay scope、shell chrome composition（inset vs flush、有序槽位、已声明则闭合的锚点）、source replay、unknown profile 和 semantic reproducibility。机器结果 SHALL 稳定排序且失败退出码与 findings 一致。

#### Scenario: Negative facts mutation
- **WHEN** fixture 将 navigation link 的 `text_decoration: none` 改为 underline 或删除 Dialog `padding_block_start`
- **THEN** 对应 context/geometry finding 稳定出现且命令非零退出

#### Scenario: Repo fixture 重复运行
- **WHEN** 相同 fixture revision、scope 和 decisions 被重复 capture/normalize
- **THEN** canonical structural digest 一致，任何 record identity/status/unresolved 漂移阻断 eval

#### Scenario: 测试发现 example 路径
- **WHEN** profile validator/eval 的发现域包含 `example/`
- **THEN** governance scope 检查失败，且该路径不得作为 source fixture 或通过证据

#### Scenario: Chrome composition mutation
- **WHEN** fixture 将 `shell_variant` 从 inset 改为 flush，或交换 workspace-switcher 与 compose 的顺序，或把 header-trigger 改锚到 page-canvas
- **THEN** 对应 chrome finding 稳定出现且命令非零退出

### Requirement: INDEX 生命周期状态
validator SHALL 解析 `templates/INDEX.md` 的名称、风格描述、来源类型、采集日期与状态。状态 SHALL 仅为 `published` 或 `retired`。前四列 SHALL 与对应 `meta.yaml` 一致。INDEX 中的每一行 SHALL 有同名模板目录；每个被校验的模板目录 SHALL 有 INDEX 行。

#### Scenario: published 行列齐全
- **WHEN** INDEX 行为五列且状态 published，目录与 meta 一致
- **THEN** 索引校验通过

#### Scenario: 非法状态
- **WHEN** INDEX 状态不是 published 或 retired，或缺少状态列
- **THEN** validator 以稳定 issue code 失败

#### Scenario: 孤儿 published 行
- **WHEN** INDEX 列出 published 模板但目录不存在
- **THEN** validator 报告 orphan 并失败

### Requirement: catalog 与生产库同一 published 集合
仓库根生产 `templates/` 是官方模板真相源。`ui-template-author` 内 catalog SHALL 是该 published 集合的可校验副本：同一名称、同一 INDEX 前四列与状态、同一必备文件集合，内容摘要一致。validator 或治理检查 SHALL 在发布前同时校验生产库与 catalog；任一 drift、缺文件、INDEX 不一致或 catalog 含非生产 published 名称 SHALL 失败。播种到项目库后的 INDEX/目录仍适用现有 INDEX 生命周期与 core 校验。

#### Scenario: catalog 与生产库一致
- **WHEN** 对仓库根 `templates/` 与 Author catalog 运行校验
- **THEN** published 名称集合相同，每项必备文件 digest 一致，INDEX 行一致

#### Scenario: catalog 落后于生产库
- **WHEN** 生产库更新了 `workbench-shell` 或 INDEX，catalog 未同步
- **THEN** 治理/校验以稳定 issue code 失败，不得发布

#### Scenario: catalog 多出非生产模板
- **WHEN** catalog INDEX 含生产库没有的 published 名称
- **THEN** 校验失败

#### Scenario: 播种后的项目库可独立校验
- **WHEN** 空项目从 catalog 播种 `workbench-shell` 后运行 portable validator
- **THEN** 项目 `templates/` 通过现有 INDEX 与 core 校验
