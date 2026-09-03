# desktop 平台壳

Desktop 与 Web 共享 [`../spec.md`](../spec.md) 与 [`../tokens.yaml`](../tokens.yaml)；只覆盖窗口 chrome、页签和画布差异。

## 结构

```text
window（h-screen / overflow hidden / app-shell）
├─ WindowToolbar（48px，traffic lights + sidebar/back/forward）
├─ Sidebar（可拖拽；顶部为 48px spacer）
├─ MainTopBar（48px 页签条）
└─ MainCanvas（page-canvas；mr 8px / mb 8px；radius 14px）
   ├─ NavigationProgress
   ├─ 当前页签内容
   └─ FloatingChat
```

## 窗口工具栏

- 顶行高 48px；左侧窗口控件区宽 184px。
- 窗口控件后依次是 sidebar 触发器、back / forward；按钮 28px、图标 16px、hover 用 sidebar accent。
- 窗口控件区允许拖动，内部按钮禁止拖动。
- 外层触发器常驻时，页头不得再渲染第二个 sidebar 触发器。

## 页签

- MainTopBar 高 48px；页签文字 12px；标签区水平 padding 10px、图标 / 文本间距 6px。
- 激活页签与下方画布共享 surface 色，并延续到画布顶边；未激活文本 muted，hover 提升为 sidebar accent foreground。
- 支持拖拽排序、固定、关闭、中键关闭和右键菜单；固定区与普通区之间用 4px 间距 + 1px 竖线分隔。
- 唯一页签和固定页签不显示关闭；关闭前必须保证至少一个页签或恢复工作区首页。

## 画布与导航

- 侧栏展开时画布左缘 2px hairline；侧栏折叠 / compact 时左缘扩大到 8px；右侧与底缘保持 8px。
- 画布圆角 14px，1px surface ring，极轻 surface shadow；内部 `overflow: hidden`。
- 页签、路由与工作区切换支持 back / forward、键盘快捷键和原生手势；目标未解析前显示结构化 loading。
- 跨工作区通知和链接必须切换到正确工作区，不得把目标挂到当前工作区页签组。
- Modal registry、全局搜索与 WindowOverlay 在页签系统之外；pre-workspace overlay 仍保留 traffic lights 与自己的 drag strip。
