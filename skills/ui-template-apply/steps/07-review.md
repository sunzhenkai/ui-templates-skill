# 07 视觉验收（交付前最后一步）

和参考原型逐页对比（参考图现拍，仓库不存截图），零未结问题才交付。

```bash
# 参考应用：scratch Vite 应用装上包、拷入 reference/src（reference/README.md），另开一个端口跑
python3 <skill>/scripts/review_visual.py compose --base http://localhost:5173 --reference-base http://localhost:5180 --project . /jobs /jobs/<真实id> /jobs/new /settings/general …
```

- 参考图不随包发布，compose 从 `--reference-base` 现拍（同一主题同一原型页）；`--reference-base` 缺省报错。
- 每个 `pages:` 路由至少一个 URL；原型从 `ui-decisions.yaml → pages` 的 pattern 推出，或写 `路径=原型`。
- 每个路由 4 张：1280 浅/深、768 浅，以及 `1280-light-end`（所有滚动区滚到底：PageHeader/输入框不动、只有声明区域在滚、最后一条完整，**画布四周边框、圆角、外边距仍完整可见**）。
- 产物：`.ui-review/<路由>-<视图>.png`（左：实现，右：参考），`.impl.png` 为实现原图；`ui-review.md` 每个路由一节。
  `.ui-review/` 加入 .gitignore，`ui-review.md` 提交。

逐张打开（合成图看整体，`.impl.png` 看细节），按 `ui-review.md` 顶部的固定清单逐项对比：
圆角、接缝/分割线、对齐、间距节奏、层级、密度、颜色/边框对比、截断、滚动（-end）、控件文字颜色。
静态截图看不到的行为（hover、焦点、流式增长）由 check_rendered 的不变量覆盖；对话类页面验收时用真实或 mock 的长对话。

每个差异记一行 `- [ ] <清单项>: <现象>`，写在该路由下。修复（同类问题修在 surface/block/theme）→ 重跑 compose →
重新打开图片确认 → 改为 `- [x] … → <修法>`。路由无未结项后把 `status: pending` 改为 `status: reviewed`。
`validate_package.py project` 在仍有 `- [ ]` 或 `pending` 时报 J11，缺路由报 J10。
