# apply/quality

验收只写取证方式；不复制数值。规则出处见括号内的文档。

## Tokens 与视觉

| 检查 | 取证 |
| --- | --- |
| 表面层级正确 | computed style 证明 shell / canvas / surface / raised 使用对应主题角色。（spec §2） |
| 字号白名单 | 遍历可见文本 computed style，只出现 10 档之一；可编辑触控文本单独核对。（spec §3） |
| 文本灰度 | 检查正文 / 次级文本只使用 foreground / muted；faint 未用于文本。（spec Non-negotiables #6） |
| 阴影层级 | surface、menu、floating 分别匹配对应 token；普通分区未使用浮层阴影。（spec §6） |
| 双主题一致性 | light / dark 角色键一致，截图或 computed style 证明选中 / hover 方向反转。（spec Non-negotiables #9） |

## Shell 与布局

| 检查 | 取证 |
| --- | --- |
| 整页滚动 | Web/Desktop 根元素高度锁定且 `overflow: hidden`；滚动容器为面板。（spec Non-negotiables #1） |
| Chrome 对齐 | PageHeader、Toolbar 与正文左缘 computed x 相同；高度均为 token 值。（spec §4） |
| 侧栏行为 | 修改窗口 / 容器宽度，验证默认、折叠、覆盖 Sheet 与外层触发器规则。（platform 文件） |
| 页面模式 | 路由清单映射到 A–E，混合槽位可逐条解释。（routes §3） |
| 浮动净空 | 滚动到最后一条并打开底部浮层，证明 FAB、batch bar 不遮挡内容。（routes §2） |

## 组件与状态

| 检查 | 取证 |
| --- | --- |
| 交互状态 | 每个核心组件记录 default、hover、active、focus-visible、disabled、selected / open 的截图或 DOM 状态。（components.md） |
| 表单可访问性 | label、错误描述、required / disabled / readonly 语义可从 DOM 读取。（components.md Input） |
| 行导航 | 键盘 Tab 只到真实可交互元素；checkbox、菜单、按钮不在行 anchor 内。（routes §5） |
| 弹层 | 打开、键盘困住、Esc 关闭、焦点返回、Sheet 路由关闭均有证据。（components.md Dialog） |
| 空态 | 无数据、过滤空、错误、404 各有正确 role 和动作。（components.md Empty） |

## 响应与平台

| 检查 | 取证 |
| --- | --- |
| 断点 | 320 / 768 / 1024 / 1280 / 1440px 截图验证导航、页头、卡片、设置页签。（routes §4） |
| 容器查询 | 缩小侧栏或分屏，列表网格列行为随容器而非窗口变化。（spec Non-negotiables #13） |
| Desktop chrome | 页签、窗口工具栏、back / forward、画布 hairline 与圆角截图验证。（platforms/desktop.md） |
| Mobile shell | 安全区、底部页签、badge、formSheet、键盘与最小触控目标验证。（platforms/mobile.md） |

## 全局质量

| 检查 | 取证 |
| --- | --- |
| WCAG AA | 正文 / 次级文本对真实背景达到 4.5:1；非文本弱化标记至少 3:1。（spec §2） |
| 键盘 | 仅用键盘完成导航、打开 / 关闭弹层、列表、设置、提交与取消。（spec Non-negotiables #12） |
| Screen reader | 页面标题、`aria-current`、icon-only label、status / alert、表格 role 可从 DOM 读取。（spec §7） |
| 减少动效 | 开启 reduced motion 后无位移 / 滚动干扰，状态变化仍可感知。（spec §6） |
| URL 恢复 | 刷新或分享 URL 后恢复视图、过滤、页签、详情或页签状态。（routes §5） |
