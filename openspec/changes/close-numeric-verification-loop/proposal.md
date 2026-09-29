# 关闭 numeric verification 与 measured expectation 消费缺口

## 背景

`workbench-shell` 生成的 example web 与 multica source 差距过大。实测发现三个机制断点，而不是单点样式失误：

1. Tailwind v4 Token Projection 使用默认 `@theme`；未命中 utility 的模板变量被 tree-shake，`--text-body`、`--spacing-control-height-*` 在运行态为空，正文和控件退回浏览器默认。
2. Apply checkpoint 的 scenario 覆盖只传 fidelity/primitives，漏掉 `core/layout.yaml` 与 `measured-expectations.yaml`，placement geometry 和 oracle-anchored expectation 没进入 checkpoint 门禁。
3. `verification_contract: numeric-v1` 之前不存在，Phase 8 记录可用 prose 声明 passed；16px/16px、65px header、缺 token variable 都能被“已检查”文本放行。

## 变更

- Active Instance adoption copy-only 保留 `measured-expectations.yaml`。
- checkpoint 场景覆盖改用 fidelity + layout + expectations + primitives 四输入。
- Phase 8 增加 opt-in 的 `verification_contract: numeric-v1`；每个 scenario 必须有 method/expected/observed/passed/evidence_ref 的结构化 measurement，长度可用显式 px tolerance。
- checkpoint 生成新会话默认声明 `numeric-v1`，旧 checkpoint 仍可读取。
- Structural checkpoint 绑定 `verification_contract: numeric-v1` 与 layout/expectations/primitives digests；input 漂移即 `CHECKPOINT_NUMERIC_INPUT_DRIFT`。
- Apply checkpoint 校验 token map 必须声明 Tailwind v4 static projection，并逐条覆盖 template tokens。
- Apply 参考文档强制 Tailwind v4 使用 `@theme static` 或等价保留层，并写清 numeric measurement 义务。

## 影响

- 旧 checkpoint 保持兼容；新 numeric 会话无法再用 prose 通过 Phase 8。
- Tailwind v4 消费项目必须在 built CSS 中保留全部映射变量，否则 numeric measurement fail closed。
- 后续仍需用户单独发起：从 source 重采补 chrome negative facts、Template Certification、promotion、干净模式重建 example。
