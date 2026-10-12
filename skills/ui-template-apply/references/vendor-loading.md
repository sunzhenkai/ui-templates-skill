# Repository bridge: use frontend-design inside Active Instance

`references/vendor/frontend-design/SKILL.md` 是 vendor 原文，不得修改。命中 visual direction 时先读该原文，再按下面的顺序落地：

1. 新的视觉表面（尚无冻结共享值，或本轮变更集合包含视觉方向或页面组合）：按 frontend-design 的 two-pass 实现一条主流程代表页（含 empty 与 failure）。color、type、layout、signature 先写进该页，并在浏览器里修订该页源码至少一轮。
2. 要跨页面共享的精确值回写 `core/tokens.yaml`、Stable Entity IDs 与 binding 中已确认的栈，然后冻结或刷新 freeze。其余页面消费这些值。
3. 已冻结系统上的页面组合（层次、文案、密度、动效、signature 的摆放）在页面实现里完成。要改已经共享的精确值时，走 `ui-template-design` iterate 并刷新 digest，再继续其余页面。
4. 增量更新只动声明的 change set；未声明路径保持原字节。
