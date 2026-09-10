## Purpose

定义 Apply 消费 Active Design System 实施前端页面、维护 checkpoint、条件加载 vendor 规则和分流反馈的可观察契约。

## Requirements

### Requirement: Active truth gate
Apply bootstrap 和 increment SHALL 消费 digest 一致的 `design-system/v1` Active Instance；缺失、未知 schema、capability 不足或 digest 失配 SHALL 停止，不得用兄弟应用、历史生成物或业务代码反推设计系统。

#### Scenario: increment 缺少 active truth
- **WHEN** increment 会话未找到有效 Active Instance
- **THEN** Apply 停止并要求先建立或恢复 Active Instance

#### Scenario: contract changed during session
- **WHEN** contract、binding 或 projection digest 与 checkpoint 不一致
- **THEN** Apply 停止，不选择性继续旧决策

### Requirement: Explicit apply mode
Apply SHALL 显式声明 `bootstrap | increment`。bootstrap SHALL 在写业务源码前建立有效 Active Instance；increment SHALL 声明 change set 并按 Impact-based Resume 重开受影响 phase。

#### Scenario: greenfield bootstrap
- **WHEN** 输出根为空且用户请求初始化
- **THEN** Apply 先通过 published package 或已有 Active Instance 建立实施依据，再写业务源码

#### Scenario: scoped increment
- **WHEN** 只变更 token 与一个 pattern
- **THEN** Apply 只重开受影响 phases，未声明路径保持原字节

### Requirement: Bootstrap adopt-only
无 Active Instance 时，Apply bootstrap MAY 从 `published` Template Package 显式领养；SHALL 只复制 portable core、生成 binding 和用户确认的选型，不得修改 core 语义或 stable IDs。

#### Scenario: 从 package 建立
- **WHEN** 用户确认 published package 与闭集技术栈
- **THEN** Apply 建立含 source package identity 的 Active Instance 和 binding，再进入实施

#### Scenario: 需要修改 package
- **WHEN** bootstrap 发现 package core 缺口
- **THEN** Apply 只创建 proposed feedback，不直接补写 core

### Requirement: Checkpoint and impact-based resume
Checkpoint SHALL 记录 mode、change set、contract/binding/projection digests、使用到的 stable IDs、output root、build identity、browser evidence 和 phase artifacts。恢复 SHALL 按依赖面重开最早失效 phase；全部 digest 失配或关键身份变化 SHALL 停止。

#### Scenario: token-only change
- **WHEN** core token 或 projection 变化
- **THEN** Apply 重开 token/projection 相关联的实现与浏览器验证，不强制全量 inventory

#### Scenario: build identity changed
- **WHEN** output root、stack 或 build identity 变化
- **THEN** Apply 至少从 structure/stack 相关 phase 重开并重建证据

### Requirement: Conditional vendor loading
Vendor Reference SHALL 只按 Active Instance binding 和任务触发器加载；`frontend-design` SHALL 在视觉方向任务必读，shadcn 和 Tailwind references SHALL 仅在对应 component system/style engine/token projection 场景加载。未声明栈 SHALL 不预加载 vendor。

#### Scenario: shadcn project
- **WHEN** binding 声明 component system 为 shadcn
- **THEN** Apply 加载 shadcn vendor 与必要的 frontend-design 规则

#### Scenario: unrelated stack
- **WHEN** binding 不使用 Tailwind 或 shadcn
- **THEN** Apply 不加载相关 vendor，也不注入其默认偏好

### Requirement: Current-build verification
Phase 8 SHALL 使用当前 output root 与 build identity 的真实浏览器证据验证 style consistency、information semantics、placement、states 和 responsive behavior；静态检查或旧证据 SHALL 不能替代。

#### Scenario: 页面通过
- **WHEN** included 页面和状态在当前构建中验证通过
- **THEN** checkpoint 登录证据文件、build identity 和复验的 stable IDs

#### Scenario: 浏览器不可用
- **WHEN** 真实浏览器不可用
- **THEN** Apply 停止，不得宣称完成

### Requirement: Feedback ownership
Apply SHALL 将缺口分类为 `package | binding | apply-skill`；package 与 core 缺口 SHALL 生成 proposed feedback 并移交 Author，binding 缺口 SHALL 在显式 change set 内修复项目绑定，workflow 缺陷 SHALL 回写 Apply skill。任何缺口 SHALL 不得通过直接改生成物掩盖。

#### Scenario: missing primitive
- **WHEN** 页面需要 package 未声明的 primitive
- **THEN** Apply 写入 package feedback，引用 stable IDs 与 evidence，不私造 reusable primitive

#### Scenario: wrong projection target
- **WHEN** 主题值只与项目文件路径或框架版本绑定错误
- **THEN** Apply 在用户确认的 binding change set 内修复，并更新 projection digest

#### Scenario: workflow gate missing
- **WHEN** 缺陷来自 Apply 检查规则本身
- **THEN** 反馈归类为 apply-skill，生成物缺陷回到 skill/契约修复后重生

### Requirement: Session closure
Apply SHALL 只在全部 included scope 完成、P0/P1 清零、浏览器证据有效、feedback inbox 无未处理 proposed 时输出 session closed；否则 SHALL 列出未完成项与原因。

#### Scenario: 可安全清理
- **WHEN** Phase 9 通过且没有 proposed feedback
- **THEN** Apply 报告会话可关闭，删除 `.ui-template-apply/` 不影响已生成页面

#### Scenario: P1 remains
- **WHEN** 存在未解决 P1 或证据过期
- **THEN** Apply 不得输出 session closed

### Requirement: Apply Active Instance checker 发现协议
Apply 用于核对 Active Instance 的 discovery wrapper SHALL 与 Design/Author 使用同一共享实现与自调用护栏。`UI_DESIGN_SYSTEM_VALIDATOR` SHALL 只接受共享实现；指向任一 discovery wrapper SHALL 以 `VALIDATOR_SELF_INVOCATION` fail closed。安装态 Apply SHALL 不要求仓库根 `scripts/` 即可完成 digest 一致的 Active Instance 校验。

#### Scenario: 安装态 Apply 校验 Active Instance
- **WHEN** 消费项目已成对安装 Author/Apply，存在 digest 一致的 Active Instance，无本仓库 checkout
- **THEN** Apply checker 对 Active Instance 执行 `validate --kind active` 并返回统一结果，作为 bootstrap/increment 的 Active truth gate

#### Scenario: Apply 环境变量指向 wrapper
- **WHEN** `UI_DESIGN_SYSTEM_VALIDATOR` 指向 Apply 或 Author 的 discovery wrapper
- **THEN** checker 以 `VALIDATOR_SELF_INVOCATION` 失败并停止实施，不创建递归进程

### Requirement: Single source-blind implementation contract
Apply 的公开实现契约 SHALL 只有 `bootstrap | increment` 两种 Apply Mode；Apply SHALL 不定义或执行 source oracle 对照模式，SHALL 不读取原版 checkout、`meta.sources[]` 实现路径或历史生成物。原版对照结果只能作为模板治理链路的输入，不能改变 Apply 的实现依据。

#### Scenario: user asks for original alignment
- **WHEN** 用户要求对齐原版视觉
- **THEN** Apply 仍只消费 digest 一致 Active Instance，并将原版对照需求移交给模板认证或反馈链路

#### Scenario: source compare artifact appears in apply session
- **WHEN** Apply checkpoint 将 source oracle 或 source-compare 记录为实现依据
- **THEN** runtime 或 validator fail closed 并报告 source-blind violation

### Requirement: Pattern-bound business composition
Included route SHALL 映射到已声明 Page Type，并只组合该 Active Instance 中可解析的 Pattern 与 Primitive。业务页可以引入业务数据和局部展示结构，但可复用交互件、组合布局和页面骨架缺失时 SHALL 生成 package feedback，不得私造新的 reusable semantic 层。

#### Scenario: route uses declared pattern
- **WHEN** 实现一个 collection 页
- **THEN** Phase 证据记录其 page type、pattern 与 primitive 引用，并验证引用目标存在

#### Scenario: reusable control is absent
- **WHEN** 页面需要 package 未声明的可复用交互控件
- **THEN** Apply 停止该复用层实现并生成引用 stable ID 语义的 package feedback

### Requirement: Route placement artifact closure
Apply Phase 2 SHALL record the layout scene, Page Type, applicable Pattern closure, placement plan, scroll owner, and structural verification availability for each included route. Phase 4 SHALL bind each placement-sensitive component use to the route closure and its applicable semantic role. A route SHALL NOT enter implementation with a missing or unresolved binding.

#### Scenario: Route plan validation
- **WHEN** Phase 2 declares a complete route placement closure
- **THEN** all layout, Page Type, Pattern, and Primitive references resolve in the Active Instance

#### Scenario: Placement-sensitive component
- **WHEN** Phase 4 places a component into a navigation, chrome, inset, overlay, section, or other placement-sensitive role
- **THEN** the record cites the authorized route closure and stable placement role, not merely global component existence

#### Scenario: Invalid route recovery
- **WHEN** a route binding is missing or references an ID outside its Page Type closure
- **THEN** checkpoint recovery reopens the affected route phase and marks downstream evidence stale

### Requirement: Degraded structural placement honesty
When structural fidelity is unavailable, Apply SHALL preserve style and component capability from the Active Instance but SHALL label placement verification unavailable and SHALL NOT create machine chrome topology, shell variant, slot order, or profile-verified claims from supplementary prose.

#### Scenario: Legacy package adoption
- **WHEN** Apply adopts a package whose structural fidelity is unavailable
- **THEN** Phase 2 records structural placement gates as unavailable and Phase 8 does not report profile verification

#### Scenario: Prose upgraded to constraint
- **WHEN** an Apply artifact converts an unstructured layout note into an ordered chrome or topology assertion
- **THEN** Apply state validation fails and requires either removal of the assertion or a template upgrade through Authoring
