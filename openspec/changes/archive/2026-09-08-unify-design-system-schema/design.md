## Context

现有 schema v2 template 覆盖可复用模板，design-freeze v1 覆盖项目冻结，但两者没有共同契约。`unify-design-system-driver/grill.md` 已收敛 D1–D31；本子 change 只建立公共机器事实源。

## Goals / Non-Goals

**Goals:**

- 冻结 `design-system/v1` 的 manifest、core、binding、migration receipt 和 vendor manifest schema。
- 让 digest、Stable Entity ID、capability 和 freeze 状态成为可复现验证的公共契约。
- 提供三个 skill runtime 共用的 fail-closed validator。

**Non-Goals:**

- 不修改生产 skill 正文。
- 不迁移 `templates/workbench-shell`。
- 不移除现有 schema v2 与 design-freeze v1 消费行为；切换发生在 release 子 change。

## Decisions

### Contract layout

选择 manifest + 分层文件，而不是单一大 YAML 或目录 hash。分层文件可支持局部 digest、影响面恢复和按 capability 消费；manifest 保留版本、状态、layer refs 和 identity。

### Core closure

`core/` 固定七类语义：tokens、primitives、patterns、page-types、layout、rules、evidence。Package 用 `tokens-only | ui-kit | page-system` 声明必填范围，避免 style-only 来源被迫编造组件或页面。

### Identity and digest

每个 layer 文件有 digest；contract digest 使用 `sha256-canonical-json-v1` 覆盖 canonical manifest。binding 与 Token Projection 单独记录 digest。Stable Entity ID 使用 `primitive/<slug>`、`pattern/<slug>`、`page-type/<slug>`、`token/<path>`、`rule/<namespace>-<number>`；published ID 不复用。

### Single validator

选择统一 `validate_design_system.py`，而不是三个 skill 各自解析。Runtime 可以保留自己的流程状态，但 schema、digest、引用和 capability 判定必须返回一致结果。

### Migration and vendor receipts

Migration receipt 独立于 runtime contract，记录 source/target digest、映射和 unresolved/errors。Vendor manifest 独立记录 revision、license、files、digests 和 allowed triggers，供 release 子 change 纳入 bundle allowlist。

## Risks / Trade-offs

- [新 schema 过大导致后续改造受阻] → 先用最小 fixtures 锁定 manifest、七层 closure、digest 和 fail-closed 行为，再开放 skill 改造。
- [旧格式并存造成误解] → 本子 change 明确新格式是新增候选能力；当前发布格式切换由 release 子 change 原子完成。
- [引用规则过严影响抽取] → capability 允许缺层显式存在，但禁止悬空引用和隐式补语义。

## Migration Plan

1. 新增 schema、validator、fixtures 和 eval。
2. 保持现有模板与 freeze validator 行为不变。
3. 后续 Author、Design、Apply 子 change 分别接入统一 validator。
4. release 子 change 切换兼容范围并迁移官方 catalog。

## Open Questions

无。契约形态、digest、core closure、Stable Entity ID 和 fail-closed 行为已由 driver grill D1–D31 收敛。
