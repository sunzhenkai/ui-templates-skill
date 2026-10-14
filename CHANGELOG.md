# Changelog

## 5.3.3 — 2026-10-14

### Changed
- 仓库不再保存任何二进制截图（git 体积）：`templates/<pkg>/reference/` 只保留 `src/` 原型代码；step 07 的
  `review_visual.py compose` 新增必填 `--reference-base`，从运行中的参考应用现拍参考图再与实现拼图；
  `capture-reference --out`（如 `/tmp/ref-shots`）仅供发布前目检，产物不提交。`validate_package.py package`
  报 P11（包内出现二进制图片），`sync_catalog.py` 恢复为只同步 meta/theme/CHANGELOG 三个文本文件。
  workbench-shell 5.0.5。

## 5.3.2 — 2026-10-14

### Added
- DataTable 行窗口化（提案规则：>200 行虚拟化）：超过 `VIRTUALIZE_ABOVE`（200）自动启用，`virtualize` 可强制开关。TanStack Virtual，滚动元素为外层 `data-scroll-region`（scrollMargin 自动测量），空隙用 `[data-spacer]` 占位行/项；吸顶表头、RowLink、aria-rowindex / aria-rowcount、加载更多哨兵不变；获得焦点的行保持挂载（Tab 继续在行内移动）；窗口化时关闭 scroll anchoring（否则占位行变化会让浏览器重新锚定、滚动跳变）。表格与窄屏列表两种形态都窗口化。
- check_rendered R19：页脚已加载 >200 行而 DOM 行数 >200 即报错；测试夹具 2000 行。
- 参考 collection 原型改为 2400 条、每页 500（直接走窗口化路径）；参考截图重拍（workbench-shell 5.0.4）。

## 5.3.1 — 2026-10-14

反馈：模型目录页脚写「共 50 项」而目录实际 8814 个模型；滚动后表头跟着滚走。

**根因**：DataTable 的 `total / hasMore / onLoadMore` 都是可选的，页面不传时页脚默认把已加载行数当总数写成「共 n 项」——静默截断没有任何地方会报错；
表格容器是 shadcn 的 `overflow-x-auto`，它同时也是纵向滚动容器，表头就算 sticky 也只相对它吸附。

### Changed
- DataTable `paging` 改为必填：`"complete"`（接口返回整个集合）或 `{ total?, hasMore, loadingMore?, onLoadMore, capped? }`。页脚只会是 `共 m 项` / `已加载 n / 共 m 项` / `已加载 n 项，还有更多` / `已达接口上限`；有更多时同时渲染「加载更多」按钮和滚到底自动加载的哨兵（IntersectionObserver）。新增 `useLimitPaging(step, max)` 给只有 limit 没有游标的接口。页脚带 `data-loaded / data-total / data-has-more / data-capped`。
- DataTable 表头在滚动区内吸顶（不透明底、底线用 inset shadow，深浅色一致）；表格容器 `overflow-x-clip`（`ui/table` 本地补丁加 `containerClassName`，记入 SOURCE.md）。
- check_rendered R17（吸顶表头：非 sticky、贴顶有缝、不透明、行透出）与 R18（页脚有更多却无加载更多、知道总数却不显示 n / m；接口返回 nextCursor / hasMore / 满 limit 页而页面没有“还有更多”页脚）。
- collection pattern 写明三种分页声明；review 清单加表头吸顶与页脚计数；参考截图重拍（workbench-shell 5.0.3）。

## 5.3.0 — 2026-10-14

反馈：设置→模型目录列表很长时，画布外层仍会滚动一点（画布边框随内容滚走）。

**根因**：5.2 保留了两套滚动模型——文档页（列表/详情/表单/设置）让整个文档滚动，画布的外边距、边框、圆角随之滚走；
只有 `layout="viewport"` 的页面钉住画布，且靠 `100svh-1rem-2px` 硬算高度。R15 与 -end 截图验收也只覆盖视口页，所以缺口没被发现。

### Changed（单一滚动模型）
- AppShell 恰好一屏高（`h-dvh overflow-hidden`），画布（`frame`）是 `flex min-h-0 overflow-hidden`：html/body/画布永不滚动，画布边框始终完整。
- 只有表面声明的 `data-scroll-region` 滚动：`Page`（默认 padded）= 固定 PageHeader 下一个 main 区；Split / SectionLayout = 导航 + 内容两区（窄屏堆叠时导航最多 40% 高）；ListDetailLayout = 列表 + 详情；NotFound / RouteError 自带区域。区域都是 `relative`：Radix Select/Checkbox 的隐藏原生控件是绝对定位的，否则会以画布为包含块把画布撑出可滚动高度（新建调度页实测 329px）。
- PageHeader 不再 sticky / 毛玻璃，是区域之上的固定条。
- check_rendered R15 对**每个路由**生效：每个区域注入 3000px 并全部滚到底后，document/body/画布不得可滚动、scrollTop 必须为 0，只有声明区域可滚，画布仍完整在视口内；页面没有任何区域也报错。区域内部的嵌套滚动不再被豁免（R02/R03 照常检查）。
- review 清单：-end 截图必须看到画布四周边框/圆角/外边距完整。
- 参考截图重拍（workbench-shell 5.0.2）。

### Removed
- `Page layout="viewport"`（对话改用 `layout="fill"` + `ScrollRegion` + ComposerDock）、画布 `--frame-h` 变量与 `100svh-1rem-2px` 硬算高度、ListDetailLayout 的 `h-(--frame-h)` / `data-layout`、Split 的 `sticky` 选项、R15 的视口页特判。

## 5.2.0 — 2026-10-14

两条反馈（对话页整页滚动、输入框文字浅灰）的机制级根因与同类修复。

**根因**：(1) 原则写死“文档是唯一滚动容器”，对话/主从这类全高原型也用文档滚动，列表窗格用 `100svh-1rem` 硬算高度，
加上 5.0 给画布加的 1px 边框，空对话也溢出 2px；(2) shadcn InputGroup 的 `has-disabled:opacity-50` 命中任意禁用后代——
发送按钮一禁用整个输入框（含输入文字）就半透明；(3) 检查看不到：R06 只算元素自身 opacity、不看输入值与 placeholder，
视觉验收只有页顶静态截图，看不到“谁在滚”。

### Added
- `Page layout="viewport"` + `ScrollRegion`（唯一滚动区，`follow` 流式增长时贴底）；画布暴露 `--frame-h`，ListDetailLayout 用它定高，窗格与详情各自滚动。
- check_rendered R15：视口页注入 3000px 长内容后文档/画布不得滚动、声明区域必须滚动；R16：可编辑控件文字 ≥4.5、placeholder ≥3（都计入祖先 opacity）；R06 也改为计入祖先 opacity。
- check_rendered：页面渲染 NotFound（`data-state="not-found"`）时接口 404 不计 R08。
- review_visual：每路由加 `1280-light-end`（所有滚动区滚到底）；清单加“滚动”“控件文字”两项；`capture-reference --out`；包无参考截图时回退并警告。
- validate package C10（警告）：包缺参考截图。author / design 的目视步骤改为生成该包的参考截图（apply 07 的对照物）。

### Changed
- `ui/input-group`（本地补丁，记入 SOURCE.md）：只按控件自身 disabled 淡化。
- ComposerDock 不再 sticky/渐变，是 ScrollRegion 之后的固定区。
- 参考 list-detail 原型改为长对话 + 视口布局；参考截图 24 张。
- SKILL「单一滚动」原则改为「滚动归属按原型」；author/design 去掉过时的 “v4 契约” 说法。

## 5.1.0 — 2026-10-14

clean-room v5 回归项，全部修在共享层。

### Fixed
- review_visual：路由→原型按具体程度匹配（字面 > 参数 > 通配），与 `pages:` 书写顺序无关；`state` 映射到 empty 原型。
- check_rendered：`[data-prose]`（Markdown 内容）里的表格不参与 R09/R11。
- Markdown：内容表格与代码块同用 panel 圆角（rounded-lg + 外框，内部只画行/列分割）；根元素带 `data-prose`。
- 安装脚本 devDependencies 加 `@types/node`；workbench-shell 5.0.1：theme.css 头注释版本同步。

### Added
- `patterns/empty`（与 empty 原型、J07 对齐）。
- 02-install：覆盖脚手架 `react-refresh/only-export-components` / `react-hooks/incompatible-library` 对 ui、blocks 的规则片段。
- collection：客户端分批显示 + 排序（先排完整数组再切片，排序变化回到第一批）。
- conversation：每轮顺序 用户 → Steps → 助手回复；shell：导航不放演示路由、创建动作。

## 5.0.0 — 2026-10-14

**Breaking.** 打地鼠式修复的根因：页面有太多布局自由度、布局是从规则重写而不是从成品复制、没有真正的视觉验收。三个机制：

### A. Surfaces 拥有全部几何
- 新 `blocks/surfaces`：Page、Body、Split、Panel、Section、Stack、Grid、Toolbar、Actions、Inline、Properties、Rows/Row/DisclosureRow、Centered。
  圆角两级（画布 xl、panel lg，控件沿用 shadcn），分割线由 split 容器画（从页头底线到画布底边）；元素带 `data-surface`。
- 新 `blocks/conversation`：Transcript、Turn、Message、Steps/Step、AttachmentChip、StreamingCursor、Quote、ComposerDock。
- AppShell 画布 `overflow-clip` + 边框；`ShellBrand`、`ShellNote`。list-detail 加 `PaneHeader`、`PaneSection`，窄容器主区撑满高度，切换按钮改用列表图标。
- SectionLayout 基于 Split，内容左对齐、form 宽度；放在 `<Page layout="fill">` 内。
- lint `ui-template/no-layout-classes`：ui/、blocks/ 之外禁止 border*、rounded*、p-/m-、gap-、space-、divide-*、shadow-*（`m*-auto` 除外）。
- **移除** `PageBody`（用 `Page` / `Body`）。

### B. 从成品原型开始
- 新 `reference/`：collection、detail、form、settings、list-detail、empty 六个完成态原型页（只用 surfaces + blocks + shadcn，MIT 依赖），04-pages 改为“复制原型再换数据”；pattern 中重复的布局代码与说明删除，改为指向原型。

### C. 参考截图视觉验收
- 新 `scripts/review_visual.py`：`capture-reference` 生成参考截图；`compose` 为每个路由生成 实现|参考 并排图（1280 浅/深、768 浅）并维护 `ui-review.md`。
- 新 `steps/07-review.md`：固定清单（圆角、接缝、对齐、间距节奏、层级、密度、对比、截断），零未结问题才交付。
- validate project：J10（缺 ui-review.md / 缺路由，警告）、J11（有 `- [ ]` 或 `status: pending`，错误）。
- check_rendered：R12 圆角层级、R13 split 接缝（等高、贴页头底线、到画布底边）、R14 上下相邻 panel 左右边对齐。
- Section 头部 actions 顶对齐；Properties mono 值优先在空格处换行。

### Removed
- skill 目录中误带入的项目截图。

## 4.3.0 — 2026-10-14

区域分隔 / 视觉分组（举一反三自一条「子菜单与内容无分割线」「表格无边框」反馈），以及对话主从布局。

### Added
- `blocks/list-detail`：ListDetailLayout（列表窗格常驻 + 竖线分隔 + 独立滚动，窄容器收进 Sheet）、ListPaneTrigger、RecencyList（今天/昨天/7 天内/更早分组、当前高亮、每项菜单）。
- DataTable `frame`：默认 `bordered`（外框、圆角、表头底色、行与页脚分割线）；Card/Sheet 内用 `flush`。
- PageHeader `leading` 插槽（放 ListPaneTrigger）。
- check_rendered R10：dev server 错误浮层；R11（警告）：并排区域同底色无分割、表格无外框。

### Changed
- SectionLayout：宽容器导航与内容间整高竖线，窄容器横排导航下横线。
- workbench-shell 4.0.2：`--border` 加深（浅 0.905，深 12%）；C01 新增 border 对 background/card ≥1.25；`collection.frame` 默认 bordered。
- conversation pattern 改为主从布局；会话列表不在全局侧栏重复。
- settings / collection / detail / page / log-viewer / confirm / shell 增加区域分隔自查项。
- 02-install / 05-verify：依赖变化后先装包，再用 dev server 打开每个路由确认无错误浮层（build 通过不够）。

### Fixed
- install_registry：对已安装项目 `--items X` 追加时不再把 lock 的 items 覆盖成只剩 X（之前会让后续 `--status/--upgrade` 漏掉其余文件）。

## 4.2.0 — 2026-10-14

来自独立 clean-room（另一代理只凭 skills 搭应用）的反馈。

### Added
- `blocks/theme-menu`：侧栏 footer 的浅色 / 深色 / 跟随系统菜单，`labels` 可改文案；shell pattern 改用它。
- DataTable `sorting` / `onSortingChange`：传入即受控（`manualSorting`），用于 URL / 服务端排序；不传仍是客户端排序。
- validate_package C02：文字落在色调自身 tint 上（destructive 按钮浅 10% / 深 20%、状态徽标底）须 ≥4.5，
  按浏览器的 gamma 空间合成计算，与 check_rendered R06 一致。

### Fixed
- workbench-shell 4.0.1：浅色 `--destructive` → `oklch(0.52 0.21 27.3)`（tint 上 3.86 → ≥4.5）；derive_theme 默认值同步。

### Docs
- 02-install：无 eslint 的新脚手架的最小配置；三个严格 TS 选项写进 tsconfig 及 `field: undefined` 陷阱；react-query 定为默认依赖。
- 05-verify：动态路由（真实 id + 不存在 id）与空态的覆盖口径。
- settings：`/settings` 用 `<Navigate replace>` 重定向。
- state：`QueryLike<T>` 接口、非 React Query 数据层的接法、非数组数据需 `isEmpty`。
- collection：useInfiniteQuery 用 `select` 拍平后交给 StateBoundary；排序归属（URL 唯一来源 vs 客户端）。

## 4.0.0 — 2026-10-14

架构重写：风格包只剩 meta.yaml + theme.css + CHANGELOG；库、pattern、步骤与脚本集中在 ui-template-apply。

### Added
- workbench-shell 4.0.0：中性灰 + 克制蓝，compact 密度（text-sm 13px，行高 36），浅/深两套完整变量。
- 库：shadcn 4.21.4（radix / nova）37 个组件 + blocks（app-shell、section-nav、page-header、data-table、state-boundary、
  status-badge、format、confirm、notify、app-errors、code-block、markdown、log-view、theme、router、vocab）。
- 安装器 install_registry.py：lock 哈希、`--status` / `--upgrade`（new/same/upstream/local/conflict）、`--resolve` 手工合并后改基线。
- validate_package.py（package / patterns / project；J07 页面 pattern 名、J08 feedback 条目、J09 YAML 解析）。
- check_rendered.py（R01–R09）；eslint 插件 9 条规则；derive_theme.py / extract_theme.py。
- ui-decisions.yaml：decisions / pages / local_edits / feedback（四层分诊 theme→block→pattern→page）。

### Changed（由 agent-web 验证发现的通用问题）
- blocks 在 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes` 下零错误：可选 props 统一 `?: T | undefined`，索引访问有守卫。
- `Id`：`tail=0` 不再显示整串；不带复制按钮时不抢行点击。
- `Markdown`：剥离 hast `node` 不再违反 no-unused-vars；`ThemeProvider` 支持 `storageKey`，存储不可用时不崩溃。
- sonner 主题去掉类型断言；shell pattern 补充「CommandDialog 内必须包 Command」。

### Removed
- schemas、governance、example、旧 prompts、16 个旧脚本、旧 skill 目录（evals/experience/patches/runtime/catalog/agents）、ledger 体系。
