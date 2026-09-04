# Authoring gate/report contract

Report 是稳定 JSON envelope `report_schema_version: 1`。成功 structural 报告必须包含：

- capture profile、fixed source revision/graph digest、scope、closure digest、summary、空 unresolved；
- fidelity `schema_version/profile/conformance/scope/canonical_digest`；
- replay identity 与 `declared = resolved = executed = passed > 0`；
- eval runner identity/fingerprint 与 `declared = parsed = executed > 0`；
- production INDEX before/after digest、`unchanged_during_gate: true`，以及是否显式 promoted。

示例（省略非关键计数）：

```json
{
  "report_schema_version": 1,
  "status": "passed",
  "profile": {
    "schema_version": 1,
    "profile": "repo-structural-v1",
    "conformance": "structural",
    "canonical_digest": "sha256:...",
    "scope": {"scenes": ["shell"]},
    "unresolved": []
  },
  "replay": {
    "status": "passed",
    "identity": "sha256:...",
    "declared": 12,
    "resolved": 12,
    "executed": 12,
    "passed": 12
  },
  "production_index": {"unchanged_during_gate": true, "promoted": true}
}
```

`style-only` 必须报告非空选择理由、空 structural facets、replay `not-run` 和降级文本“未提供 structural layout/geometry/state fidelity”；不得写成 profile-verified。合法 v2 无 sidecar 的消费/迁移/已发布模板 portable 报告使用 `legacy-baseline` 和“structural profile unavailable”，replay 可为 `not-run`，不能冒充用户主动 style-only，也不能把缺历史 checkout 写成失败。未知 sidecar/profile 不属于 baseline，必须 fail closed。

失败报告 `status: failed`，列出稳定 issue code，并确认 `production_index.before_digest == after_digest`、`promoted: false`。`STRUCTURAL_REPLAY_REQUIRED` **仅**用于本会话声称 structural Generate-from-source 但对该 session source 的 replay 不可执行或 `not-run`。已发布模板 portable validation 为零 error 且 replay `not-run` 时不得使用该 code，不得把「请提供本地绝对路径」写入失败原因，并可以使用“完成”报告 `legacy-baseline` 或 portable 通过。
