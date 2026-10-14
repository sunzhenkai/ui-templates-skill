# 04 页面

逐页：
1. 在 `patterns/index.md` 找主 pattern 和原型；**复制** `reference/src/pages/<原型>.tsx` 到项目，改名、换数据。不要从规则重写布局。
2. 读该 pattern 的规则与 self_review，补原型没覆盖的部分（筛选、实时、确认…）。

硬规则（lint 拦大部分）：
- 布局只用 surfaces（`Page Body Split Panel Section Stack Grid Toolbar Actions Inline Properties Rows Centered`，见 patterns/page.md）。
  页面代码不写 `border* rounded* p-/px-/py-/m-* gap-* space-* divide-* shadow-*`（`ui-template/no-layout-classes`）；
  缺什么几何就给 surface 加 prop，修在库里。
- 只用主题角色色；状态色只经 `StatusBadge`。字号 `text-xs / sm / base / lg`；控件高度用组件 size。
- 时间、数字、字节、时长、ID：`blocks/format`。内部跳转：`AppLink` / `RowLink`。集合：`DataTable`。
- 异步区域：`StateBoundary`；操作反馈：`notify`；确认：`useConfirm`。不写 `h-screen / 100vh / overflow-auto` 包页面。
- 修改 `src/components/ui|blocks/*`：尽量不改；改了就在 `ui-decisions.yaml → local_edits` 写原因。

每完成一页就跑 05 的快速检查（tsc + eslint），不要攒到最后。
