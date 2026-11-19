# 07 视觉验收（交付前最后一步）

和参考原型逐页对比（参考图现拍，仓库不存截图），并且每个 pattern 的必拍状态都看过产品页。零未结问题才交付。

```bash
# 参考应用：scratch Vite 应用装上包、拷入 reference/src（reference/README.md），另开一个端口跑
python3 <skill>/scripts/review_visual.py compose --base http://localhost:5173 --reference-base http://localhost:5180 --project . /jobs /settings/general …

# 需要另一套数据的状态（空集、无会话、有同名会话）：先把应用调到该状态再拍。只拍产品页，不跟原型拼图。
python3 <skill>/scripts/review_visual.py compose --base http://localhost:5173 --project . /jobs#empty /chat#no-session /chat#sessions
```

- 参考图不随包发布。和原型同构的那一帧仍从 `--reference-base` 现拍。`--reference-base` 只在有原型对照时必填；`#state` 和 canvas 可以不传。
- 每个 `pages:` 路由至少一个 URL。原型从 `ui-decisions.yaml → pages` 的 pattern 推出，或写 `路径=原型`。
- 同构帧每个路由 4 张：1280 浅/深、768 浅，以及 `1280-light-end`（所有滚动区滚到底：PageHeader/输入框不动、只有声明区域在滚、最后一条完整，**画布四周边框、圆角、外边距仍完整可见**）。
- 同一 URL 就能表达的状态，compose 会额外拍产品页：`populated` / `cards` / `narrow` 在 390，`saved` / `dense` 在 1280 浅色，`dark` 在 1280 深色。空集、无会话、有会话列表必须用 `#state`，因为它们要另一套数据。
- canvas 没有原型，只拍 `dense` 和 `dark`。
- 产物：`.ui-review/<路由>-<视图>.png`（左：实现，右：参考）和 `.ui-review/<路由>-state-<name>.impl.png`（只有产品页）。`ui-review.md` 每个路由一节，并带 `- [ ] state <name>:`。`.ui-review/` 加入 .gitignore，`ui-review.md` 提交。

逐张打开（合成图看整体，`.impl.png` 看细节），按 `ui-review.md` 顶部的固定清单逐项对比：
圆角、接缝/分割线、对齐、间距节奏、层级、密度、颜色/边框对比、截断、滚动（-end）、控件文字颜色、
主文案相同的两行是否能看见路径/时间/id、同一数字是否只出现一处、图谱标签是否压节点、
用户可见的库名/文件路径/端口是否和正在运行的系统一致。
静态截图看不到的行为（hover、焦点、流式增长）由 check_rendered 的不变量覆盖；对话类页面验收时用真实或 mock 的长对话。

每个差异记一行 `- [ ] <清单项>: <现象>`，写在该路由下。状态行改成 `- [x] state <name>: <看到的结果>`。
修复（同类问题修在 surface/block/theme）→ 重跑 compose → 重新打开图片确认。
受锁文件上的差异用 `- [ ] lock: <锁内路径> <现象> → upstream: <版本>`，规则见 06，不要勾掉。
路由无未结项、每个声明过的状态都有勾选行之后，把 `status: pending` 改为 `status: reviewed`。
`validate_package.py project` 在仍有 `- [ ]` 或 `pending` 时报 J11；已登记页面却缺路由或缺状态行时报 J10（错误）。
