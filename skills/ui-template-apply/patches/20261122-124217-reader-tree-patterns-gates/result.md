# Result — reader/tree-nav pattern + 门禁

## 落点

- 新增 `patterns/reader.md`、`patterns/tree-nav.md`；`patterns/index.md` 增两行路由。
- `patterns/settings.md`：分区 5–6 个、同类合并、一区可含 1–2 个 Section。
- `patterns/canvas.md`：hover 浮层、详情弹窗、显式选中、画布不套卡片。
- `contract/components.json`：P14 增 `blocks/surfaces`（`h-7`/`pl-11`/`ml-auto`/`order-2`/`border-l`/`gap-0.5`）、
  `blocks/page-header`（`iconOnly`/`inlineMax`/`destructive`）、`blocks/use-container-width`（必须 `[node]`，
  禁止空依赖）。
- `Makefile`：`validate`、`preflight`（sync → check → validate）；`AGENTS.md` 写明门禁禁止接管道、
  版本攒批发布、patch 记录要求。
- quiet-inset `0.6.14 → 0.6.15`、workbench-shell `5.0.26 → 5.0.27`。

## 验证

- `make preflight`：48 tests OK（skip=1），validate ×2 0 error。
- 消费项目重锁 0.6.15：tsc / eslint / build / vitest 5/5 / fidelity 7/7 / validate project 0 error。

## 备注

「页面不得手写导航行」未新增 lint 规则：`no-layout-classes` 已禁止页面出现 padding/圆角/间距类，
手写行无法通过现有规则，重复加规则只会增加误报面。改由 P14 契约守护 library 侧实现。
