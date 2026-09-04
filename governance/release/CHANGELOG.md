# CHANGELOG

## 2.0.0 — 2026-09-04

首个双 public skill 分发基线，属于破坏性版本：

- 分发单元由单一 Authoring skill 改为同时包含 `ui-template` 与 `ui-template-apply`。
- 模板消费契约切换到 schema v2，只接受 `source | computed | estimated | default`。
- bundle 内置 portable validator、contract eval runtime、schemas 与固定 fixtures。
- 安装改为逐 public skill staging、校验、原子替换和失败回滚。
- `ui-template-manager`、OpenSpec project skills、patches、experience、仓库配置和外部 UI 数据不进入 bundle。
