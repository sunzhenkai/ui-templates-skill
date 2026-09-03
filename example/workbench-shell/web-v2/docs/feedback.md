# 模板反馈（来自 web-v2 apply）

## 反馈 1：apply/quality.md 缺少看板骨架的明确建议

- **场景**：web-v2 实现事件看板时，5 列容器使用 `overflow-x-auto`，列表骨架如果按"真实 grid 内"复制需要 `w-72` 列宽与滚动容器解耦。
- **证据**：当视口 < 1440px 时骨架列与实际列会因 `scrollbar-gutter` 差异抖动 1–2px。
- **建议**：在 [`templates/workbench-shell/apply/quality.md`](../../../apply/quality.md) "页面级骨架"清单中增加一条"看板 / 泳道：骨架列与实际列共享 `w-72` 固定宽度，水平外层 `overflow-x-auto`；不要用 `display: grid; grid-template-columns: repeat(auto-fill, minmax(...))`"。
- **影响范围**：所有使用看板 / 泳道模式的消费者。

## 反馈 2：components.md Button 几何补一行默认值来源

- **场景**：web-v2 实现 Button 时，token `--text-body` 14/20 与组件"文字 14px medium"天然对齐，但模板 prose 中没有明示这一点。
- **证据**：阅读者会怀疑"32px 高的按钮 + 14px 文字 + 水平内边距 10px"的中心对齐计算是否需要额外的 line-height override。
- **建议**：在 [`templates/workbench-shell/components.md`](../../../components.md) Button 段补一行"字号 / 行高直接引用 `--text-body`（14 / 20），不要再声明 `text-sm leading-5`"。
- **影响范围**：所有 shadcn / Radix-based 组件消费者。

## 反馈 3：routes-and-layouts.md 缺少"行内交互元素不与行 anchor 嵌套"的反例

- **场景**：web-v2 在事件列表第一列渲染置顶按钮，标题单元格渲染跳链接。如果只读模板 prose 不容易察觉冲突。
- **证据**：将按钮放进 `<a>` 内部会导致 HTML 校验失败，且屏幕阅读器宣读顺序错乱。
- **建议**：在 [`templates/workbench-shell/routes-and-layouts.md`](../../../routes-and-layouts.md) §5 增补一行 "行内 checkbox / 切换 / 菜单按钮必须独占单元格，不能放入行 anchor；标题 link 也要独立单元格。"
- **影响范围**：所有列表 / 表格型页面。

## 反馈 4：brand 蓝 vs sidebar-accent 的使用边界

- **场景**：web-v2 侧栏激活态使用 `sidebar-accent` 而非 `brand/12`，与 `routes-and-layouts.md §1` 一致。
- **证据**：若消费者希望"激活项带 brand 蓝点"，模板 spec §0 第 8 条说"`brand` 蓝只用于关键操作、激活强调、未读点、进行中状态"，但 `routes-and-layouts.md` 中侧栏使用 `sidebar-accent`。
- **建议**：在 [`templates/workbench-shell/routes-and-layouts.md`](../../../routes-and-layouts.md) §1 补一句 "侧栏激活态使用 `sidebar-accent` 而非 `brand/12`；`brand` 留给未读 / 进行中 / 关键 CTA。"
- **影响范围**：所有侧栏 / 导航消费者。

## 未上报（仅业务相关，不污染模板）

- 模拟失败通过 `forceFail: true` 触发；不同业务会需要不同的失败模式（关键字、设备 ID、超时），与模板契约无关。
- 班次冲突检测使用"成员 + 时间段重叠"启发式；如果业务支持 12 小时跨夜班次，需要在消费者项目里自定义冲突规则。
- Webhook 测试连接的"成功 / 失败"结果目前由 mock 直接返回，真实环境需要模拟 5xx 比例；与模板契约无关。
