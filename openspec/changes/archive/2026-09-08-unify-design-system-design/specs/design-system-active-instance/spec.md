## Purpose

定义消费项目内 Active Design System 的创建、领养、绑定、投影、验证和冻结行为，使 Apply 只消费唯一可实施真相。

## ADDED Requirements

### Requirement: Active Instance ownership
`.ui-template-design/` SHALL 保存含 binding 的 `design-system/v1` Active Instance；Design SHALL 拥有 core 与 binding 的完整编辑权，业务页面实现 SHALL 不属于 Design。

#### Scenario: 创建 active instance
- **WHEN** Design 完成选型、core 与 binding
- **THEN** 消费项目存在可校验的 contract、binding 和 projection，且不包含业务页面实现结果作为契约依据

#### Scenario: 请求业务页实现
- **WHEN** 用户要求实现完整业务页
- **THEN** Design 冻结 Active Instance 后移交 Apply

### Requirement: Task class 与 source origin 正交
Design SHALL 独立记录 `bootstrap | refactor | iterate` 与 `blank | template-package | legacy-freeze-migration`；task class 决定项目状态流程，source origin 决定产物来源与迁移要求。

#### Scenario: 从 package bootstrap
- **WHEN** task class 为 bootstrap 且 source origin 为 template-package
- **THEN** Design 复制 published portable core，生成 binding，并把裁剪/映射记录为项目层差异

#### Scenario: iterate 禁止全量重扫
- **WHEN** digest 一致的 frozen Active Instance 存在且用户只点名 token 与 pattern
- **THEN** Design 只处理声明层，不执行完整 inventory

### Requirement: Confirmed stack binding
greenfield Design SHALL 在写入应用源码或依赖清单前通过 decision gate 确认闭集技术栈；binding SHALL 记录 output root、stack、component system、Primitive implementation paths、Token Projection targets 和 build identity。existing 项目 SHALL 不静默换栈。

#### Scenario: 未确认栈
- **WHEN** greenfield 项目尚未确认闭集层
- **THEN** Design 不得写应用源码或依赖清单

#### Scenario: 更新 binding
- **WHEN** 用户确认变更 output root、component system 或 projection target
- **THEN** Design 写入新 binding digest，并使受影响 projection 与验证失效

### Requirement: Package adoption is copy-bound
从 published Template Package 领养时，Design SHALL 校验 INDEX/catalog identity 与 digest，复制 portable core，并且不得重写 package semantic identity、stable IDs 或 core values；项目定制 SHALL 记录为 active-instance 层差异或触发显式 fork/Author 更新。

#### Scenario: 合法领养
- **WHEN** package 为 published 且 identity/digest 匹配
- **THEN** Active Instance 保留 source package identity，并生成新的 binding digest

#### Scenario: retired 或 digest 不匹配
- **WHEN** package retired 或文件 digest 不匹配
- **THEN** Design 拒绝领养并提示使用显式迁移或有效 candidate

### Requirement: Token projection validation
Design SHALL 从 `core/tokens.yaml` 生成或核对原生主题 projection；binding SHALL 记录 semantic token path 到 native theme key 的映射和 projection digest，不一致时 SHALL fail closed。

#### Scenario: 生成 Tailwind 或 shadcn theme
- **WHEN** 用户确认 Tailwind/shadcn 栈
- **THEN** Design 按 binding 映射生成目标主题文件，并校验每个值可追溯到 core token

#### Scenario: 手工旁路
- **WHEN** 原生主题值被直接修改而 core token 未更新
- **THEN** freeze/gate 失败并指出漂移的 projection target

### Requirement: Freeze requires executable evidence
Active Instance freeze SHALL 校验 contract digest、binding digest、projection digests、可加载规则、capability 必填层和真实浏览器 Gallery/visual evidence；任何缺失、过期或伪造证据 SHALL 阻止 freeze。

#### Scenario: 成功 freeze
- **WHEN** 全部 digest、规则、Gallery coverage 和浏览器证据有效
- **THEN** Active Instance 进入 frozen 状态，可交给 Apply

#### Scenario: 浏览器不可用
- **WHEN** 需要视觉验证但真实浏览器不可用
- **THEN** Design 停止，不得用静态检查替代 freeze 证据

### Requirement: Legacy freeze explicit migration
旧 `design-freeze/v1` SHALL 只能作为 `legacy-freeze-migration` source origin；迁移 SHALL 生成 receipt 并校验 unresolved/errors。旧 freeze SHALL 不被新 runtime 直接消费或静默投影。

#### Scenario: 迁移旧 freeze
- **WHEN** 用户选择迁移 design-freeze v1
- **THEN** Design 生成 migration receipt，只有无 unresolved/errors 的结果可继续 freeze

#### Scenario: 遇到旧 freeze
- **WHEN** runtime 发现不受支持或 digest 不匹配的旧 freeze
- **THEN** 停止并提供迁移、重建或显式忽略的确认入口，不静默混用
