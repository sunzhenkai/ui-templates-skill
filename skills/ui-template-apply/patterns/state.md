---
name: state
when: 任何依赖异步数据的区域：加载、空、错误、未配置
blocks: [blocks/state-boundary, ui/skeleton, ui/empty]
decisions:
  - key: state.loading
    options: [skeleton, spinner]
    default: skeleton
self_review:
  - 每个查询区域都包在 StateBoundary 里，四态都有
  - 骨架屏形状接近真实内容（列表用 RowsSkeleton），不是整页 spinner
  - 错误态有重试；未配置态说明缺什么并给出去配置的链接
  - 后台刷新（isFetching 但有数据）不替换内容，不闪烁
---

# State

```tsx
<StateBoundary
  query={sources}
  unconfigured={!settings.apiKey && <EmptyState title="尚未连接数据源" description="先在设置中填写访问密钥。" action={<Button asChild size="sm"><AppLink to="/settings/keys">去设置</AppLink></Button>} />}
  empty={{ title: "还没有数据源", action: <Button size="sm" onClick={create}>添加数据源</Button> }}
>
  {(items) => <DataTable … data={items} />}
</StateBoundary>
```

`query` 只需满足 `QueryLike<T>`：`{ isPending, isError, error, data: T | undefined, refetch? }`。
React Query 的 `useQuery` / `useInfiniteQuery` 结果直接传（infinite 用 `select` 拍平 pages）；
其他数据层自己拼这五个字段即可，`children` 收到的是非空的 `data`。
`data` 不是数组时传 `isEmpty`，否则空态永远不会出现。

规则
- 优先级：未配置 > 加载中 > 错误 > 空 > 内容。
- 空态文案：标题说现状（「还没有任务」），描述说价值或下一步，最多一个主按钮。
- 区块级错误只影响该区块，页面其余部分照常显示。
- 首次加载 < 300ms 时允许不显示骨架（React Query 的 placeholderData 保留旧数据）。
