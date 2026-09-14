# Proposal: close-layout-fidelity-blind-spots

## Why

workbench-shell 重建事故实证：`design-system-placement-closure` spec 已要求记录 inset 内容区与内容内 section navigation，但 capture 事实闭包只强制 chrome 槽位闭合——「内容卡片几何」「页内二级导航」不在必答问题集内，导致模板层失语、Apply 发明替代布局、Phase 8 证据集与契约共享同一盲区（17/17 通过却与原版形态不符）。`closure_complete: true` 闭合的是 scope 问题集本身，而 scope 由同一作者自由起草，属自证循环；必须把「问了什么」从作者自觉变成机器强制。

## What Changes

- **capture 必答事实矩阵**：`shell_variant: inset` 声明 ⇒ canvas 槽位的 inset/gap、radius、border、shadow、background 五项几何成为必答事实（token-ref 即可）；各 page_mode 附带必答问题（多分区页必须声明 section-navigation 放置，detail 页必须声明 master/detail 分侧与上下文面板位置）。无法作答必须显式 `exclusions`（带理由），不允许沉默。骨架 `--init-source-graph` 按矩阵生成必答清单注释。
- **模板契约补全（workbench-shell 1.3.1）**：layout placement geometry 增补内容卡片五项记录并绑定新 rule（内容区为悬浮 inset 卡片）；改写 NN-102 断点描述（`PAGE_GUTTER px-4` 是卡内页槽而非整页 full-bleed）；新增 `pattern/section-nav`（卡内左列二级导航）并挂入 settings 类 page-type patterns 闭包。
- **Apply 消费纪律**：Phase 2 `placement_plan` 每条布局决策必须 trace 到模板 placement geometry/rule/pattern ID；模板沉默 + Apply 欲自定 ⇒ unresolved ⇒ 停止询问用户。binding 声明 `component_system: shadcn` 时壳层必须从 vendor sidebar 原语（含 SidebarInset）起步。
- **Phase 8 scenario 派生扩张**：每条 placement geometry 记录 ⇒ 一条 computed-style/logical-geometry scenario；每个 pattern ⇒ 一条存在性+位置 scenario。证据面随模板事实自动扩张，不再与上游共享盲区。
- **认证兜底**：shell-bearing 模板 catalog promotion 前必须过 Template Certification Gate（固定 Visual Oracle + source-blind 干净 Apply + Pattern Equivalence Records）。

## Capabilities

### New Capabilities

无全新 capability；全部落在既有 capability 上。

### Modified Capabilities

- `structural-fidelity-profile`：新增「capture 必答事实矩阵」Requirement（shell inset 几何五项 + page_mode 必答问题 + 显式 exclusions）；**BREAKING**（收紧 capture 闭合条件，旧 graph 缺必答事实将 fail closed）。
- `design-system-placement-closure`：修改「Placement authorization closure」，增加 Apply 侧 placement 决策 trace 与模板沉默即停止的要求。
- `design-system-implementation`：修改 Phase 8 验证要求，scenario 派生显式纳入 placement geometry 记录与 pattern 闭包。
- `template-fidelity-certification`：修改认证触发条件，shell-bearing 模板 catalog promotion 前强制认证。

### Removed Capabilities

无。

## Impact

- **代码面**：`skills/ui-template-author/runtime/template_authoring/{capture,chrome,profile}.py`、`repo-capture-format.md`、`apply-workflow.md`、vendor rules、`scripts/derive_apply_scenarios.py`（或等价派生入口）、fixtures 与 eval case 同步；`templates/workbench-shell` 1.3.1 候选与重跑 authoring gates；`example/workbench-shell/web` 按 Impact-based Resume 从 Phase 1 重开。
- **兼容性**：capture 闭合收紧属 fail-closed 前向变更；已发布模板 portable 校验不受影响（无 session source 不走 capture）。catalog 1.3.1 promotion 需用户单独确认（维持现状红线）。
- **非目标**：不重写 `openspec/changes/archive/**` 与 immutable history；不自动 publish/promote。
