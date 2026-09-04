# Template fidelity schema v1

本目录独立于 `schemas/template/v2/`：

- `fidelity.schema.json`：`fidelity.yaml` sidecar 的结构与闭集枚举。
- 支持的 profile 仅 `repo-structural-v1`。
- 精确数值仍由 core v2 `tokens.yaml` 唯一携带；本 schema 只允许 token path、稳定 rule ID 或闭集 semantic 值。

语义校验（引用完整性、scroll owner、source replay、工程边界）由 `scripts/template_validation/fidelity.py` 执行，不在 JSON Schema 内完成。
