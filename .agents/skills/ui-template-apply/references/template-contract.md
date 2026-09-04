# Template Apply 消费契约

本文件只定义消费不变量；字段全集和生成语义由 `ui-template/references/spec-format.md` 所有。

## 启动前 fail-closed 检查

1. 必须存在 `spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml`。
2. `meta.yaml`、`tokens.yaml`、`evidence.yaml` 必须都声明 `schema_version: 2`；`meta.template_version` 必须可解析。缺失或未知版本立即停止并要求显式迁移，禁止按 v1 猜测。
3. 每个 token leaf 必须是含 `value`、适用 `unit` 与 origin 的 record。origin 只接受 `source | computed | estimated | default`；出现 `observed` 或任意未知值即拒绝开始。
4. checker 必须确认 token/evidence、coverage、rule ID、链接和 required contrast 可解析。验证失败的模板不得进入 Phase 0 complete。

四种合法 origin 的 `value` 都是确定性 expected：source 为来源声明，computed 为计算/实测，estimated 为可追踪估算，default 为 Authoring 明确补全。Apply 不因 estimated/default 自行换值；偏离必须在 `.ui-template-apply/01-token-map.yaml` 记录 rule ID、理由和用户确认。

## 读取优先级

1. `spec.md` 是设计规则入口，Non-negotiables 优先。
2. `tokens.yaml` 是精确值唯一载体，expected 不从 prose 重算。
3. 拆分设计文档补充平台/页面模式/组件设计。
4. `apply/` 只补阶段映射和取证方法，不能推翻设计规则或复制精确值。

发现冲突时，以较高层为准，在 Phase 9 记录 rule ID/裁决并创建 feedback；不得静默处理。

## coverage decision

对目标平台、视口、主题、page mode、组件、状态逐项读取 coverage：

- observed：可按模板直接纳入；
- defaulted：实现前由用户决定 `accepted | deferred | excluded`；
- unsupported：只能 deferred/excluded，或先移交 Authoring 扩展模板；
- 未声明/重叠/未完整覆盖：模板无效，停止。

所有决定写入 `00-intake.md` 和 checkpoint scope。实现开始（Phase 5）前必须完成决定，不能靠缩小测试矩阵掩盖 coverage 缺口。

## evidence 与 rule ID

Apply 使用 evidence 审计来源，不用它覆盖 token。checkpoint 的 template name/version 必须与当前 meta `name`/`template_version` 一致，不能只校验 digest。verification/review/feedback 必须引用模板中存在的稳定 rule ID；feedback 只要含 targets 就必须提供完整规则上下文并逐项校验，且 evidence refs 必须相对 `.ui-template-apply/` 根存在、不越界。source revision、template digest、token digest、目标源码 revision 和 build identity 必须进入 checkpoint 与 Phase 8/9 记录；身份不一致的旧证据不可复用。
