# workbench-shell · Quality & Acceptance

本文定义 workbench-shell 消费项目的最低质量验收。通用规则见 `skills/ui-template/references/quality-gates.md`;本文补充 workbench 的页面模式、chrome 常量、token 和状态矩阵。

`../spec.md` 仍是设计规则唯一入口。若本文与 `spec.md` 数值或行为冲突,以 `spec.md` 为准。

## 1. 质量分层

| 层级 | 检查目标 | 证据 |
| --- | --- | --- |
| Engineering | type check、lint、unit/component test | 命令与结果 |
| Visual | 布局、密度、颜色、分割线、阴影 | 截图 + computed style |
| Accessibility | keyboard、AX name、focus、对比度、语义 | AX 摘要 + 键盘路径 |
| Responsive | desktop、compact、mobile 行为 | 三视口截图 |
| State | loading、empty、error、not found、saving | 状态截图或 trace |
| Navigation | route link、URL state、history、deep link | URL 记录 |
| Review | 模板一致性与体验缺陷 | findings/re-check 表 |

没有工程检查框架时必须明确说明“项目未配置”,不得编造命令。

## 2. 浏览器视口矩阵

最低验证三档:

| Viewport | 目的 |
| --- | --- |
| 1440×900 | 桌面密度、完整工具栏、双栏、网格、图表 |
| 900×900 | compact 断点、触发器、单栏降级、中间宽度 |
| 390×844 或 480×900 | mobile 降级、触达性、icon-only 动作 |

若消费项目明确支持更大桌面工作台,可增加 1920×1080;若只面向 web mobile shell,也仍需验证 compact。

### Shell 检查

| Platform path | ≥1024 | 768–1023 | <768 |
| --- | --- | --- | --- |
| web | 常驻浮岛侧栏 | 页头触发器 + 覆盖抽屉 | 页头触发器/返回钮 + 覆盖抽屉 |
| mobile | 覆盖抽屉 | 覆盖抽屉 | 覆盖抽屉,路由后关闭 |
| desktop | 48px 顶行 + 贴缘侧栏 | 同左 | 同左 |

检查:

- [ ] `document.documentElement` 不出现整页滚动。
- [ ] 根容器高度使用 `100svh` 或等效动态视口。
- [ ] 滚动只发生在 sidebar scroll area、content column、list、detail、board column 或 chart container。
- [ ] web `<1024` 能打开导航;drawer 内选择 route 后关闭。
- [ ] desktop 宽度变化不改变顶行和贴缘侧栏。
- [ ] canvas radius、border、8px 呼吸边符合模板。

## 3. Chrome 几何检查

对每个 included route 采样:

| 检查 | 期望 |
| --- | --- |
| PageHeader height | 48px |
| Toolbar height | 48px |
| Page left gutter | 16px |
| Header/content left alignment | 三条线对齐 |
| Header border | 1px solid token |
| Header title truncation | 不挤压 action |
| Header description | <768 隐藏 |
| Header icon | 16px,弱化色 |
| Count | caption size + tabular figures |

### 三种页头

#### 集合页头

- 图标 + 14px 标题 + 计数 + 描述 + 右侧动作。
- 空态、加载态和错误态的 header 结构稳定。

#### 面包屑页头

- `nav[aria-label="面包屑"]`。
- 祖先 crumb 是 link。
- 叶子不是 link/button。
- 页面仍有明确 heading 语义。

#### 简单页头

- 图标 + 标题,或标题 + 右侧创建动作。
- 不因缺少描述而改变 header 高度。

## 4. 页面模式验收

### 模式 A — 列表/集合

- [ ] PageHeader/Toolbar 48px。
- [ ] 列表内部滚动,不推动 chrome。
- [ ] 筛选、排序、分页刷新后恢复。
- [ ] 表头 scope/sort 状态可读。
- [ ] row selection 与 row open 分离。
- [ ] loading skeleton 与最终行高一致。
- [ ] empty 态说明下一步。
- [ ] error 态保留筛选并提供 retry。
- [ ] invalid page/filter 有安全默认或明确提示。

### 模式 B — 主从双栏

- [ ] 列表列默认 320px,min 240,max 480。
- [ ] 宽度按像素持久化。
- [ ] 详情面板至少 40%。
- [ ] `?id=` 刷新后恢复选中。
- [ ] compact 切换单栏。
- [ ] 详情态返回列表后原选中仍高亮。
- [ ] 无选中显示居中空态,不渲染残缺表单。
- [ ] 状态横幅位于输入区上方且只显示最高优先级。

### 模式 C — 文档详情

- [ ] 面包屑祖先是 link。
- [ ] 主列内层 max-width 896px 居中。
- [ ] 属性栏 320px。
- [ ] `<768` 属性栏隐藏,属性操作有替代路径。
- [ ] 主列底部预留 FAB 安全区。
- [ ] 无效 id/not found 使用统一空态。
- [ ] 活动流、评论或时间线键盘可读。

### 模式 D — 设置页

- [ ] desktop 左列 224px。
- [ ] 内容列 max-width 768px。
- [ ] 页签按帐户/空间分组。
- [ ] `<768` 页签横向滚动。
- [ ] 每个页签有 accessible name。
- [ ] `?tab=` 刷新恢复。
- [ ] 保存中、成功、失败、未保存提醒明确。

### 模式 E — 聚合网格

- [ ] 网格响应式,无意外横向滚动。
- [ ] 卡片 8px 圆角、1px border、hover surface。
- [ ] 文档流卡片无阴影。
- [ ] 图表有文本摘要或表格替代。
- [ ] metric 数值使用 tabular figures 和模板允许字号。
- [ ] empty/error 不与“没有数据”混为一谈。

## 5. 可访问性矩阵

### 键盘

| 流程 | 必须通过 |
| --- | --- |
| Sidebar navigation | Tab/Shift+Tab 可达,Enter 打开,当前项可读 |
| List | 筛选、排序、行选择、行打开、分页可键盘完成 |
| Master-detail | 选择、进入详情、返回、关闭输入区 |
| Dialog | 打开、Tab/Shift+Tab、Esc、取消、提交 |
| Board | 打开、移动(至少菜单/键盘替代)、取消拖拽 |
| Settings | 页签切换、表单、保存、取消 |

### Name/role/value

| 控件 | 要求 |
| --- | --- |
| route link | `<a href>` + 当前项 `aria-current="page"` |
| icon-only button | 非空 accessible name |
| tab | tablist/tab/tabpanel 关系 |
| checkbox | label + checked/indeterminate |
| switch | role/checked + 状态文字 |
| select/combobox | expanded、selected、option 可读 |
| dialog | labelledby/describedby,焦点管理 |
| progress | label/value 或 indeterminate 语义 |
| toast | status/alert + action 可达 |

### Nested interactive

明确禁止:

- 行 `<button>` 内嵌 checkbox/link。
- 面包屑叶子包成 button。
- SVG `onClick` 当独立操作。
- card 整体 button 内再嵌 menu。

正确方式:

1. 行容器用 `<div>`/`<tr>`。
2. 行标题使用 link,checkbox 独立。
3. 卡片主操作和次级菜单分离。
4. 删除/取消置顶使用真实 button。

### 对比度

- 正文 ≥4.5:1。
- 大文本按 WCAG AA 规则判断。
- disabled 不作为达标理由;可用状态下必须达标。
- 状态 tint 面积大时,前景与文字仍需达标。
- 焦点环与相邻背景/边框可区分。

## 6. Computed style 检查

### 九档字号

| Token | Expected |
| --- | --- |
| micro | 11px / 15px |
| caption | 12px / 16px |
| label | 13px / 18px |
| body | 14px / 20px |
| body-lg | 15px / 22px |
| title-sm | 16px / 24px |
| title | 18px / 28px |
| title-lg | 20px / 28px |
| display-sm | 24px / 32px |

采样:

| 元素 | 期望 token |
| --- | --- |
| sidebar nav row | body |
| page header title | body |
| page description | caption |
| group label | micro |
| shortcut key | micro |
| card summary | caption |
| table header | caption |
| metric value | display-sm |
| dialog title | title-sm |
| dialog description | caption |

对每个采样记录:

```text
| Element | Expected | Actual fontSize | Actual lineHeight | Final classes | Result |
| --- | --- | --- | --- | --- | --- |
```

重点检查 Tailwind/class merger:自定义 token 写在源码中不代表最终 DOM 保留。若 `font-body`/`text-body` 被移除,实际会回落到 16px。

### 颜色与灰度

- 文字只使用前景、muted、faint 三级,另有品牌/状态色。
- 品牌色只用于未读点、激活态、主按钮、进行中状态。
- hover、selected、border、surface 来自 token。
- dark theme 下弱化方向反转,token 名不变。

### 边界与阴影

- 分割线是 `1px solid border token`,不是阴影。
- 文档流卡片无 `box-shadow`。
- drawer/dialog/popover/toast 才允许 float shadow。
- focus ring 不被裁剪。

### 密度与圆角

| 检查 | 期望 |
| --- | --- |
| Sidebar nav row | 28–32px |
| Card padding/radius | 12px / 8px |
| Canvas radius | 14px |
| Icon | 标准 16px;列表小图标 14px |
| Avatar | 行内 20px,详情 32–40px |
| Gutter | 16px |

## 7. 状态矩阵

### 页面状态

| 状态 | 必须验证 |
| --- | --- |
| loading | skeleton 形状匹配最终布局,高度不跳 |
| empty | 解释空原因,提供下一步 |
| filtered empty | 与“完全没有数据”区分,提供清除筛选 |
| error | 保留上下文,提供 retry |
| unauthorized | 解释权限,不渲染假表单 |
| forbidden | 与 unauthorized 明确区分(如适用) |
| not found | 用于无效 id/route/tab |
| offline | 如适用,固定横幅并禁用不可用操作 |

### 操作状态

| 状态 | 要求 |
| --- | --- |
| saving | 按钮禁用/局部 progress,防止重复提交 |
| success | toast/inline feedback,更新列表或计数 |
| save error | 保留输入,提供 retry,焦点或提示可达 |
| deleting | confirm -> pending -> 成功/失败 |
| moving board card | dragging、drop target、saving、error rollback |
| inviting member | validation、pending、success、duplicate/conflict |
| testing integration | pending、success、failure 不覆盖配置 |
| refreshing | 保留旧数据或显示局部 skeleton,不闪白 |

### 路由状态

| 场景 | 期望 |
| --- | --- |
| refresh | id/tab/view/filter/page 恢复 |
| back/forward | 内容、选中、高亮一致 |
| copy URL | 新标签页获得相同可见状态 |
| invalid enum | 默认值或映射值 |
| deleted entity | not found/empty,不残留操作 |
| one-time intent | 消费后从 URL 删除 |

## 8. 全局系统验收

- [ ] 全局搜索可从任意页面打开。
- [ ] 搜索 loading、empty、error、分组结果、Enter 打开。
- [ ] 搜索结果目的地真实可见;不出现 URL 变化但页面无反馈。
- [ ] 创建入口按钮和快捷键可用;输入聚焦时快捷键失效。
- [ ] 创建失败保留表单。
- [ ] 确认框保护危险操作。
- [ ] Toast 可关闭,不遮挡关键操作。
- [ ] 快捷键帮助列出全局键。
- [ ] FAB 不遮挡最后一个可操作项或输入区。
- [ ] 路由/异步进度不替代结构骨架。

## 9. 主题验收

若项目支持双主题:

### Light

检查 background、sidebar、surface、surface-hover、selected、border、muted text、brand、status tint。

### Dark

检查同一组 token 名:

- 弱化方向反转。
- 状态 tint 保持可读。
- divider 使用透明 border token,而不是硬编码灰。
- float shadow 有 dark 等效。

### 禁止

- 组件内硬编码 `#fff`、`#000`、`gray-500` 之类的非 token 值。
- dark mode 中沿用 light shadow 不调整。
- 状态只用红色/绿色区分。

## 10. 工程验收

### React + Vite + Tailwind + shadcn 默认栈

至少运行:

```bash
pnpm build
pnpm lint
pnpm test
```

命令名可随项目调整,但必须真实存在于项目 scripts。没有配置时记录“未配置”,不要臆造。

### 最低工程检查

- [ ] TypeScript build 通过。
- [ ] 静态检查无 error。
- [ ] unit/component tests 通过。
- [ ] 新文件符合目录契约。
- [ ] shared UI 不包含 API 调用。
- [ ] feature 组件没有被提前提升。
- [ ] mock/API 边界清晰。

## 11. 交付前证据包

每个交付应能复查:

```text
## Workbench Acceptance Evidence

### Build
- command:
- result:

### Browser matrix
| Page | Viewport | State | Screenshot/Trace | Result |
| --- | --- | --- | --- | --- |

### Accessibility
| Page | Keyboard path | AX findings | Result |
| --- | --- | --- | --- |

### Computed style
| Element | Expected | Actual | Result |
| --- | --- | --- | --- |

### URL state
| Page | Action | URL before | URL after | Result |
| --- | --- | --- | --- | --- |

### Review
| Area | Finding | Severity | Fix | Re-check |
| --- | --- | --- | --- | --- |
```

证据要求:

1. 每个页面至少一组 desktop 截图。
2. compact/mobile 可按模式抽查,但 included 页面至少一种窄屏证据。
3. loading、empty、error、not found 必须有证据。
4. computed style 至少覆盖第 6 节采样。
5. console 记录空结果或错误清单。
6. P0/P1 必须有修复后复验。

## 12. 常见失败模式

| 症状 | 根因 | 处理 |
| --- | --- | --- |
| 整页出现滚动条 | 根容器没锁高或内容面板没 `min-height:0` | 修正 flex/min-height/overflow 链 |
| 侧栏文字 16px | token 被 class merger 移除 | 检查 final class,改用 `font-*` 或配置 merge |
| 面包屑不可键盘识别为 link | 用 button 实现 | 改为 `<a href>` |
| 窄屏 tab 无名称 | 文本用 `hidden` 只留 icon | 改用 `sr-only`/`aria-label`,或保持短文本 |
| 列表 checkbox 点击异常 | checkbox 嵌在行 button 内 | 拆分 selection 与 open target |
| URL id 无反馈 | 目标页不消费 id | 定义详情/选中消费逻辑,或移除参数 |
| 无效路由回到首页 | 缺少 not found | 使用统一空态 |
| 卡片有阴影 | 误用 shadow 表达文档流层级 | 改 surface/border/hover |
| Drawer 关闭后焦点丢失 | 没保存触发器 | focus return |
| dark mode 分割线消失 | 硬编码 light border | 使用主题 border token |
