## Context

Apply 已有 Phase 0–9、current-build 验证、UUID feedback 和 atomic write 治理。本子 change 将输入真相切到 Active Instance，并把模板解析扩展为 package adoption。

## Goals / Non-Goals

**Goals:**

- 用显式 mode 表达初始化与增量更新。
- 用统一 validator 和 stable IDs 决定实施与恢复边界。
- 让 vendor 规则可复现且按栈隔离。

**Non-Goals:**

- 不直接编辑 core contract。
- 不要求 Design 安装。
- 不把历史 `example/**` 或生成物当参考。

## Decisions

### Bootstrap 仍可无 Design

为了保留 Author+Apply 成对产品能力，bootstrap 允许 Apply 从 published package adopt-only 建立 Active Instance。需要语义重构时移交 Design。

### 精确失效优于全量重开

checkpoint 保存 stable IDs 与 digest 依赖面。Token、primitive、pattern、binding 或 build identity 变化只重开受影响 phase；完整身份失配仍然 fail closed。

### Vendor 是发布资产

四个 reference 快照随 Apply 分发，由 manifest 和 bundle allowlist 固定。加载决策来自用户确认后的 binding，避免运行时探测和网络下载。

## Risks / Trade-offs

- [increment 误判受影响面] → conservative dependency graph；无法证明不影响时扩大重开范围。
- [vendor 体积增加] -> 只保留必需 reference 文件，排除 eval、agent 适配和图片。
- [bootstrap 与 Design 职责混淆] -> Apply 只做领养和 binding，不改 core。

## Migration Plan

1. 接入统一 validator 和 Active Instance resolver。
2. 增加 mode 字段与 checkpoint schema。
3. 切换 vendor loading 与 browser gate。
4. 用 bootstrap、increment、digest failure 和 vendor trigger fixtures 验证。

## Open Questions

无。
