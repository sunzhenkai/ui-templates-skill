# `design-system/v1` Package Format

`design-system/v1` 是 Author 的新建/更新发布产物。它只携带可复用设计语义；项目落地选择由 `binding.yaml` 表达，且 binding 永远不出现在 package 内。

## 目录

```text
templates/<name>/
├── design-system.yaml      # design-system/v1 manifest
├── meta.yaml               # design-system-meta/v1
├── core/
│   ├── tokens.yaml         # design-system-tokens/v1；精确值唯一权威
│   ├── primitives.yaml     # design-system-primitives/v1
│   ├── patterns.yaml       # design-system-patterns/v1
│   ├── page-types.yaml     # design-system-page-types/v1
│   ├── layout.yaml         # design-system-layout/v1
│   ├── rules.yaml          # design-system-rules/v1
│   └── evidence.yaml       # design-system-evidence/v1
└── apply/                  # optional；仍技术栈无关
```

`meta.yaml` 声明 `schema: design-system-meta/v1` 和 `version`；`name/version` 必须等于 manifest `id/version`。

## Capability

| capability | 必填 core | 消费含义 |
| --- | --- | --- |
| `tokens-only` | tokens、rules、evidence | 只可映射主题与规则，不可声称页面能力 |
| `ui-kit` | tokens、primitives、rules、evidence | 可实施已声明 primitives |
| `page-system` | 七层全部 | 可支撑完整页面实施 |

manifest 里的 `layers` 只能声明 capability 范围内文件。缺层是 capability 边界；Apply 不得即兴补语义。

## Digest

- 每个 layer digest 是 `sha256-canonical-json-v1`，输入为 YAML/JSON 安全解析后的 canonical JSON。
- `contract_digest` 覆盖删除 `contract_digest` 字段后的 canonical manifest。
- `binding_digest` 和 projection digest 属于消费项目，Author 不得预填。
- `status: frozen` 时 manifest contract digest、全部 layer digest 和 projection digest 缺一即 fail closed。

## Stable IDs

跨文件身份固定为 `primitive/<slug>`、`pattern/<slug>`、`page-type/<slug>`、`token/<dotted-path>` 和 `rule/<NAMESPACE>-###`。展示名、YAML key、页面标题不是身份。published ID 不复用；替代时旧记录写 `retired`/`superseded` 并指向新 ID。

## L0–L6 映射

| Authoring 变更标签 | package 目标 |
| --- | --- |
| L0 身份 | `design-system.yaml` + `meta.yaml` |
| L1 壳 / chrome | `core/layout.yaml` |
| L2 token | `core/tokens.yaml` + `core/evidence.yaml` |
| L3 scene / route | `core/layout.yaml` + `core/page-types.yaml` |
| L4 原子组件 | `core/primitives.yaml` |
| L5 复合组件 | `core/patterns.yaml` |
| L6 Apply 映射 | `apply/` |

变更集合仍按路径/组件冻结。未声明文件保持原字节。

## Package feedback

`design-system-feedback/v1` 的 `ownership` 固定为 `package`；`package` 记录 name/version/capability/contract digest；`targets` 只接受 Stable Entity ID；`evidence_refs` 必须能在授权 inbox 上下文内解析。项目 binding 缺口和 Apply skill 缺陷不得写入 package feedback。

## Gate

仓库内：

```bash
python3 scripts/validate_design_system.py validate <candidate-package> --kind package --json
python3 scripts/validate_design_system.py validate-feedback <feedback.yaml> --evidence-root <inbox> --json
```

安装态使用本 skill 的 discovery wrapper（它会启动 `runtime/shared_validate_design_system.py`，不得把 wrapper 写入 `UI_DESIGN_SYSTEM_VALIDATOR`）：

```bash
python3 runtime/validate_design_system.py validate <candidate-package> --kind package --json
```

指向 wrapper 会以 `VALIDATOR_SELF_INVOCATION` 失败；缺共享实现或 schema 为 `DESIGN_SYSTEM_VALIDATOR_MISSING`。任一 error 都停止 Index。candidate-only；production INDEX 只在用户显式确认的 publish/index gate 中更新。
