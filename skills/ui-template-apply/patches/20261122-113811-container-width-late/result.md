# Result — useContainerWidth 晚挂载测量

## 落点

- `blocks/use-container-width.ts`：`node` 参与依赖；空依赖 → `[node]`。
- quiet-inset `0.6.11 → 0.6.12`、workbench-shell `5.0.23 → 5.0.24`。

## 验证

- `make sync` + `make check` 48 tests OK；validate ×2 0 error。
- 消费端：文档阅读页加载完成后容器宽度生效，宽屏右栏 / 窄屏图标回退均按预期。
