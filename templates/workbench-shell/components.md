# workbench-shell · Component Inventory

本文定义 workbench-shell 落地时必须覆盖的核心组件契约(设计层,不含技术栈映射)。每个条目回答:语义元素是什么、有哪些 variants、尺寸、状态、键盘与辅助技术行为、在 workbench 中如何使用。

视觉值以 [`spec.md`](spec.md) 与 [`tokens.yaml`](tokens.yaml) 为准;本文不重复色值和密度表。

## 1. Inventory 字段

每个组件条目使用以下字段:

```text
名称 / 用途:
semantic element:
variants & sizes:
states:
keyboard & AT:
workbench usage:
```

## 2. 通用状态

除非条目另有说明,每个交互组件至少检查:

| 状态 | 要求 |
| --- | --- |
| default | 尺寸、层级、图标与文本符合模板 |
| hover | 使用底色或前景变化,不移动布局 |
| focus-visible | 焦点环可见、不裁剪、亮暗主题均可读 |
| active | 反馈明确但不造成大位移 |
| disabled | 不触发动作、原因可理解、不误导辅助技术 |
| loading | 保留尺寸和上下文,使用局部进度或结构骨架 |
| selected | 有文字、图标、边框、背景等非颜色信号,并与 URL 一致 |
| error | 有错误文本、图标或辅助公告,不只变红 |

## 3. Shell 与导航

### AppShell

```text
用途:            100svh 应用底色 + 侧栏 + 圆角画布卡片
semantic element:<div> + <main>
variants:        web / mobile / desktop platform path
states:          normal;compact/mobile 收起常驻体;drawer open
keyboard & AT:   <main> 可达;drawer 使用 dialog 语义;overlay 不盖侧栏
usage:           所有 route 的根外壳
```

要求:

- 根容器 `overflow: hidden`;滚动只发生在侧栏滚动区和内容列。
- 文档流不使用阴影。
- 全局 overlay 挂在画布卡片内,不盖侧栏。

### Sidebar

```text
用途:            工作区、搜索、创建、导航、置顶、帮助
semantic element:<nav> + <a> + 必要的 <button>
variants:        web floating;desktop edge;mobile drawer;collapsed rail
states:          normal、scrolling、collapsed、drawer open
keyboard & AT:   导航项是 link;当前项 aria-current="page";组标题不是可点控件
usage:           App Shell 左侧导航
```

要求:

- 当前项高亮同时有背景和 `aria-current="page"`。
- 前缀匹配、置顶严格相等和激活压制按 `spec.md` 实现。
- 侧栏滚动区有渐隐遮罩和稳定滚动条。

### WorkspaceSwitcher

```text
用途:            展示当前工作区,切换到其他工作区
semantic element:<button aria-haspopup="menu"> + menu/listbox
variants:        expanded、collapsed rail、其他空间有未读品牌点
states:          default、open、selected、loading、error
keyboard & AT:   Enter/Space 打开,方向键选择,Esc 关闭;当前工作区有 selected 状态
usage:           Sidebar 顶部
```

要求:

- icon-only 形态必须有 accessible name。
- 切换后数据上下文刷新;需要深链时工作区进入 URL。
- 其他空间的未读/邀请用品牌点 + 可读文本或 tooltip。

### NavLink

```text
用途:            侧栏路由入口
semantic element:<a href>
variants:        expanded row、collapsed icon rail、count badge
states:          default、hover、focus-visible、current、disabled(如有)
keyboard & AT:   真实链接;当前项 aria-current="page";计数有可读文本
usage:           收件箱、事件、服务、值班、分析、设置等入口
```

禁止使用没有 `href` 的 button 执行 route navigation。

### PinnedGroup / PinnedItem

```text
用途:            置顶实体快速入口
semantic element:group header <button aria-expanded> + item <a href>
variants:        expanded/collapsed、normal/active
states:          open/closed、hover、focus-visible、active、removable
keyboard & AT:   折叠组可键盘操作;取消置顶是独立 button,不能只挂 SVG onClick
usage:           Sidebar 置顶事件/条目
```

### Drawer

```text
用途:            compact/mobile/web 窄视口导航
semantic element:<div role="dialog" aria-modal="true" aria-label="导航">
variants:        left overlay drawer
states:          closed、opening、open、closing
keyboard & AT:   焦点进入,Esc 关闭,焦点返回触发器;路由跳转后自动关闭
usage:           web <1024 与 mobile platform
```

### Collapse control

```text
用途:            侧栏常驻体与 icon rail 切换
semantic element:<button aria-expanded aria-controls>
variants:        sidebar 内按钮、desktop 顶行按钮
states:          expanded、collapsed、hover、focus-visible
keyboard & AT:   名称必须包含“展开/收起导航”语义;状态不只靠图标方向
usage:           侧栏折叠
```

### Resize control

```text
用途:            拖拽调整侧栏或详情列宽
semantic element:<div role="separator" aria-orientation="vertical" tabindex="0">
variants:        sidebar resize、detail column resize
states:          idle、hover、dragging、keyboard active
keyboard & AT:   左右方向键调整;`aria-valuenow`/`aria-valuetext` 表达宽度;拖拽有文本替代
usage:           Sidebar 与模式 B 详情列
```

## 4. 页面 chrome

### PageHeader

```text
用途:            集合页头、面包屑页头、简单页头
semantic element:<header> + 标题语义
variants:        collection、breadcrumb、simple
states:          normal、compact/mobile action collapse、truncation
keyboard & AT:   页面有明确 heading;动作顺序稳定;描述隐藏不影响语义
usage:           所有 route 顶部
```

### Breadcrumb

```text
用途:            容器层级导航
semantic element:<nav aria-label="面包屑"> + <ol> + 祖先 <a href> + 当前叶子文本
variants:        two-level、multi-level、truncated
states:          ancestor hover/focus、current、overflow collapsed
keyboard & AT:   祖先是 link;叶子不是 link;截断层级有展开方式
usage:           模式 C 与深层实体
```

### Toolbar

```text
用途:            搜索、筛选、排序、视图切换、创建
semantic element:<div role="toolbar"> 或带分组 label 的容器
variants:        table toolbar、board toolbar、calendar toolbar
states:          normal、filters active、bulk selection active、loading
keyboard & AT:   控件顺序稳定;分组有 label;active filter 有清除入口
usage:           模式 A/E
```

### FAB

```text
用途:            右下角主创建/主操作
semantic element:<button> 或 <a href>
variants:        primary icon、icon+text
states:          default、hover、focus-visible、disabled、loading、safe-area shifted
keyboard & AT:   有非空 accessible name;不遮挡最后一个可操作元素
usage:           详情、列表或全局创建
```

### RouteProgress / AsyncProgress

```text
用途:            路由或长异步操作进度
semantic element:<div role="progressbar" aria-label> 或局部 skeleton
variants:        top progress、inline skeleton、button loading
states:          idle、indeterminate、determinate、error
keyboard & AT:   有可读 label;不把无结构 spinner 当唯一反馈
usage:           路由切换、保存、导入、图表加载
```

### ErrorBanner

```text
用途:            权限、归档、离线、保存失败等高优先级提示
semantic element:<div role="status"> 或 <div role="alert">
variants:        inline、sticky above input、page-level
states:            info、warning、error、offline、retrying
keyboard & AT:     retry 可聚焦;优先级栈只显示一条;状态有文字
usage:             模式 B、详情、设置
```

## 5. 表单与选择

### Button

```text
用途:            命令型动作:提交、打开、取消、删除、重试
semantic element:<button type="button|submit">
variants:        primary、outline、ghost、secondary、destructive、link
sizes:           xs、sm、default、icon-xs、icon-sm、icon
states:          default、hover、focus-visible、active、disabled、loading、destructive pending
keyboard & AT:   Enter/Space;loading 期间禁用或防止重复提交;icon-only 有 name
usage:           页面动作、表单提交、行内操作
```

路由跳转不使用 Button;使用 NavLink/Breadcrumb link。

### IconButton

```text
用途:            紧凑动作
semantic element:<button> + <span class="sr-only"> 或 aria-label
variants:        ghost、outline、destructive
sizes:           icon-xs、icon-sm、icon
states:          default、hover、focus-visible、disabled、loading
keyboard & AT:   accessible name 非空;tooltip 不作为唯一 name 来源
usage:           窄屏动作、行内图标操作、弹层关闭
```

### Input

```text
用途:            单行文本、搜索、编号、URL
semantic element:<input>
variants:        text、search、password、with icon、with clear
states:          default、hover、focus-visible、filled、disabled、readonly、error
keyboard & AT:   label 关联;error 用 aria-describedby;search 有 clear 操作
usage:           筛选、设置表单、创建表单
```

### Textarea

```text
用途:            描述、评论、富文本输入的纯文本基础
semantic element:<textarea>
variants:        fixed rows、auto-grow
states:          default、focus-visible、disabled、readonly、error、saving
keyboard & AT:   label 与描述关联;字数/校验信息可读
usage:           事件描述、评论、通知模板
```

### Select

```text
用途:            单选枚举
semantic element:<button role="combobox" aria-expanded> + listbox/option
variants:        default、with placeholder、compact、error
states:          closed、open、focused、selected、disabled、loading options、error
keyboard & AT:   Enter/Space 打开,方向键移动,Enter 选择,Esc 关闭;选中项有 aria-selected
usage:           状态、严重级别、负责人、时区、集成类型
```

### Combobox

```text
用途:            可搜索选择、多选、可创建选项
semantic element:<input role="combobox"> + listbox + option
variants:        single、multi、creatable、async
states:            empty、typing、loading、no result、selected chips、error
keyboard & AT:     方向键、Enter、Backspace 删除 chip、Esc;结果数量可读
usage:             指派人、参与团队、关联变更、标签
```

### Checkbox

```text
用途:            单项选择、批量选择、开关式确认
semantic element:<input type="checkbox"> + <label>,或 role="checkbox"
variants:          default、indeterminate、compact row
states:            unchecked、checked、indeterminate、disabled、error
keyboard & AT:     Space 切换;有可读 label;批量表头说明作用范围
usage:             表格行选择、收件箱批量操作、设置
```

禁止把 Checkbox 嵌入整行 `<button>`。

### Switch

```text
用途:            即时启用/关闭
semantic element:<button role="switch" aria-checked> 或 checkbox
variants:        compact、with description
states:          on、off、disabled、saving、save error
keyboard & AT:   Space 切换;状态有文字;保存失败回滚并提示
usage:           通知规则、集成启用、偏好
```

### DatePicker / DateTimePicker

```text
用途:            发生时间、计划时间、筛选范围
semantic element:<input type="date|datetime-local"> 或 grid dialog
variants:        single date、datetime、range
states:          empty、invalid、disabled、open、selected range、error
keyboard & AT:   支持键入与网格导航;格式和时区可见;错误信息关联字段
usage:           事件时间、值班班次、筛选
```

## 6. 数据展示

### Badge

```text
用途:            状态、严重级别、标签、计数
semantic element:<span> 或 <a href>
variants:        solid、outline、status tint
states:          default、hover(仅 link)、focus-visible(仅 link)、selected
keyboard & AT:   状态有文字;颜色不是唯一信号
usage:           P0/P1、open/resolved、service status
```

### Table

```text
用途:            结构化列表
semantic element:<table> + <caption/sr-only> + <thead> + <tbody> + <th scope>
variants:        sortable、selectable、sticky header、compact
states:          loading skeleton、empty、error、row hover、row selected、sort active
keyboard & AT:   表头控件可聚焦且说明当前排序;行选择与打开分离;scope 正确
usage:           事件列表、规则列表、成员列表
```

窄屏可横向滚动、优先列或卡片化;不能让关键操作不可达。

### Pagination

```text
用途:            分页或游标导航
semantic element:<nav aria-label="分页"> + <a href> 或 <button>
variants:        numbered、prev/next、cursor
states:          first、last、current、disabled、loading
keyboard & AT:   当前页有 aria-current="page";页码状态可读
usage:           事件列表、表格
```

### KanbanColumn

```text
用途:            状态列容器
semantic element:<section aria-labelledby>
variants:        status tint、collapsed、drag target
states:          empty、loading、drag-over、drop accepted/rejected、error
keyboard & AT:   列有名称和计数;移动卡片提供菜单/键盘替代;拖拽状态有文字
usage:           事件看板
```

### KanbanCard

```text
用途:            看板实体卡
semantic element:<article> + 明确的打开 link/button + move control
variants:        normal、selected、dragging、drop placeholder
states:          hover、focus-visible、selected、dragging、saving move、error
keyboard & AT:   打开和移动是独立操作;拖拽有键盘/菜单替代;状态徽章有文字
usage:           事件看板卡片
```

### ServiceCard

```text
用途:            服务健康与归属摘要
semantic element:<article> + header link/button
variants:        compact、detailed
states:          hover、focus-visible、selected、loading、error
keyboard & AT:   名称可访问;状态有文字;负责人头像有名称文本或 tooltip + sr-only
usage:           服务目录
```

### CalendarCard

```text
用途:            值班/日程卡
semantic element:<article> + <time>
variants:        compact、detailed、all-day、timed
states:          hover、focus-visible、selected、conflict、loading
keyboard & AT:   时间用 <time datetime>;冲突有文字;编辑入口键盘可达
usage:           值班日历
```

### MetricCard

```text
用途:            汇总指标
semantic element:<article> + 数值文本 + <dl> 可选
variants:        neutral、warning、success、danger
states:          loading skeleton、error、refreshing、trend up/down
keyboard & AT:   指标名、值、时间范围可读;趋势不只靠颜色/箭头
usage:           交付分析
```

### TrendChart / ChartContainer

```text
用途:            趋势、分布、排行
semantic element:<figure> + <figcaption> + SVG/canvas/table fallback
variants:        line、bar、donut、rank list
states:          loading、empty、partial data、error、focused data point
keyboard & AT:   图表有文本摘要或表格替代;series不只靠颜色;数据点可读
usage:           交付分析
```

### Avatar

```text
用途:            成员、服务、工作区标识
semantic element:<span> 或 <img alt="">
variants:        20px row、32–40px detail、stacked group
states:          loading、fallback initial、disabled、stack overflow
keyboard & AT:   有可读名称;纯装饰时 img alt="" 且容器提供名称
usage:           负责人、参与人、成员列表
```

### Skeleton

```text
用途:            结构化加载占位
semantic element:<div aria-hidden="true"> + 容器 aria-busy
variants:        table row、card、chart、sidebar row、detail block
states:            loading、loaded
keyboard & AT:   最终布局形状与 skeleton 相同;容器有 loading 文本或 aria-busy
usage:           列表、看板、图表、详情
```

### EmptyState

```text
用途:            空数据、无结果、无权限、404
semantic element:<section aria-labelledby>
variants:            neutral、warning、danger、with action、without action
states:            initial empty、filtered empty、not found、unauthorized
keyboard & AT:   标题、描述、动作可读可操作;描述宽度符合模板
usage:           所有页面模式
```

## 7. 浮层与反馈

### Dialog

```text
用途:            需要上下文的表单或详情
semantic element:<div role="dialog" aria-modal="true" aria-labelledby aria-describedby>
variants:            form、detail、wide、compact
states:            opening、open、saving、error、closing
keyboard & AT:     打开焦点进入,Tab 循环,Esc 关闭,关闭后焦点返回
usage:           创建事件、编辑规则、详情侧弹层
```

### ConfirmDialog

```text
用途:            危险操作确认
semantic element:<div role="alertdialog" aria-modal="true">
variants:            delete、disable、bulk action
states:            open、confirming、error
keyboard & AT:     默认焦点在安全按钮;按钮文本说明后果;Esc=取消
usage:           删除规则、移除成员、批量关闭
```

### SearchPalette

```text
用途:            全局搜索/命令入口
semantic element:<div role="dialog"> + input + listbox/option
variants:            all results、typed filter
states:            empty prompt、loading、no result、error、selected、opening result
keyboard & AT:     ⌘K/Ctrl+K 打开;上下选择;Enter 打开;Esc 关闭;结果有分组与描述
usage:           全局搜索
```

搜索结果目的地必须是真实 route link 或使用等价可导航语义;打开后详情必须可见。

### Toast

```text
用途:            操作成功/失败提醒
semantic element:<div role="status"> 或 <div role="alert">
variants:            success、warning、error、with action
states:            entering、visible、leaving、action loading、dismissed
keyboard & AT:     错误用 alert;操作按钮可聚焦;不遮挡关键操作;可关闭
usage:           保存、移动、邀请、测试集成
```

### Menu

```text
用途:            行操作、卡片操作、工作区切换
semantic element:<button aria-haspopup="menu"> + <div role="menu"> + <div role="menuitem">
variants:            icon trigger、text trigger、nested group
states:            closed、open、focused item、disabled item、danger item
keyboard & AT:     方向键移动,Enter 执行,Esc 关闭;危险项有文字
usage:           卡片菜单、行菜单、workspace switcher
```

### Tooltip

```text
用途:            补充说明,不承载唯一关键信息
semantic element:trigger + <div role="tooltip">
variants:            top、right、bottom、left
states:            hidden、delayed show、focus show、touch fallback
keyboard & AT:     focus 显示;accessible name 不依赖 tooltip;触屏有替代
usage:           icon 按钮、截断文本、图表 series
```

### ShortcutHelp

```text
用途:            快捷键说明
semantic element:<div role="dialog" aria-labelledby>
variants:            global、page-specific
states:            open、closing
keyboard & AT:     键帽有可读文本;说明输入框聚焦时哪些快捷键失效
usage:           全局帮助入口
```

## 8. 组件检查清单

- [ ] 每个 icon-only 控件有非空 accessible name。
- [ ] tabs 有 tablist/tab/tabpanel 关系和键盘方向键。
- [ ] checkbox 有 label;批量选择说明作用范围。
- [ ] dialog 有 labelledby/describedby、焦点进入与返回。
- [ ] table 使用正确表头 scope,排序状态可读。
- [ ] 看板卡片除拖拽外有键盘/菜单替代。
- [ ] 图表有文字摘要或表格替代,series 不只靠颜色。
- [ ] 状态徽章有状态文字。
- [ ] tooltip 不是 accessible name 的唯一来源。
- [ ] 自定义 utility 在 class merger 后仍然生效。
