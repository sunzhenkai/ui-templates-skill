# workbench-shell 设计规范

> 中性浅暗双主题的工作台 App Shell：外壳安静、画布承载内容、紧凑 14px 界面、1px 分区分隔、蓝色品牌色克制出现。

- 来源：repo + https://github.com/multica-ai/multica @ 879d0de9166261c26ec35b69f5cec9382191eda1
- 采集日期：2026-09-03
- 佐证截图：无（本次从源码 token 与组件实现提取；`coverage.visual_reference: false`）
- 精确值：见 [tokens.yaml](tokens.yaml)；颜色保留来源的 `oklch()` / 半透明值，字体、字号、间距、圆角与阴影来自源码。
- 布局模式：见 [routes-and-layouts.md](routes-and-layouts.md)。
- 组件契约：见 [components.md](components.md)。
- 平台外壳差异：见 [platforms/web.md](platforms/web.md)、[platforms/desktop.md](platforms/desktop.md)、[platforms/mobile.md](platforms/mobile.md)。
- 实施顺序与验收：见 [apply/playbook.md](apply/playbook.md) 与 [apply/quality.md](apply/quality.md)。

## 0. 不可协商规则（Non-negotiables）

1. 桌面 Web / Desktop 根壳锁定视口高度且整页不滚动：内容列、列表、看板、详情与设置面板内部滚动。
2. 表面分四层使用：`app-shell` 是最安静外框，`page-canvas` 是页面画布，`surface` 是有边界内容组，`surface-raised` 是弹层；不得反向混用。
3. 左侧常驻导航默认 256px，可拖拽调整到 200–360px；图标栏为 48px；窄视口的覆盖导航宽 288px。
4. PageHeader 与 Toolbar 均为 48px 高，页左边距统一 16px；页头内容组用 `flex: 1` 推右动作，禁止用 header 自身 `justify-between` 导致标题漂移。
5. 产品界面字号只允许 `tokens.yaml` 的 10 档；触控或窄屏上的可编辑文本渲染到 16px，以避免移动端聚焦缩放。
6. 文本灰度只允许 `foreground` 与 `muted-foreground`；`faint-foreground` 只用于非文本标记、图标和占位符号，禁止用透明度制造第三级正文文字。
7. 常规分区使用 1px token 边框；`surface-shadow` 只给有边界表面，`menu-shadow` 给近距离菜单，`floating-shadow` 给 Dialog / Sheet / 浮动窗口级弹层。
8. `brand` 蓝只用于关键操作、激活强调、未读点、进行中状态与导航进度条；面积保持克制，图表按 brand 派生阶梯表达主次。
9. 必须提供 light / dark 双主题；两套主题角色键一致，暗色中“hover/选中高于表面”的方向反转，但组件语义不变。
10. 跨页导航使用真实链接或等价可打开链接；当前导航项表达激活态；可恢复的过滤、视图、详情与页签状态进入 URL。
11. 全局浮层与浮动作挂在内容画布坐标内；画布右下角为 40px 浮动按钮预留 56px 净空，页脚与最后内容不得被遮挡。
12. 交互控件必须有可见 focus 状态；控件标准 focus 环为 3px，半径继承控件；icon-only 控件必须提供 accessible name。
13. 行响应式与列显隐优先用容器查询；插件面板、主从面板或卡片区不得只根据窗口宽度改变内部列结构。
14. 集合页必须选择列表网格 / 卡片网格 / 看板 / 表格 / 泳道中的一种稳定模式；切换模式不得改变 PageHeader 与 Toolbar 的几何。
15. 骨架屏必须复制最终布局的行高、卡片、表头与列形状；禁止用居中 spinner 替代结构化加载。
16. 行导航不得把 checkbox、菜单、按钮嵌套进同一个交互元素；键盘可达链接放在名称单元格或独立动作上。
17. 窄屏页头动作可退化为 icon-only，但必须保留 accessible label；设置页在窄屏用横向页签、桌面宽度用纵向页签。
18. 动效必须支持 `prefers-reduced-motion: reduce`；进度、导航与浮层过渡在减少动效模式下不得造成滚动或位移干扰。

## 1. 整体风格

- 风格关键词：工作台、中性、紧凑、高信息密度、安静外壳、克制品牌蓝。
- 明暗：双主题；Web 与 Desktop 共享同一套 `oklch()` 中性阶梯，移动端源码另有 HSL 基础主题（见平台差异）。
- 密度：紧凑；控件高度常见 24–32px，页头 / 工具栏 / 表格行 36–48px。
- 圆角倾向：柔和；基准 10px，控件 6–10px，卡片 / 画布 / 弹层 14px，胶囊徽章使用 26px。
- 分区方式：以 1px 边框与表面色阶分区；表面阴影非常轻，弹层才使用明显阴影。

## 2. 配色

精确值见 [`tokens.yaml`](tokens.yaml)。来源颜色使用 `oklch()`；`border`、`input`、scrollbar 与部分状态底色带 alpha，必须在真实表面上合成后检查。角色规则如下：

| 角色 | 依据与用法 |
| --- | --- |
| `app-shell` | 最外层壳与 Desktop 画布外区域；保持低对比。 |
| `page-canvas` / `background` | 页面主画布；列表、看板与聊天内容直接落在其上。 |
| `surface` / `card` | 有边界内容组、卡片与弹层内容。 |
| `surface-raised` / `popover` | Dialog、Sheet、Popover、Menu 与窗口级浮层。 |
| `surface-hover` / `surface-selected` | 悬停浅一档、选中再浅一档；暗色方向为更亮。 |
| `foreground` / `muted-foreground` / `faint-foreground` | 正文、次级文本、非文本弱化标记三级语义。 |
| `primary` | 中性主按钮与默认徽章；亮暗主题中分别接近黑 / 浅灰。 |
| `brand` | 品牌蓝、关键强调、未读点、进行中状态与导航进度。 |
| `success` / `warning` / `info` / `destructive` | 状态语义；危险默认以低饱和底色加文本呈现。 |
| `chart-1` … `chart-5` | 按亮度 / 饱和度递减的 brand 派生阶梯；暗色中主序列最亮。 |

来源对 `muted-foreground` 与 `faint-foreground` 明确做了 WCAG 预检：`muted-foreground` 为 AA 正文下限，`faint-foreground` 只保证非文本 3:1，不得当正文使用。

归一化决策：来源在 light / dark 中都为 `brand` 配近白前景；按 WCAG normal text 计算分别约 3.63:1 与 3.11:1。模板保留来源 brand 色相并做两处 AA 归一：light 将填充用 `brand` 从 L 0.55 降到 L 0.50（`origin: default`）以配来源近白前景；dark 保留更亮的 L 0.65，但前景改为深中性（`origin: default`）。两个默认值均达到 4.5:1；大字号或图形场景仍须按对应 WCAG 规则单独验证。

## 3. 字体

### 3.1 字体族

- 正文 / 标题：`Inter`；Web 使用 next/font 的 Inter 变量，Desktop 使用 `Inter Variable`。通用回退为 `-apple-system, BlinkMacSystemFont, "Segoe UI"`。
- 简体中文 / 韩文回退顺序必须保持 `"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR"`；日文界面提升日文字族，避免汉字字形错误。
- 等宽：`Geist Mono`，回退 `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`；用于计数、标识符、代码与表格数字。
- 标题字体与正文字体一致；onboarding / 营销型标题可使用 `Source Serif 4`，不属于产品工作台默认字体。
- 禁止合成粗体：使用真实字重；CJK 与等宽 fallback 中的斜体由 `font-style` 合成，粗体不得合成。

### 3.2 字号阶梯

| 语义 | size / line-height | 用途 |
| --- | ---: | --- |
| `micro` | 11 / 15 | 计数、徽章、时间戳、overline。 |
| `caption` | 12 / 16 | 辅助文本、表头、密集元数据。 |
| `label` | 13 / 18 | 密集标签、小型控件文本。 |
| `body` | 14 / 20 | 界面主正文字号；页面标题在集合页头也使用该档。 |
| `body-lg` | 15 / 22 | 对话正文、onboarding 长文案。 |
| `title-sm` | 16 / 24 | 卡片 / 弹层标题、小标题。 |
| `title` | 18 / 28 | 区块标题。 |
| `title-lg` | 20 / 28 | 卡片与对话框大标题、设置页标题。 |
| `display-sm` | 24 / 32 | 页面级展示标题。 |
| `display` | 36 / 40 | hero 数字、空态大标题。 |

行高随字号绑定；特殊文本块可覆盖行高，但不得新增字号。字重以 `regular` / `medium` / `semibold` 为主：正文 regular，页头、导航激活、标签与控件文字 medium，设置页标题 semibold。

## 4. 间距与布局

- 间距基数：4px；常用步长为 2、4、6、8、10、12、16、20、24、32、40、48、64。
- 页面几何：PageHeader / Toolbar 48px；左 gutter 16px；Web / Desktop 画布外保留 8px 呼吸边。
- 导航：常驻侧栏组内边距 8px；组标签高 32px；默认菜单项高 32px，紧凑项 28px；菜单项内边距 8px、图标与文字间距 8px。
- 控件：默认按钮 / 输入框高 32px、水平内边距 10px；小按钮 28px；超小按钮 24px；大按钮 36px；图标按钮与同级按钮同高。
- 卡片：默认垂直内边距 16px、水平内边距 16px、内部纵向间距 16px；compact 卡片 12px；页脚有 1px 顶边并使用弱化表面底色。
- 表格 / 网格：源生 table 表头与行高 40px、单元格内边距 8px；列表网格行高 48px、表头 36px、列间距 12px、首尾留出 20px 悬停全幅轨道。
- 浮动作：聊天 FAB 40px，距右下 8px，占位净空 56px；批量操作条等浮动条最后内容额外保留 64px 滚动净空。
- 设置页：内容最大宽度 768px；宽表格 / 属性型设置扩展到 1024px；页边距随断点为 16 / 24 / 32px。

## 5. 组件风格要点

紧凑契约见 [components.md](components.md)。总规则：

- 按钮：主变体是中性实心；outline 用于工具栏；brand / brandSubtle 用于关键激活；ghost 用于低强调；destructive 用低饱和小面积表达。
- 输入框：透明底加 1px `input` 边框；focus 用 3px `ring`；invalid 用 destructive 边框与环；disabled 保持几何并降低透明度。
- 卡片：白 / surface 底、1px surface border、10px 基准圆角外显为 14px 卡片、极轻阴影；页脚以顶边分区。
- 侧栏菜单：32px 高、8px 圆角、hover/active 使用 sidebar accent；激活项只加重背景与 medium 字重，不引入新色。
- 列表网格：一次声明列模板，header/row/skeleton 共用 subgrid；宽容器横向滚动，窄容器退为核心列，不静默隐藏用户开启列。
- 看板 / 泳道：列间 16px、水平滚动、列内卡片纵向滚动；骨架列与实际列同宽。
- Dialog：居中 `surface-raised`，宽 344–408px 起步，14px 圆角、1px ring、floating shadow；页脚顶边分区、动作右对齐。
- Sheet：右侧最多 384px 或 75% 宽，14px 边界，floating shadow；窄侧用覆盖层，路由跳转后关闭。
- Tooltip / Popover：`surface-raised`、1px 边框、近距离菜单阴影；全局 Tooltip 延迟约 500ms、间距 4–10px。
- 空态：居中 48px 圆形图标位、14px 正文标题、12px 弱化描述、可选动作；空 / 错误 / 404 共用结构，只换 tone。
- FAB：40px 圆形 `surface-raised`、1px ring、floating shadow；运行中用 brand 脉冲，不新增外发光尺寸。

## 6. 其他特征

- 阴影：surface 阴影极轻；menu 阴影中低；floating 阴影大而柔和。具体值唯一来源于 `tokens.yaml`。
- 动效：导航进度条为 2px brand 顶边、约 200ms 淡出；侧栏 / 面板宽度过渡约 200–220ms；弹层入场约 100–200ms；运行中状态可用 1.6s 循环脉冲。减少动效时全部降级。
- 图标：线性图标为主，常用 16px；小控件 12–14px；空态 24px。icon-only 必须有 accessible name。
- 滚动条：细滚动条，宽 / 高 6px，thumb 圆角 3px，track 透明；hover 提亮一档。
- 文本：CJK 与拉丁 / 数字之间启用 `text-autospace`；链接使用下划线或 hover 前景色变化，不得只靠颜色承载语义。

## 7. 还原要点

1. 先建立 `app-shell → page-canvas → surface → surface-raised` 四层背景，再放内容；不要让整页直接滚动。
2. 所有页面共用 48px header / toolbar 与 16px 左 gutter；标题、工具栏与正文左线必须对齐。
3. 用 token 边框和轻阴影分区；品牌蓝只出现在需要引导注意的地方。
4. 正文默认 14px / 20px，只从 10 档阶梯取字号；文本灰度只用两级，弱化图标才可用第三级。
5. 弹层用 raised surface、1px 边框、明显但柔和阴影；普通卡片只允许极轻阴影。
6. 状态与可恢复上下文写入 URL；加载、空态、错误态都必须复制真实页面结构。
