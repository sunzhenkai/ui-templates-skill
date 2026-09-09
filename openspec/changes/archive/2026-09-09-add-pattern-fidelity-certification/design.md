## Context

现行 `design-system/v1` 已有七层 portable core、Stable Entity ID、digest 和 structural fidelity profile，但缺少把“视觉基本一致”变成模板发布门禁的闭环。Apply 文档仍暴露 source-compare 式心智，而模板认证需要原版 oracle，二者必须隔离。

相关约束见 `docs/adr/0004-source-blind-apply-with-fidelity-contract.md`、`docs/adr/0005-pattern-equivalence-fidelity-acceptance.md` 和 `docs/adr/0006-derived-component-family-and-certification-gate.md`。

## Goals / Non-Goals

**Goals:**

- 让 Apply 保持唯一实现心智：`bootstrap | increment`，且与 Visual Oracle 无实现期信息通路。
- 用固定 inputs、干净重生、Pattern 级 assertions 和身份绑定支撑模板 publish/upgrade。
- 用现有七层引用关系推导 Component Family，不制造新的手工清单层。
- 将 `workbench-shell` 的 prose inventory 升级为 candidate package 的可验证 family closure。

**Non-Goals:**

- 不做逐像素整页 diff。
- 不把 oracle、source inventory 或 certification report 写入 Template Package。
- 不自动 promotion、tag、archive 或修改 `example/**`。
- 不要求所有现有模板立即重新认证；gate 先绑定官方 publish/upgrade 路径。

## Decisions

### 新增独立 certification 契约

新增 `design-system-fidelity-certification/v1` 表示一次 gate 运行和其 records。它与 structural fidelity sidecar 分离：sidecar 描述 package 抽取事实，certification 描述某次 candidate、build 和 oracle 的对照结果。这样 package 仍保持 portable，不携带 oracle 报告或本机路径。

### Pattern 是证据和失败归属单元

认证按 Pattern 聚合 assertions 和截图，而不是按整页像素比较。业务页可以不同，但 shell、table、toolbar、badge、board、panel、form group、dialog、empty state 等 Pattern 必须可追溯到同一语义单元。失败归属输出 `package | apply-skill | certification-prompt`，避免把契约缺口藏进生成物。

### Component Family 是派生闭集

Validator 沿 `page-types.yaml → patterns.yaml → primitives.yaml` 解析 Stable Entity ID，并要求每个闭集成员有可解析 evidence。发布完整性由 gate-side、source-derived certification inventory 补充：inventory 可以发现 package 漏抽原版 Pattern，但它不是 package 层，也不被 Apply 消费。

### Gate 属于模板治理，不属于 Apply

Gate 拥有 oracle revision、candidate package、固定 prompts 和 certification inventory；它通过普通 Apply 生成干净 output root。Apply 不新增 flag、mode 或 source-compare artifact。公共生产路径仍遵守 publish 单独确认。

## Risks / Trade-offs

- [Visual Equivalence 可能被弱化为主观判断] → schema 强制 assertions、双截图、identity 和 verdict；截图-only 不通过。
- [source inventory 漏项导致“完整”名不符实] → inventory 必须绑定 oracle locator/replay identity；缺失与冲突 fail closed。
- [认证成本高于单模板校验] → 只放在官方 publish/upgrade 边界，普通消费 Apply 不运行 oracle。
- [现有 Mode B 用户迁移成本] → 提供明确错误与移交说明；认证 gate 取代 source-compare 会话。

## Migration Plan

1. 先扩展 schema、共享 validator 和 eval fixtures，不影响现有合法 package 消费。
2. 更新 Apply 文档、checkpoint 校验与 eval，删除 source-compare 模式入口并拒绝 oracle-as-implementation。
3. 增加 Template Certification Gate 命令与治理验收说明。
4. 生成 `workbench-shell` 升级 candidate，补齐 Component Family 与 evidence，并通过 package validator 和 certification gate。
5. 生产 `templates/INDEX.md` 与 Author catalog promotion 等待用户单独请求；未确认前 candidate 保持隔离。

## Open Questions

无。
