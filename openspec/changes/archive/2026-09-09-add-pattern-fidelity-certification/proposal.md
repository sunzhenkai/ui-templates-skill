## Why

当前 `workbench-shell` 只携带少量 Primitive、Pattern 和 structural fidelity 事实，Apply 在消费未声明组件族时只能自行发明视觉细节；同时 Apply 文档中的 `Mode A / Mode B` 把模板实现与发布侧保真对照混成两种用户心智。仓库需要一个 source-blind、可机器验证的模板保真认证闭环，让“指定模板即可基本复现原版视觉”成为可验收契约。

## What Changes

- 移除 Apply 公开流程中的 `Mode A / Mode B`；Apply Mode 只保留 `bootstrap | increment`，实现期永远不读取原版 checkout、`meta.sources[]` 实现路径或历史生成物。**BREAKING**：依赖 Apply 内 source-compare 模式的旧会话必须改走 Template Certification Gate。
- 新增 Template Certification Gate：在模板 publish/upgrade 前用固定 Visual Oracle revision、candidate package 和固定 prompts 执行 source-blind 干净 Apply，再对照 Visual Oracle。
- 新增 `design-system-fidelity-certification/v1` 的 Pattern Equivalence Record 契约，绑定 package、build、oracle identity，并覆盖截图与 geometry、spacing、typography、color assertions。
- Component Family 不新增第八层；由 `Page Type → Pattern → Primitive` 引用关系和 evidence 推导闭集，validator 校验引用、粒度和覆盖缺口。
- 将 `workbench-shell` 升级为覆盖完整工作台 Component Family 的 candidate：补齐 Primitive、Pattern、Page Type、layout、rule 与 evidence 的引用闭包；生产 catalog promotion 仍需用户单独确认。
- 同步 Author、Apply、共享 validator、evals、治理命令和派生文档；失败差异只能回写 package、skill 或 certification prompts，然后重新干净生成。

## Capabilities

### New Capabilities

- `template-fidelity-certification`: 定义模板发布前的 source-blind 保真认证、Pattern Equivalence Records、certification inventory 和失败回写边界。

### Modified Capabilities

- `design-system-contract`: 新增 Component Family 由现有七层引用与 evidence 推导并 fail-closed 校验的行为。
- `design-system-implementation`: 明确 Apply 只允许 `bootstrap | increment`，禁止 source oracle 模式和生成物修复面，并要求 Pattern 归属与引用闭合。
- `design-system-release`: 将 Template Certification Gate 纳入官方 package publish/upgrade 的必要证据。
- `workbench-shell-implementation`: 将核心组件 inventory 升级为 Page Type → Pattern → Primitive 的完整 Component Family，并约束抽取粒度与 candidate 发布边界。

## Impact

- 影响 `schemas/design-system/v1/`、`scripts/validate_design_system.py`、共享安装态 validator、`scripts/template_validation/`、contract evals 和相关 fixtures。
- 影响 `skills/ui-template-apply/` 的模式文档、checkpoint/verification 语义与 eval；影响 `skills/ui-template-author/` 的 candidate、evidence 和 catalog 升级说明。
- 影响 `governance/` 认证命令或验收说明、`templates/workbench-shell/` 与 `skills/ui-template-author/catalog/workbench-shell/` 的 candidate 升级路径。
- 不允许修改 `example/**` 生成物；生产 INDEX/catalog promotion 必须等待用户单独请求。
