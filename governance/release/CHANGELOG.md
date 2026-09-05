# CHANGELOG

## Unreleased

- 增加现行功能闭环文档 `governance/FUNCTIONAL-LOOP.md`。
- Authoring 补齐分层抽取与模板库生命周期（published/retired、retire/delete）。
- Apply 区分干净实现与保真对照；拒绝 retired 模板；禁止读原版源码或历史生成 web。
- 生产 INDEX 增加状态列；治理排除当前 `example/workbench-shell/web/**`。
- 收束闭环规约为四条不变量；分层改为变更集合；模式 B 分类合并为 spec/apply/prompt-or-accept。
- `manage_template_index.py` 进入 Authoring runtime，并提供 `require-published` 与 `check-changeset`。
- workbench-shell `confidence.components` 降为 medium，与 defaulted 覆盖诚实对齐。
- chrome-complete 最小集改为 `shell_variant` + 有序 slots；`header-trigger`/`chat-fab` 仅当已声明才 required。Apply Phase 2/7/8 只投影本次 sidecar 已声明的 record。通用 skill 正文不再把 A–E、Board 或本仓 `web-v*` 写成完成条件。

## 2.0.0 — 2026-09-04

首个双 public skill 分发基线，属于破坏性版本：

- 分发单元由单一 Authoring skill 改为同时包含 `ui-template-author` 与 `ui-template-apply`。
- Authoring public skill 身份由 `ui-template` 更名为 `ui-template-author`，与 Apply 成对；升级时安装器移除已退役的 `ui-template` 生产目录，并保留其 `patches/`、`experience/`。
- 模板消费契约切换到 schema v2，只接受 `source | computed | estimated | default`。
- 可选独立 `fidelity.yaml` sidecar（`repo-structural-v1`）表达 layout/geometry/state 与 chrome composition；core v2 无 sidecar 仍按 `legacy-baseline` 消费，layout 不得为 high，未知 profile fail closed。
- Authoring session-source replay 与 portable validation 分离；`--source-root` 只用于本会话 Generate-from-source。
- bundle 内置 portable validator、source replay runtime、fidelity schema、contract eval runtime、schemas 与固定 non-example fixtures。
- 安装改为逐 public skill staging、校验、原子替换和失败回滚；双 skill 必须配套升级。
- `ui-template-manager`、OpenSpec project skills、patches、experience、仓库配置、`example/**` 和外部 UI 数据不进入 bundle。
