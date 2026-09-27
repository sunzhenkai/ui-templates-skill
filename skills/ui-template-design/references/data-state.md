# Data-State binding

Loading / Empty / Error 不是可选装饰。列表、详情、主从 Pattern 必须在自身覆盖：

| 状态 | UI |
| --- | --- |
| idle | LoadingState（骨架，保持布局） |
| loading | LoadingState |
| success | 内容 slot |
| empty | EmptyState（下一步动作） |
| error | ErrorState（重试 + 可读原因） |

业务页传入查询结果或等价 props，不得在页面里分叉四套布局。`animate-spin` / `animate-pulse` 只允许出现在 LoadingState / 骨架内部。Gallery 必须为每个列入范围的 Pattern 展示上述状态，缺一不得 freeze。
