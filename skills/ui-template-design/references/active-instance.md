# Active Instance 契约

Active Instance 是消费项目内唯一可实施 Design System。目录固定在 `.ui-template-design/`：

```text
.ui-template-design/
├── design-system.yaml      # design-system/v1 manifest
├── core/                   # 七层 portable core
├── binding.yaml            # project binding + Token Projection
├── 00-intake.md ...        # Phase 状态与证据
├── 08-verification.json
└── evidence/
```

## Task class 与 source origin

`bootstrap | refactor | iterate` 描述项目状态；`blank | template-package | legacy-freeze-migration` 描述来源。二者正交：

```yaml
task_class: bootstrap
source_origin:
  kind: template-package
  package:
    name: ui-kit-fixture
    version: 1.0.0
    digest:
      algorithm: sha256-canonical-json-v1
      value: <package-contract-digest>
```

`template-package` 只能领养 `published` 且 frozen 的 package。领养复制 `design-system.yaml`、`meta.yaml`、`core/`，不复制或伪造 `binding.yaml`。

## Binding 与 projection

`binding.yaml` 必须记录 output root、闭集 stack、Primitive implementation paths、projection targets/mappings/digest 与 `binding_digest`。Token 值必须追溯到 `core/tokens.yaml`；原生 theme 文件只是 Token Projection。手改 theme 而不改 core 会导致 projection digest mismatch。

## Gate

```bash
python3 skills/ui-template-design/runtime/check_active_instance.py validate .ui-template-design --kind active --json
```

Design-only 安装没有仓库 `scripts/` 或 Author 时，使用本 skill `runtime/shared_validate_design_system.py`。禁止把 `check_active_instance.py` 或其它 discovery wrapper 写入 `UI_DESIGN_SYSTEM_VALIDATOR`；命中则 `VALIDATOR_SELF_INVOCATION`，不得 freeze。

Freeze 前还需 Gallery/浏览器证据和规则扫描。`migration receipt` 有 unresolved/errors 时不得继续 freeze。

## Package adoption

```bash
python3 skills/ui-template-design/runtime/adopt_package.py \
  --package /path/to/package \
  --design-root .ui-template-design \
  --output-root app \
  --language typescript --ui-framework react --styling tailwind \
  --component-system shadcn
```

## Legacy migration

```bash
python3 skills/ui-template-design/runtime/migrate_legacy_freeze.py \
  --freeze .ui-template-design/freeze.yaml \
  --target-kind active-instance \
  --target-root .ui-template-design \
  --receipt-out .ui-template-design/migration.yaml \
  --unresolved "component path mapping missing"
```

`status: failed` 的 receipt 阻止 freeze；未解决项必须补齐后重跑。
