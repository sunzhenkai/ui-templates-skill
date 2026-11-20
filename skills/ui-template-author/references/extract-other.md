# 从渲染结果提炼（网站、截图、设计稿）

没有可读变量时，按角色取样，再交给 ui-template-design 的推导脚本生成完整包。

## 取样表

在浏览器（或截图取色）对以下位置取色，记录 hex：

| 角色 | 取样位置 |
|---|---|
| background | 主内容区空白 |
| app-shell / sidebar | 侧栏或外框背景 |
| card | 卡片 / 弹层背景 |
| foreground | 正文文字 |
| muted-foreground | 次要说明文字 |
| border | 表格分隔线、输入框边框 |
| primary | 主按钮背景 |
| brand / ring | 链接色、焦点环 |
| accent | 列表行 hover / 选中背景 |

网站优先走 **computed-style 导出**（比取色准：边框/字重/行高/圆角/阴影/缓动这些截图量不出来）：

1. DevTools Console 粘贴 `scripts/export-computed-styles.js` 整段 → Alt+点击 打标元素（角色见上表，另加
   侧栏项/选中项/分组标题、卡片边框、行分隔线、输入框、主/次按钮、浮层）。
2. `__uikit.dump()` 导出 JSON（schema `uikit-export/1`：`vars.resolved` 全量 CSS 变量终值、`freq` 全页
   属性频次榜、`picks` 打标元素完整样式 + 背景链）。
3. 实测色换算与契约预验用 `scripts/map-tokens.mjs`（lch/hex → oklch，`contrast`/`tint` 子命令与
   validate_package.py 逐位同口径）；文本阶梯/圆角/内边距档位直接读 `freq` 榜。
4. **实测值挂契约时**（常见：参照边框/焦点环比 1.25/3.0 淡）：保持契约值，把实测数字记进 theme.css 头注释
   与 CHANGELOG（已知偏差，见 workbench-shell 5.0.9 / quiet-inset 0.4.x 模例）。

agent 代跑（ZCode in-app browser）：脚本头注释有完整要点（隔离 world、goto 清注入、3s 分批）。

## 生成

1. 由 primary/brand 取色相：`derive_theme.py --accent-hex <brand>`；由 background/foreground 估中性色偏
   （冷灰 H≈260–290，暖灰 H≈60–90，彩度 0–0.012）。
2. 生成后用取样值覆盖对应变量（转换为 oklch：`extract_theme.py` 可读一个只含 `:root{--role:#hex}` 的临时 css）。
3. 圆角：量按钮/卡片圆角像素，`--radius` = 卡片圆角 ÷ 1.4 ÷ 16 rem。
4. 密度：来源若明显更松（正文 14px、控件 36px+），v4 仍用 compact，并在 `not_for` 说明不追求同等留白。

截图/设计稿受压缩与色彩管理影响，取色误差 ±3% 正常；以对比度校验通过为准。
