# Gallery

没有橱窗，Agent 只能猜。v1 在已确认栈的输出根提供应用内路由 `/dev/design-system`（或等价 dev-only 面）。Storybook 是可选 adapter，不是 freeze 条件。

最低展示：

- Primitive × 声明状态（Button default/hover/focus/disabled/loading/destructive 等）
- Pattern × 数据态（loading/empty/error/success；MasterDetail 宽屏并排与窄屏 Drawer）
- Token 色板、间距尺、字体阶梯、运动示例

Gallery 是视觉回归主靶。业务页回归只覆盖已迁移页。记录到 `07-gallery.yaml`：路由或命令、覆盖的状态 ID、build identity。

## Anatomy 覆盖与状态矩阵

Gallery 对每个声明 anatomy 的 primitive 至少渲染一个**全槽位**实例（含 `required: false` 的条件槽位，如 count、shortcut、trailing action），并按 `data-primitive` / `data-slot` 标注。每个 primitive 以「variant × state」矩阵呈现：states 取自 primitives `states[]`（default/hover/focus-visible/active/selected/disabled/loading/empty/error 中适用者），hover/active 用静态类或 `:is()` 强制态展示。运行：

```
python3 runtime/check_anatomy_conformance.py --instance .ui-template-design --url <gallery-url> --require-all
```

状态矩阵由脚本自动采集并截图（每个 `[data-primitive]` × 声明 state × 主题 × viewport）：

```
python3 runtime/check_state_matrix.py --instance .ui-template-design --url <gallery-url> \
  --themes light,dark --theme-class dark --viewport 1280x800 \
  --open tooltip=hover:<trigger-css> --open dropdown-menu=click:<trigger-css> --open context-menu=contextmenu:<row-css> \
  --out <evidence-dir>/state-matrix
```

hover/focus-visible/active/selected/disabled 与 default 的 computed 签名必须不同（`STATE_NO_VISUAL_CHANGE`），selected/disabled/open 必须至少有一个实例（`STATE_NOT_DEMONSTRATED`）；`index.html` 是逐格截图证据。源有多主题时每个主题都要跑。

任何 `ANATOMY_SLOT_MISSING` / `ANATOMY_ICON_EMPTY` / `ANATOMY_ORDER` / `PRIMITIVE_NOT_RENDERED` 即 Gallery 未完成。
