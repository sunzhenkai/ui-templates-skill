# Template fidelity schema v1

本目录独立于 `schemas/template/v2/`：

- `fidelity.schema.json`：`fidelity.yaml` sidecar 的结构契约。
- 词汇策略：shell variant、slot role、anchor role 与 scene kind 是模板实例自声明词汇（开放 stable ID），schema 不设固定枚举；`semanticValue` 只保留通用布局语义闭集（实例 chrome 词汇不得进入）。workbench-shell 的 `inset|flush` 与 12 个 chrome slot role 是首个模板的实例值，不是产品闭集。
- 支持的 profile 仅 `repo-structural-v1`。
- 精确数值仍由 core v2 `tokens.yaml` 唯一携带；本 schema 只允许 token path、稳定 rule ID 或闭集 semantic 值。

语义校验（引用完整性、scroll owner、source replay、工程边界）由 `scripts/template_validation/fidelity.py` 执行，不在 JSON Schema 内完成。
