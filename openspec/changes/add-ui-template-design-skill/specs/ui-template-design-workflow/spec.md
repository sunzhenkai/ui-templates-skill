## Purpose

定义独立 public skill `ui-template-design` 的行为契约：在消费项目建立并冻结可执行 Design System（Token → Primitive → Pattern → Page Type），使后续页面组装受约束，且不依赖 Author、Apply 或 published 模板即可完成。

## ADDED Requirements

### Requirement: 独立入口与独立完成
`ui-template-design` skill SHALL 在用户要求建立、抽取、统一或重构前端设计系统时启动。该 skill SHALL 可在未安装 `ui-template-author`、未安装 `ui-template-apply`、没有项目 `templates/`、没有 catalog 的环境中执行到完成态。缺少模板或另外两个 skill SHALL NOT 构成失败。完成态 SHALL 是消费项目中已冻结的设计系统本体加上可验证的 freeze 身份，SHALL NOT 要求全站业务页迁移，SHALL NOT 要求 Apply Phase 8/9。

#### Scenario: 空项目只装 Design
- **WHEN** 消费项目仅安装 `ui-template-design`，用户要求建立前端设计系统，且未提供模板
- **THEN** skill 进入 Design 工作流并可以声明完成；不得因缺少 Author、Apply、catalog 或 `templates/` 停止

#### Scenario: 做成模板的请求
- **WHEN** 用户要求从站点或仓库抽取并发布 schema v2 模板
- **THEN** skill 移交 `ui-template-author`，自身不 Index 模板

#### Scenario: 按模板实现业务页的请求
- **WHEN** 用户要求使用已有 published 模板实现产品页面
- **THEN** skill 告知由 `ui-template-apply` 处理；若未安装 Apply，则说明 freeze/设计系统完成后可再装 Apply，不得假装已实现业务页

#### Scenario: 未迁完全站不得假装失败
- **WHEN** Gallery 与 freeze 已通过，但多数业务页尚未迁移
- **THEN** skill 可以声明设计系统完成，并明确未迁页面不在本次完成范围内

### Requirement: 分层体制不得逆向发明
skill SHALL 按固定层次建立系统：Product/UX Model → Design Tokens → UI Primitives → Patterns → Page Types。后一层 SHALL NOT 重新决定前一层的精确值或结构。页面组装 SHALL 只选择已登记 Page Type 与 Pattern，SHALL NOT 为单个路由私造间距、颜色、页头或空状态。Pattern SHALL 是主交付层；仅有 Primitive 或仅安装第三方组件库源码 SHALL NOT 视为完成。

#### Scenario: 先写业务页再补 token
- **WHEN** Agent 在 Token Freeze 前向业务页写入未映射颜色或间距
- **THEN** 该阶段不得标完成，必须先 freeze token 并回写映射

#### Scenario: 停在组件库初始化
- **WHEN** 项目只添加了一套底层控件源码，没有 Pattern、Page Type 与可执行规则
- **THEN** skill 不得声明完成

#### Scenario: 页面私造页头
- **WHEN** 某业务页复制或重写已有 PageHeader 的布局与间距
- **THEN** 扫描或 review 判定失败，要求改用已登记 Pattern；特殊需求必须先升级 Pattern

### Requirement: Token 是精确值唯一载体
消费项目的语义 token SHALL 是颜色、间距、字体、半径、层级与运动精确值的唯一载体。组件、Pattern 与页面 SHALL NOT 使用未映射的调色板名、原始 hex 或任意 spacing。若本会话可解析 published 模板，skill SHALL 把模板 token 映射进项目 token 并记录偏离；不可解析时 SHALL 从项目上下文或现有代码词汇抽取，经用户确认后 freeze。项目 token SHALL NOT 被伪装成已发布 schema v2 模板。

#### Scenario: 出现 raw palette
- **WHEN** 本次写入的样式含 `text-gray-500`、`bg-red-500` 或未映射 hex
- **THEN** token/import 扫描失败，要求改为语义 token

#### Scenario: 无模板仍可 freeze
- **WHEN** 没有 published 模板，用户确认了一套项目级语义色与间距
- **THEN** skill 写入项目 token 并 freeze；不得创建 `templates/INDEX.md` 行

#### Scenario: 有模板则映射
- **WHEN** 本会话 resolve 到 published 模板
- **THEN** 项目 token 映射模板精确值与 rule ID；未解释偏离不得 freeze

### Requirement: Page Type 闭集与 Pattern 契约
skill SHALL 维护闭集页面类型（List、Detail、Master-Detail、Dashboard、Form、Settings、Wizard）。每个纳入范围的路由 SHALL 映射到恰好一个类型。增补类型 SHALL 先改 Constitution 并回归已登记页面。每个 Pattern SHALL 声明 slots、允许的 Primitive、禁止组合、数据状态、断点行为与运动引用。

#### Scenario: 路由归属歧义
- **WHEN** inventory 无法唯一判定某路由的 Page Type
- **THEN** 记为 unresolved 并等待用户收窄，不得静默挑选

#### Scenario: 为单页发明新类型
- **WHEN** Agent 为单个路由创建闭集之外的页面类型或 fork Pattern
- **THEN** skill 拒绝并将其标为必须先升级 Pattern 系统

### Requirement: 可执行约束优先于散文
skill SHALL 在消费项目写入 Agent 运行时会加载的规则块（独立 rules 文件或等价片段），把分层 import、禁止 raw token、禁止页面容器裸造写成硬约束，并配套至少一种机器检查（lint、类型或扫描）。仅有 `CONSTITUTION.md` 而检查全绿、规则被违反时，SHALL 视为本 skill 失败。

#### Scenario: 规则块未落地
- **WHEN** Constitution 已写但项目没有可加载的强制规则文件
- **THEN** 不得 freeze

#### Scenario: 跨层 import
- **WHEN** 业务页从 domain 层引入 Button 或用裸 `div` 冒充 Page/ListPage
- **THEN** 机器检查失败

### Requirement: Pattern 绑定数据状态
列入范围的列表/详情/主从 Pattern SHALL 在自身处理 idle、loading、success、empty、error，SHALL NOT 让业务页分叉四套布局。Gallery SHALL 为这些状态提供可运行橱窗。

#### Scenario: 只实现有数据的列表
- **WHEN** ListPage 在 success 时渲染，但缺少 empty 或 error
- **THEN** Pattern 契约与 Gallery 门禁失败

### Requirement: 运动白名单与断点预设
未登记的运动与 Pattern 外自定义断点 SHALL 被禁止。页面布局 SHALL 只使用已登记预设（例如单栏 Page、TwoColumn、MasterDetail 的宽/窄降级）。Master-Detail 在窄视口 SHALL 使用已登记 Drawer/Slide-over，SHALL NOT 在业务页重写宽度数字。

#### Scenario: 业务页自定义动画
- **WHEN** 业务页添加未登记 `transition-all` 或自定义 `@keyframes`
- **THEN** 扫描失败

#### Scenario: 单页改断点
- **WHEN** 某路由在 Pattern 外书写独立 `xl:gap-8` 布局
- **THEN** 判定违反断点预设，要求改用已登记布局 Pattern

### Requirement: greenfield 与 existing 两种模式
skill SHALL 按本次前端输出根判定 `greenfield` 或 `existing`。greenfield 未确认闭集技术层（language、UI framework、bundler、routing、styling、state、data、verification、package manager、repo shape）前 SHALL NOT 写应用源码或依赖清单。existing SHALL 只记录 observed stack，SHALL NOT 静默换栈，且默认冻结业务行为（不改 API、数据模型、权限、路由语义、业务状态）。existing SHALL 先 inventory，再写 legacy token mapping，再 freeze 新 token。

#### Scenario: 空输出根未确认栈
- **WHEN** 输出根为空且用户未确认各架构层
- **THEN** skill 停止选型并等待确认，不得创建依赖清单

#### Scenario: 重构改了 API
- **WHEN** existing 模式任务改动了数据模型或权限
- **THEN** skill 判定超出 UI 重构范围并停止，要求拆分任务

#### Scenario: existing 无 mapping 就手工改页
- **WHEN** 已定义新 token，但没有旧→新 mapping 就开始逐页改 class
- **THEN** 要求先完成 mapping（并尽量批量替换）再继续

### Requirement: 任务类分流
skill SHALL 用可观察信号判定任务类 `bootstrap | refactor | iterate`，SHALL NOT 凭用户口吻猜测。任务类与站点形态 `greenfield | existing` SHALL 分开记录。判定顺序 SHALL 为：用户确认推倒重来 → 可用 `frozen` freeze 且 digest 匹配则 `iterate` → digest 不匹配则停止 → 无 freeze 且输出根空则 `bootstrap` → 无 freeze 且输出根已有代码则 `refactor` → 范围未声明则停止询问。`iterate` SHALL NOT 重开完整阶段 0–9，SHALL NOT 加载完整 inventory，未声明路径 SHALL 保持原字节。三类任务都 SHALL 执行扫描与禁止 raw token；不得因任务类豁免这些不变量。

#### Scenario: 已 freeze 的局部补丁
- **WHEN** `freeze.yaml` 为 `frozen`、digest 与当前本体一致，且用户只要求补 List empty 态
- **THEN** 判定 `iterate`，只改被点名层并刷新 freeze digest；不得做全量 inventory 或从零选型

#### Scenario: freeze digest 过期
- **WHEN** freeze 状态为 `frozen` 但 digest 与当前本体不匹配，且用户未确认忽略或重建
- **THEN** skill 停止，不得静默混用过期 freeze 与现有代码

#### Scenario: 空输出根无 freeze
- **WHEN** 没有可用 freeze，且输出根为空
- **THEN** 判定 `bootstrap`，按 greenfield 确认闭集层；不得预加载 inventory 或 iterate 流程

#### Scenario: 已有代码无 freeze
- **WHEN** 没有可用 freeze，且输出根已有依赖清单或实质源码
- **THEN** 判定 `refactor`，先 inventory 再 mapping；不得按 greenfield 重新选型

#### Scenario: 口吻无范围
- **WHEN** 用户只说「优化一下 UI」且未声明路径或层
- **THEN** skill 停止询问，不得凭口吻猜测为 bootstrap、refactor 或 iterate

### Requirement: Gallery 与有限视觉回归
skill SHALL 提供可运行 Gallery（应用内设计系统路由或等价；Storybook 可选，不是完成条件）。Gallery SHALL 覆盖已声明 Primitive 状态与 Pattern 数据态。视觉验收 SHALL 使用真实浏览器截图并绑定 source/build/freeze 身份。截图失败后的自愈最多 3 轮，且补丁 SHALL 映射回 token 或 Pattern，SHALL NOT 在业务页写魔法数；3 轮仍失败 SHALL 停止并请求人类覆盖。无浏览器能力时 SHALL 停止并请求可运行方式。Golden Page 基线是可选增强，SHALL NOT 作为独立完成的必要条件。

#### Scenario: Gallery 缺状态
- **WHEN** Button 未展示 disabled/loading，或 ListPage 未展示 empty/error
- **THEN** Gallery 门禁失败

#### Scenario: 自愈超限
- **WHEN** 截图 diff 超过阈值且已连续修正 3 轮仍失败
- **THEN** skill 停止，不得放宽 baseline 或把失败标为通过

#### Scenario: 无浏览器
- **WHEN** 环境没有真实浏览器路径
- **THEN** 不得用静态 DOM 或假截图代替，必须请求可运行方式

### Requirement: Freeze 身份与生成物不是修复面
成功完成时 skill SHALL 写出 freeze 记录（含 schema、digest、mode、可选模板身份与 Gallery 身份）。token、Primitive 或 Pattern 变更 SHALL 使相关证据过期并从最早失效阶段重开。视觉或组合缺陷 SHALL 回写 token/Primitive/Pattern/本 skill 后重生，SHALL NOT 以单个业务页补丁作为修复面。Golden Page（若存在）SHALL 视为只读基线；Pattern 才是可变层。

#### Scenario: 改 token 后沿用旧截图
- **WHEN** token digest 已变但 verification 仍引用旧 build/freeze 身份
- **THEN** 旧证据无效，必须重跑 Gallery 回归

#### Scenario: 在业务页打补丁过线
- **WHEN** 为通过截图而在单个产品页写入未共享的 spacing
- **THEN** 判定失败，要求提升到 token 或 Pattern

### Requirement: Author/Apply 适配 fail-open
探测 published 模板或 Apply 安装状态 SHALL 失败开放：有则映射或提示移交，无则忽略。skill 运行时 SHALL NOT 硬依赖 Author runtime、catalog 路径或 Apply checkpoint。Design SHALL NOT 创建或修改生产 `templates/INDEX.md`。

#### Scenario: resolve 模板失败
- **WHEN** 无 catalog 且无项目模板
- **THEN** 工作流继续使用项目上下文，不把模板缺失写成 error

#### Scenario: 用户要把视觉语言做成模板
- **WHEN** freeze 完成后用户要求发布为可复用模板
- **THEN** 移交 Authoring；若未安装 Author，说明需另装，且本 skill 不写 INDEX
