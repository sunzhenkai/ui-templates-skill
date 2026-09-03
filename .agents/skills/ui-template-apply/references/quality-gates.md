# Template Apply Quality Gates

本文定义 Template Apply 的最低质量门禁。目标项目可以有更严格标准,但不得低于本文。每个 gate 都必须有证据;“看起来没问题”不算通过。

## 1. 路由与 URL 状态

### 必须通过

- 跨页面目的地使用真实 `<a href>`;不需要导航的命令才使用 `<button>`。
- 侧栏当前项、面包屑当前叶子或 route tab 使用正确的当前页语义。
- 当前路由和可恢复状态可以通过 URL 恢复。
- 刷新、浏览器前进、浏览器后退后页面状态一致。
- 无效 `id`、失效 `tab`、不存在路由、未授权状态有明确表现。
- 一次性意图参数消费后从 URL 移除。

### 检查方法

1. 从 Accessibility tree 或 DOM 中读取导航入口,确认语义是 link。
2. 对每个 route state 复制 URL 到新标签页并刷新。
3. 使用浏览器返回/前进,确认内容、选中项和高亮一致。
4. 输入不存在或已删除的 id,记录页面表现。

### 常见反例

- 侧栏导航、面包屑祖先、搜索结果使用 `<button onClick>`。
- `aria-current="page"` 放在没有导航能力的控件上。
- URL 写入 `?id=`,但目标页面不消费该 id。
- 无效路由静默回到首页,用户无法区分“未找到”和“默认页”。

## 2. 可访问性语义

### 必须通过

- 所有可操作控件键盘可达。
- 焦点指示在亮暗主题下都可见。
- icon-only 控件有非空 accessible name。
- 表单控件有关联 `<label>`、`aria-label` 或 `aria-labelledby`。
- tab、checkbox、switch、combobox、menu 使用正确 role 和状态。
- 状态不能只靠颜色表达;必须有文字、图标、形状或辅助文本。
- 交互控件不得嵌套;例如复选框不能嵌在整行 `<button>` 内。
- 对比度满足 WCAG AA;大号文本也不例外,除非模板显式批准更高阈值。

### 检查方法

1. 读取 Accessibility tree,确认每个控件的 role 和 name。
2. 只用键盘完成关键流程。
3. 对每个 icon-only 控件读取 accessible name。
4. 检查 `:focus-visible` 或等效焦点样式。
5. 对状态色和背景计算对比度。

### 常见反例

- 窄屏隐藏文字后控件 accessible name 为空。
- 列表行是 `<button>`,内部又渲染 checkbox 或 link。
- SVG 上的 `onClick` 被当作“取消置顶”按钮。
- 只用红色表示错误,没有文字或图标。

## 3. 浮层与焦点

### 必须通过

- dialog、drawer、command palette、confirm 打开时焦点进入弹层。
- `Esc`、关闭按钮和取消路径可用。
- 点击遮罩的行为与模板约定一致。
- 关闭后焦点返回触发控件或合理的新位置。
- modal 弹层阻止背景内容被键盘误触。
- Toast 不遮挡关键操作;错误 Toast 提供重试或下一步。

### 检查方法

1. 记录触发前 `document.activeElement`。
2. 打开弹层后记录焦点位置。
3. 用键盘遍历,确认焦点被合理限制。
4. 用 `Esc` 和取消关闭,确认焦点返回。

## 4. 布局与滚动

### 必须通过

- 根容器按模板锁定高度,例如 `100svh`,且不出现整页滚动条。
- 滚动只发生在内容列、列表、详情、看板列或明确允许的面板内。
- 页头、工具栏、页左距在不同页面保持一致。
- 长列表滚动时页头、工具栏和必要操作保持稳定。
- 可滚动主列使用 `scrollbar-gutter: stable` 或等效方案,避免滚动条出现导致横跳。
- 长列表顶部使用模板要求的渐隐遮罩。
- 文档流不使用阴影;阴影只用于 menu、dialog、drawer、popover、toast 等浮层。

### 检查方法

1. 比较 `document.documentElement.scrollHeight` 与 client height。
2. 列出 `overflow` 为 `auto`/`scroll` 的容器及其滚动归属。
3. 读取 PageHeader、Toolbar 和主要内容左边界的位置。
4. 在滚动前后对比关键 chrome 的位置。

## 5. 响应式

### 必查视口

至少验证模板定义的 desktop、compact 和 mobile 三档;没有明确值时使用 1440×900、900×900 和 390×844 或 480×900。

### 必须通过

- 每个视口下关键流程可完成。
- 无意外横向滚动;允许横向滚动的表格、看板或日历必须有可视提示和替代操作。
- 导航入口按模板规则出现或消失。
- 页头动作按规则收缩,icon-only 时保留 accessible name。
- 描述、次要文本和元数据按规则隐藏或折叠。
- modal、drawer、FAB 和 toast 不遮挡唯一操作路径。

### 检查方法

1. 对每个 route 逐视口截图。
2. 检查 `document.documentElement.scrollWidth`。
3. 检查可交互元素的中心点是否在视口内且不被遮挡。
4. 用窄视口完成搜索、创建、打开详情、返回和提交。

## 6. Design tokens 与 computed style

### 必须通过

- 颜色、字号、行高、间距、圆角、边框、阴影和动效来自模板 token 或已确认规则。
- 没有散落的 arbitrary value,除非模板明确允许。
- 字号阶梯数量不超过模板限制。
- 文字灰度层级不超过模板限制。
- 数字、计数和编号使用模板要求的等宽数字或 tabular figures。
- 双主题下 token 名一致,弱化方向按主题反转。
- 自定义 utility 不会被 class merger 意外移除。

### 检查方法

对以下元素读取 `getComputedStyle`:body、页面标题、导航项、次要说明、按钮、输入框、卡片标题、表格头、徽章、指标数字、dialog 标题和说明。

记录:

```text
| Element | Template token | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
```

### Tailwind/class merger 反例

在 Tailwind + `tailwind-merge` 项目中,自定义类如果使用与框架冲突的命名空间,可能在合并时被移除。例如 `text-body` 可能被 `text-foreground` 或 `text-muted-foreground` 覆盖。验收时必须读取最终 DOM class 和 computed style,不能只看源码字符串。

缓解方式:

1. 为 class merger 配置自定义 class group。
2. 将字号 utility 改为不冲突的命名,例如 `font-body`。
3. 在 review 中批量比对 expected 与 actual。

## 7. 交互状态

### 必查状态

| 状态 | 检查点 |
| --- | --- |
| default | 层级、尺寸、颜色、图标和文本对齐 |
| hover | 底色或前景变化不破坏布局,触屏设备有等效操作 |
| focus-visible | 焦点环可见且不裁剪 |
| active | 反馈不过度移动布局 |
| selected | 有非颜色信号,URL 状态一致 |
| disabled | 原因可理解,不误导为可点击 |
| loading | 结构骨架或局部进度,不丢失上下文 |
| error | 文案、重试、焦点和辅助技术公告明确 |
| empty | 解释原因并提供下一步 |
| dragging | 拖拽反馈清晰,键盘/菜单有替代方案 |

### 页面级状态

至少验证 loading、empty、error、unauthorized、not found。项目声明支持 offline 时也要验证。

## 8. 内容与信息架构

### 必须通过

- 页面标题、面包屑、文档标题和导航语义一致。
- 主要动作位置稳定。
- 空态说明原因并提供下一步。
- 错误态说明能否重试和如何重试。
- 危险操作有确认。
- 截断文本有 tooltip 或展开方式;关键信息不能只存在于被截断区域。
- 时间、计数、编号格式一致。

## 9. 工程质量

### 必须通过

- 新文件符合目录契约。
- 跨域 primitives 与业务组件边界清晰。
- API、mock、类型和 UI 组件之间有明确边界。
- 没有复制粘贴造成的不一致状态处理。
- 项目已有静态检查和测试时全部通过。
- 项目没有检查框架时,在交付说明中明确“未运行,因为项目未配置”,不得编造命令。

## 10. 最低验收清单

交付前逐项确认:

- [ ] 所有 route entry 是真实 link,当前项语义正确。
- [ ] URL 刷新、前进、后退和无效参数行为符合约定。
- [ ] Accessibility tree 中所有可见交互控件有正确 role 和 name。
- [ ] icon-only 控件没有空 accessible name。
- [ ] 没有 interactive element 嵌套。
- [ ] 键盘能完成关键流程,焦点可见。
- [ ] dialog/drawer 焦点进入、关闭并返回。
- [ ] 状态不只靠颜色表达。
- [ ] 根容器不滚动,滚动归属符合模板。
- [ ] 文档流无阴影;阴影只在浮层。
- [ ] desktop、compact、mobile 三个视口无意外横向滚动。
- [ ] loading、empty、error、unauthorized、not found 状态已实现。
- [ ] computed style 与模板 token 一致。
- [ ] 控制台无未处理错误。
- [ ] 双主题下颜色、层级和对比度满足要求。
- [ ] 构建、静态检查和已有测试通过,或明确说明项目未配置。
- [ ] review 的 P0/P1 已修复或经用户明确接受。
- [ ] 模板反馈决定已执行或记录。
