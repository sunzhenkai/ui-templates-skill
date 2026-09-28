# Apply 按需消费 design system：引入 derived route 通道

## 背景

`design-system-placement-closure` 当前把「模板观测闭集」当成需求覆盖闭集：每个 included route 硬绑 Page Type / Pattern / Layout / template_refs，模板对布局语义沉默时一律 unresolved 停止。workbench-shell 等模板只覆盖单一产品采集到的场景；真实需求超出观测闭集时（例如模板没有的表单页形态），tokens/primitives/rules 语言层足以推导，但契约不允许派生，只能阻断。

## 变更

- per-route 新增 `design_source: template | derived`，默认 `template`，存量行为不变。
- `derived` route 免除四类强制绑定（page_type / pattern_refs / layout_ref / template_refs），必须声明可解析的 `derivation_basis`（模板 rules/tokens/primitives stable ID 或本会话 LOCAL rule ID）；悬空 `DERIVATION_BASIS_DANGLING`、缺失 `DERIVATION_BASIS_MISSING`。
- 「模板沉默 → 停止」改为「模板沉默 → 显式派生记录」；仅与模板显式声明（negative facts、topology、pattern closure）冲突时 fail closed。
- placement-sensitive 组件授权：引用 derived route 时可用 derivation_basis 内已声明 pattern，或以 LOCAL rule 记录授权。

## 影响

- 存量 checkpoint（无 design_source 字段）走 template 分支，零行为变化。
- 防静默发明布局的目标保留：派生必须显式记录语言层依据，Phase 8 current-build 证据与 Phase 9 feedback 通道不变。
