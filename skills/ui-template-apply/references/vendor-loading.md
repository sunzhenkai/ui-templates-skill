# Repository bridge: use frontend-design inside Active Instance

`references/vendor/frontend-design/SKILL.md` 是 vendor 原文，不得修改。Apply 必须先读该原文，再按本仓 gate 落地：

1. 视觉方向只能引用 `core/tokens.yaml`、Stable Entity IDs 和 binding 中已确认栈。
2. 不引入 vendor 偏好之外的 raw palette、任意 spacing、未注册 Primitive。
3. 增量更新只动声明 change set；未声明路径保持原字节。
4. 任何新视觉方向先回 Active Instance freeze，再重生页面。
