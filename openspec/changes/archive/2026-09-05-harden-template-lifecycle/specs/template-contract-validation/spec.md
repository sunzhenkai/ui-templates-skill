## Purpose

为所有 UI 模板提供版本化、可迁移且 fail-closed 的机器契约与验证行为，确保 Authoring、Apply、索引和发布只接受可解析、可追踪、跨文件一致并实际完成对比度检查的模板。

## ADDED Requirements

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
