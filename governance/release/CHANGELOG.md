# CHANGELOG

## 2.0.0 — 2026-09-04

首个双 public skill 分发基线，属于破坏性版本：

- 分发单元由单一 Authoring skill 改为同时包含 `ui-template` 与 `ui-template-apply`。
- 模板消费契约切换到 schema v2，只接受 `source | computed | estimated | default`。
- 可选独立 `fidelity.yaml` sidecar（`repo-structural-v1`）表达 layout/geometry/state；core v2 无 sidecar 仍按 `legacy-baseline` 消费，未知 profile fail closed。
- Authoring session-source replay 与 portable validation 分离；`--source-root` 只用于本会话 Generate-from-source。
- bundle 内置 portable validator、source replay runtime、fidelity schema、contract eval runtime、schemas 与固定 non-example fixtures。
- 安装改为逐 public skill staging、校验、原子替换和失败回滚；双 skill 必须配套升级。
- `ui-template-manager`、OpenSpec project skills、patches、experience、仓库配置、`example/**` 和外部 UI 数据不进入 bundle。
