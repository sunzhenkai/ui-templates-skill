# 强化视觉保真契约：密度、图标、对比度、拓扑位置与字阶成为可执行契约

## 背景

从 `workbench-shell` 模板生成的 example web 出现七类系统性视觉缺陷：文字层级过深、header 被实现到内容卡之外、按钮字色与底色难以分辨、导航缺图标、弹窗内容被视口裁剪、控件高度与字阶不和谐、整体质感不足。归因结论是这些维度在 `design-system/v1` 契约里**不可表达或表达了但 validator 不执行**：文档（package-format）早已声明 fail-closed，实际 validator 对沉默放行。生成物不是修复面，必须修机制。

## 变更

1. `tokens.schema.json`：token record 增加结构化 `line_height`/`line_height_unit`/`font_weight`；tokens 文件增加顶层 `color_pairs`（前景/背景/min_ratio 声明）。
2. `layout.schema.json`：`placementRegion` 增加 `position`（`static|sticky|fixed`），表达置顶 chrome 事实。
3. 统一 validator（`scripts/validate_design_system.py`，同步三 skill runtime）新增 fail-closed 检查：
   - `PRIMITIVE_CONTRACT_MISSING` / `PRIMITIVE_ANATOMY_MISSING`：ui-kit/page-system 下 button/nav-item/menu-item/tabs 必须声明 variant contracts（含 control_height）与 icon/label anatomy，沉默即失败。
   - `COLOR_PAIR_DANGLING` / `COLOR_PAIR_UNRESOLVABLE` / `COLOR_CONTRAST_TOO_LOW`：color_pairs 必须解析且达到声明对比度。
   - `TYPOGRAPHY_SCALE_MISSING` / `TYPOGRAPHY_STEP_INCOMPLETE`：ui-kit/page-system 必须有字阶，每步必须有结构化 line-height。
4. `workbench-shell` 模板 3.0.1 → 3.1.0：补齐十步字阶（含 line-height 与字重 token）、控件高度阶梯（24/28/32/36）、radius 阶梯、menu shadow、chart ramp、sidebar 语义色、color_pairs；button 声明 8 个 presentation 变体契约与 icon/label anatomy；nav-item 声明 icon+label+trailing anatomy；layout 中 page-header/page-toolbar 归位到 page-canvas 之下并声明 `position: sticky`；dialog 场景声明 content 滚动域与 max-block-size 几何；新增 QUALITY-105~109、LAYOUT-108、LAYOUT-110 规则与来源证据。
5. fixtures、catalog 副本、contract eval fixture 同步上述契约；skill 参考文档（package-format、extraction-layers、apply template-contract）同步新语义与消费义务。

## 影响

- 已发布模板中沉默缺 contract/anatomy/typography 的 ui-kit/page-system package 将校验失败，需补声明（符合既有文档语义）。
- Apply 侧获得：密度阶梯、图标义务、对比度配对、sticky 拓扑、弹窗适配、完整字阶 —— 均为 expected，不得以组件库默认补位。
