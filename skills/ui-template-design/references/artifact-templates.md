# Artifact templates

核心产物的最小 YAML shape。只保证字段可解析、gate 可验证；不预设视觉内容。按需读取，不预加载全文。

## 00-intake.md

```yaml
task_class: refactor
source_origin:
  kind: legacy-freeze-migration
  package: null
  migration:
    receipt: migration.yaml
    source_digest: <sha256-file>
site: existing
output_root: .
change_set:
  layers: [token, pattern]
  paths: ["src/styles/**", "src/components/patterns/**"]
decision_gates:
  - gate: scope
    question: "只修列表空态，还是提升为共享 EmptyState Pattern？"
    options: ["local-fix", "shared-pattern"]
    selected: shared-pattern
    authority: user
    consequence: "多一个 Pattern 与 Gallery 状态，但业务页不再各自补空态"
```

## 02-tokens-freeze.yaml

```yaml
schema: design-tokens/v1
colors:
  foreground: "#0f172a"
  muted-foreground: "#64748b"
  background: "#ffffff"
  border: "#e2e8f0"
  primary: "#2563eb"
  destructive: "#dc2626"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-4: "16px"
typography:
  font-body: "Inter, sans-serif"
  font-mono: "JetBrains Mono, monospace"
radius:
  radius-sm: "4px"
  radius-md: "8px"
motion:
  duration-fast: "150ms"
  duration-normal: "300ms"
```

## 03-primitives.yaml

```yaml
schema: design-primitives/v1
items:
  - name: Button
    variants: [primary, secondary, destructive, ghost]
    sizes: [sm, md, lg]
    states: [default, hover, focus-visible, disabled, loading]
    path: src/components/ui/button.tsx
  - name: Input
    variants: [default, error]
    sizes: [sm, md]
    states: [default, focus-visible, disabled]
    path: src/components/ui/input.tsx
```

## 04-patterns.yaml

```yaml
schema: design-patterns/v1
items:
  - name: ListPage
    slots: [toolbar, filter, content, pagination]
    primitives: [Button, Input, Badge]
    forbidden: [domain-imports, raw-page-container]
    data_states: [idle, loading, success, empty, error]
    breakpoints: { wide: "table+side", narrow: "stacked" }
    motion: duration-fast
    page_type: List
    path: src/components/patterns/ListPage.tsx
  - name: DetailPanel
    slots: [header, body, footer]
    primitives: [Button, Badge]
    forbidden: [domain-imports]
    data_states: [loading, success, error]
    breakpoints: { wide: "side-panel", narrow: "full-screen" }
    motion: duration-normal
    page_type: Detail
    path: src/components/patterns/DetailPanel.tsx
```

## 07-gallery.yaml

```yaml
schema: design-gallery/v1
route: /dev/design-system
build_identity: dev-server@commit-or-timestamp
coverage:
  primitives:
    - primitive: Button
      states_shown: [default, hover, focus-visible, disabled, loading]
  patterns:
    - pattern: ListPage
      states_shown: [idle, loading, success, empty, error]
```

## binding.yaml

```yaml
schema: design-system-binding/v1
contract_id: active-increment
contract_version: 1.0.0
output_root: app
stack:
  language: typescript
  ui_framework: react
  styling: tailwind
  component_system: shadcn
primitive_paths:
  primitive/button: app/ui/button.tsx
projections:
  - name: css-variables
    target: app/theme.css
    mechanism: css-variables
    mappings:
      - token: token/color.primary
        native_key: ":root.--color-primary"
    digest: {algorithm: sha256-canonical-json-v1, value: <projection-digest>}
binding_digest: {algorithm: sha256-canonical-json-v1, value: <binding-digest>}
updated_at: "2026-09-08T00:00:00Z"
```

## design-system.yaml

```yaml
schema: design-system/v1
id: active-increment
version: 1.0.0
status: frozen
capability: page-system
layers:
  tokens: core/tokens.yaml
  primitives: core/primitives.yaml
  patterns: core/patterns.yaml
  page-types: core/page-types.yaml
  layout: core/layout.yaml
  rules: core/rules.yaml
  evidence: core/evidence.yaml
layer_digests:
  tokens: {algorithm: sha256-canonical-json-v1, value: <layer-digest>}
contract_digest: {algorithm: sha256-canonical-json-v1, value: <contract-digest>}
```

## freeze.yaml

```yaml
schema: design-freeze/v1
status: frozen
digest:
  algorithm: sha256-canonical-json-v1
  value: <sha256-of-body>
mode: greenfield
template: null
kit:
  primitives: true
  patterns: true
  gallery: true
rules_files:
  - AGENTS.design.md
  - .cursor/rules/ui-design-system.mdc
output_root: .
updated_at: "2026-09-07T00:00:00Z"
```

用 `compute-digest` 子命令算 digest：

```bash
python3 skills/ui-template-design/runtime/check_design_freeze.py compute-digest --freeze-path .ui-template-design/freeze.yaml --json
```
