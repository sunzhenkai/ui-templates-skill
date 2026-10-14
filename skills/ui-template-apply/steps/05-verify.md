# 05 验证

```bash
npx tsc --noEmit
npx eslint src
python3 <skill>/scripts/validate_package.py project .
npm i && npm run dev &   # 依赖变化后先安装；dev 与 preview 各跑一次 check_rendered
python3 <skill>/scripts/check_rendered.py http://localhost:5173/jobs http://localhost:5173/jobs/1 … --shots .ui-shots
```

`check_rendered` 覆盖 1280/768/390 × 浅/深。每个 `pages:` 中的路由至少检查一次：动态路由（`/jobs/:id`）用一个真实 id 和一个不存在的 id（验证 404）各测一次，列表再加一个无结果的筛选 URL 测空态。
错误码含义见脚本头部；R10 = dev server 错误浮层，R11（警告）= 相邻区域同底色无分割，R12 = 圆角层级（panel 只有一种半径且小于画布），
R13 = 分割线接缝（split 侧栏与内容等高、贴页头底线、到画布底边），R14 = 上下相邻 panel 左右边对齐，
R15 = 单一滚动模型（每个路由：每个滚动区注入 3000px 并滚到底后，document/body/画布 scrollTop==0 且不可滚动，只有 `data-scroll-region` 滚动，画布仍完整在视口内），R17 = 滚动区内表头吸顶（不透明、贴住区域顶边、行不透出，深浅色都查），R18 = 集合计数（页脚有更多时必须有加载更多/哨兵、知道总数时显示「已加载 n / 共 m」；接口返回游标/hasMore/满 limit 页而页面没有“还有更多”页脚即报错），R16 = 可编辑控件文字 ≥4.5（含祖先 opacity）、placeholder ≥3；
不存在 id 的路由渲染 NotFound（`data-state="not-found"`）时，接口 404 不计 R08；R09（行高）为警告。

修复原则：错误出现在多个页面 → 修在 block 或 pattern（更低的共享层），而不是逐页打补丁。
几何不变量通过后进入 07 视觉验收。
