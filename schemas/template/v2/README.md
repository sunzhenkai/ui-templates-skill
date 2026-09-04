# Template schema v2

本目录使用 JSON Schema Draft 2020-12：

- `common.schema.json`：版本、SemVer、闭集枚举、token/rule path、时间戳、digest 与 finding identity。
- `meta.schema.json`：模板身份、来源、分维度置信度与互斥 coverage。
- `tokens.schema.json`：统一 token record；裸 scalar/list/map 不能作为叶子。scalar numeric 与含 numeric 的同单位 list 必须在 record 声明 `unit`；mapping 中的 numeric 必须使用 `{value, unit}` 成员，可表达异构单位，不能以裸 numeric 绕过。
- `evidence.schema.json`：token/default/asset 来源、定位、状态、许可、再分发与脱敏决定。
- `feedback.schema.json`、`checkpoint.schema.json`、`verification.schema.json`：反馈生命周期、Apply checkpoint 与 Phase 8/9 证据。
- `skills-manifest.schema.json`：双-skill bundle、allowlisted files、SHA-256、generator 与 license inventory。

schema 负责结构和闭集；coverage 完整性、状态迁移、证据路径、规则引用、颜色及跨文件语义由 `scripts/template_validation/` fail-closed 校验。

Repository governance 另在 `schemas/governance/sample-promotion-report.schema.json` 定义 evidence-only 样例 promotion report；它不是模板或 public skill runtime schema，不进入双-skill bundle。
