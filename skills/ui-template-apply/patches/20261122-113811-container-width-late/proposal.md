# Proposal — useContainerWidth 节点晚挂载时也要测量

## Intent

文档阅读页的右栏显隐依赖 `useContainerWidth` 测容器宽度，但该 hook 的 layout effect 用空依赖：
组件首屏是加载骨架（观察节点尚未挂载，`ref.current === null`），数据到达后才渲染真正容器——effect 不会
重跑，宽度永远 0，于是「宽屏显示右栏」的判断永远落空（Split 反而退化为堆叠）。

## 改动

- `blocks/use-container-width`：渲染期取 `node = ref.current`，layout effect 依赖 `[node]`——节点从
  null 变为元素时重新观察并立即回填宽度；节点变化也会正确 disconnect 旧 observer。
- quiet-inset 0.6.12 / workbench-shell 5.0.24。

## Conflict check

- 对外签名不变（`[ref, width]`）；已挂载即测量的调用方行为等价。
- 依赖数组变化只在 node 身份变化时触发，无额外渲染循环。

## Validation

- `make sync` + `make check`；validate ×2 0 error。
- 消费端：加载后才挂载的容器能正确驱动布局（右栏显隐 / 堆叠回退）。
