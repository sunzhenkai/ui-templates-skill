## ADDED Requirements

### Requirement: 交互 primitive 契约与 anatomy 不得沉默
对 `ui-kit` / `page-system` package，validator SHALL fail closed 当 `button`、`nav-item`、`menu-item`、`tabs` primitive 未声明 `variant_contracts`（至少含 `default`，字段含 `presentation`、`radius`、`control_height`、`focus_ref`）或未声明含 `icon` 与 `label` 的 `anatomy` slots。contract 中的 token/rule 引用必须解析。

#### Scenario: button 无契约
- **WHEN** page-system package 的 `primitive/button` 未声明 `variant_contracts`
- **THEN** validator 报 `PRIMITIVE_CONTRACT_MISSING` 且 package 无效

#### Scenario: nav-item 无 icon anatomy
- **WHEN** ui-kit package 的 `primitive/nav-item` 的 anatomy 缺少 `icon` slot
- **THEN** validator 报 `PRIMITIVE_ANATOMY_MISSING` 且 package 无效

#### Scenario: contract 引用悬空 token
- **WHEN** `control_height` 指向不存在的 token 路径
- **THEN** validator 报 `PRIMITIVE_CONTRACT_INVALID`

### Requirement: 前景/背景对比度配对声明
`core/tokens.yaml` MAY 声明顶层 `color_pairs`（foreground、background、`min_ratio`）；validator SHALL 解析配对 token 值并计算对比度，未达 `min_ratio` 或值不可解析时 fail closed。

#### Scenario: 声明配对达标
- **WHEN** `text-on-primary` on `primary` 声明 `min_ratio: 4.5` 且计算对比度达标
- **THEN** 校验通过

#### Scenario: 配对对比度不足
- **WHEN** 声明配对的计算对比度低于 `min_ratio`
- **THEN** validator 报 `COLOR_CONTRAST_TOO_LOW` 且 package 无效

### Requirement: 结构化字阶
`ui-kit` / `page-system` package SHALL 在 `tokens.typography` 声明字阶，且每个 step SHALL 携带结构化 `line_height` 与 `line_height_unit`。

#### Scenario: 字阶缺 line-height
- **WHEN** typography step 未声明 `line_height`
- **THEN** validator 报 `TYPOGRAPHY_STEP_INCOMPLETE`

#### Scenario: 无字阶
- **WHEN** page-system package 未声明 `tokens.typography`
- **THEN** validator 报 `TYPOGRAPHY_SCALE_MISSING`
