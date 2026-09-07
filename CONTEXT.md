# Context

本仓库发布 `ui-template-author` / `ui-template-apply` / `ui-template-design` 三个 public skill。本 glossary 只沉淀本会话 crystallize 的 ui-template-design 领域术语。

## Language

### Design System 与框架关系

**原生 theming 承接**:
设计系统 token 的精确值落在所选组件体系自带的主题机制上（如 Tailwind/shadcn CSS variables、antd `ConfigProvider` token）；该主题文件即「token 唯一载体」的合法形态。
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
