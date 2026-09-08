# Context

本仓库发布 `ui-template-author` / `ui-template-apply` / `ui-template-design` 三个 public skill。本 glossary 只沉淀本会话 crystallize 的 ui-template-design 领域术语。

## Language

### 统一契约

**Design System Contract**:
Author、Design 与 Apply 共同识别的统一语义契约，承载 token、Primitive、Pattern、Page Type、规则与证据。schema v2 template 与 design freeze 不再是并列语义真相，而分别承担发布层与项目绑定层职责。
_Avoid_: 统一模板、双真相同步

**portable core**:
Design System Contract 中技术栈无关的语义层；只表达可复用设计语义和证据，不包含工程依赖、stack adapter 或项目输出路径。
_Avoid_: 通用模板、抽象设计

**project binding**:
Design System Contract 中项目落地层；记录 output root、已确认技术栈、组件体系、Primitive 实现路径、构建身份与模板 pin。
_Avoid_: 实现规范、stack adapter

**active Design System**:
消费项目 `.ui-template-design/` 中当前可实施、digest 一致的统一契约实例。Apply 实施时优先消费它；模板库是显式领养来源，不是静默覆盖来源。
_Avoid_: design freeze 投影、模板缓存

**Vendor Reference**:
固定 revision、带 license 与来源说明、随 Apply 分发的第三方规则快照。Vendor Reference 只能按 project binding 声明的组件体系或样式方案条件加载。
_Avoid_: runtime dependency、可选外部 skill

**Template Package**:
库宿主 `templates/<name>` 中可发布、可退役、不含 project binding 的 portable-core 分发单元。
_Avoid_: runnable starter、工程模板

**Active Instance**:
消费项目 `.ui-template-design/` 中含 `binding.yaml`、checkpoint 与证据的可实施 Design System Contract 副本。
_Avoid_: freeze 目录、阶段产物本体

**Apply Mode**:
Apply 会话的显式场景标签：`bootstrap` 表示建立并实施，`increment` 表示在既有 Active Instance 上更新。
_Avoid_: greenfield 判断（那是站点形态，不是 Apply 流程模式）

**Token Projection**:
由 `core/tokens.yaml` 派生到原生主题机制的落地文件；project binding 记录目标路径、映射关系和 digest。
_Avoid_: token 唯一载体、双向同步、手工旁路

**Migration Receipt**:
随候选产物生成的独立迁移审计记录，记录 source/target digest、映射、defaulted/dropped、unresolved 与 errors。它不属于 contract runtime 本体。
_Avoid_: 迁移日志、生成物注释

**Stable Entity ID**:
跨文件引用 Primitive、Pattern、Page Type、Token 或 Rule 的稳定身份；human-readable 展示名不是身份。
_Avoid_: 组件名、YAML key、页面标题

**Package Capability**:
Template Package 的显式能力等级：`tokens-only`、`ui-kit` 或 `page-system`，决定消费时哪些 core 层必填。
_Avoid_: 通用模板、完整度百分比

**Feedback Ownership**:
Apply 缺口的闭集归属：`package` 交给 Author，`binding` 属于项目 active instance，`apply-skill` 属于 Apply workflow 本身。
_Avoid_: 一般问题、小修

**Impact-based Resume**:
按契约、binding、projection、stable ID、output root、build identity 与证据的依赖面重开 Apply phase 的恢复策略。
_Avoid_: 全量重开、只跑浏览器

### Design System 与框架关系

**原生 theming 承接**:
设计系统 token 通过所选组件体系自带的主题机制落地（如 Tailwind/shadcn CSS variables、antd `ConfigProvider` token）；该主题文件是 Token Projection 的合法形态，不是权威 token 载体。
_Avoid_: token 同步、双向绑定、桥接生成

**另起炉灶**:
与已选型组件体系并行维护第二套 token 或组件实现。本仓库内特指上述并行体系，不作一般贬义使用。
_Avoid_: 重复建设

**复用优先级**:
Primitive 的实现优先复用组件体系已有组件并做样式调整，其次才是封装、fork 源码、手写。复用是实现方式，不豁免 Primitive 注册。
_Avoid_: 领养重写

**降级阶梯**:
组件体系缺失所需组件时 Primitive 实现的固定顺序：复用+样式调整 > 组合封装 > fork 源码并承接原生 theming > 从零手写。跳级须有组件体系缺失的事实依据。
_Avoid_: 自由实现

### 选型

**选型引导**:
greenfield/bootstrap 模式下，Architecture gate 中按分层建议语义呈现技术栈候选与官方 CLI 落地路径的引导。
_Avoid_: 方案选型、技术选型

**分层建议语义**:
把候选按「必选 / 默认 / 强烈推荐 / 推荐 / 特定场景再用 / 用户点名」分级呈现，每级对应不同的装入与确认行为。
_Avoid_: 推荐列表、建议清单

**默认候选**:
decision gate 中展示并说明影响的首选路径；须经用户选择或明确授权后才采用，不是静默默认。
_Avoid_: skill 默认、内置默认

**组件体系**:
与语言/框架层选型并列的组件库或样式方案（如 shadcn、antd、Tailwind 方案），是原生 theming 承接与复用优先级的适用对象。
_Avoid_: UI 框架（在闭集语境中 UI framework 仅指 React/Vue 等框架层）
