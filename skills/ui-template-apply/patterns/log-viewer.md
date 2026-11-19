---
name: log-viewer
when: 日志、事件流、执行输出
blocks: [blocks/log-view, blocks/format]
decisions:
  - key: log.wrap
    options: ["off", "on"]
    default: "off"
self_review:
  - 行数可能 > 500 时用 LogView（虚拟滚动），不是 map 出全部 div
  - 跟随尾部默认开启；用户向上滚动后自动暂停跟随
  - 结构化字段默认折叠
  - LogView 有固定高度，是页面中唯一允许的内部滚动区域
  - LogView 自带外框和工具栏下边线；不要再包一层 Card 造成双框
  - 容器窄于 768 时行内换行；宽屏默认不换行
  - 计数只出现在 LogView 工具栏，页头不再重复同一数字
---

# Log viewer

```tsx
const lines: LogLine[] = events.map((e) => ({ id: e.id, time: e.ts, level: e.level, text: e.message, detail: e.fields }))
<LogView lines={lines} height="32rem" />
```

规则
- 日志是“窗口”，所以它自己滚动；同页其余内容仍由文档滚动。
- 等宽字体、12px、行高 20px；级别只用颜色区分 warn/error，info 不着色。
- 下载完整日志用独立按钮（PageHeader actions），不要试图在浏览器里渲染全部历史。
- 容器宽度 ≥ 768 时默认不换行（可横向滚动），工具栏提供换行开关。窄于 768 时 LogView 强制换行，避免一行被截断。
- 行数只放在 LogView 工具栏（`可见 / 总数`）。页头、页脚不要再写同一个计数。
- 级别色在 LogView 里。对比不够时按 06 记 `lock:` 与 `upstream:`，不在页面里改 `levelClass`。
