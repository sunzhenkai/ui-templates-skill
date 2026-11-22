# Proposal — Tabs 非选中态浅色对比度

## Intent

消费端渲染闸门 R06 在 line 变体 Tabs 上稳定报 4.45 < 4.5（浅色）：`TabsTrigger` 非选中态用
`text-foreground/60`，透明底（line 变体）下 alpha 合成后对比度不足。属组件档位问题，不是 token 偏差，
修组件而不是降门槛。

## 改动

- `ui/tabs`：非选中态文字 `text-foreground/60` → `text-foreground/70`（浅色对比度 ≈5+；深色沿用
  `dark:text-muted-foreground` 不受影响）。
- quiet-inset 0.6.16 / workbench-shell 5.0.28。

## Conflict check

- 只影响非选中态文字色，选中态与指示条不变；default（bg-muted）变体同样受益。
- 不改 token，不触发 J12。

## Validation

- `make preflight`：sync + check + validate ×2。
- 消费端：R06 在 line 变体页面复测通过；其余页面无视觉变化（仅非选中文字略深）。
