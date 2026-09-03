# mobile 平台壳

移动端遵守 [`../spec.md`](../spec.md) 的字号、表面、状态与可访问性规则；本文件只记录移动外壳差异。

## 主题差异

- 移动端源码使用 HSL 基础 token：light 背景为白色、前景接近黑；dark 背景接近黑、前景接近白；`brand` 为 `hsl(225 71% 58%)`。
- 移动 elevation 采用 `surface-1`（light L 98%，dark L 8%）与 `surface-2`（light L 90%，dark L 19%）；嵌套表面用更高一级。
- 基准圆角与 Web / Desktop 一致为 10px；平台原生 Sheet 圆角为 20px。
- 该平台未完全复用 Web/Desktop 的 `oklch()` 中性阶梯；消费时按主题角色映射，不得把两套未换算值直接混用。

## 布局

```text
safe area root（flex 1）
└─ workspace stack
   ├─ bottom tab shell（Inbox / My Issues / Chat / More）
   └─ detail / modal stack
```

- 底部页签背景与页面背景同色；激活 tint 为 foreground，未激活为 muted foreground；标签 11px。
- Inbox 与 Chat 未读使用 brand 徽章，上限显示 `99+`；零计数不渲染徽章。
- “More”页签不落地普通路由，而是打开 popover / formSheet；空间切换、设置和次要集合从这里进入。
- 详情页从页签下钻时返回到页签；深层 filter / picker 关闭后恢复原列表状态。

## Sheet 与触控

- 通用 picker / filter 使用原生 formSheet：60% 和 95% 两个 detent、显示 grabber、圆角 20px、内容满高；孤立表单可用 fit-to-content。
- 新建、搜索等 modal 自绘 header 与关闭动作；每个 sheet body 有标题与主动作。
- 所有可点目标符合平台最小触控尺寸；可编辑文本聚焦时渲染 16px，避免 iOS 聚焦缩放。
- 键盘出现时 composer / 输入区贴键盘；列表滚动位置不得跳离用户正在查看的行。
- 手势必须与无障碍动作等价：swipe、long press、drag 均提供按钮或菜单路径。
