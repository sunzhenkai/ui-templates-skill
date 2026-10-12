# Implementation conventions（可机检的实现约定）

这些约定是 runtime 检查脚本的前提；不遵守会让检查失真或失败。与框架无关，示例用 React/Tailwind 仅作说明。

## 0. 运行环境

runtime 脚本需要 Python ≥3.10 + `PyYAML`、`jsonschema`；浏览器类检查另需 `playwright` 与 Chromium（`pip install pyyaml jsonschema playwright && python -m playwright install chromium`）。缺失即停止并请求可运行方式，不得跳过 Phase 8。

## 1. Token 投影（唯一来源）

- 用 `runtime/project_tokens.py --instance .ui-template-design --out <styles>/tokens.css [--format tailwind4|css]` 生成 CSS 变量，**不得手写或改名**；CI 用 `--check` 防漂移。命名规则见脚本头注释（`color.*→--color-*`、`size.*→--spacing-*`、`icon.size.default→--spacing-icon`、`icon.stroke-width→--icon-stroke-width`、主题变体在其 selector 下重声明同名变量）。
- 图标描边：全局规则让图标库的 svg 使用 `stroke-width: var(--icon-stroke-width)`；尺寸只用 `icon.size.*` 投影出的类/变量。
- 视口单位 token（`dvh/vh/dvw/vw`）按原单位使用；不要把百分比当视口单位。

## 2. DOM 标注

- primitive 根：`data-primitive="<slug>"`（slug = primitive id 去掉 `primitive/`）；内容槽位：`data-slot="<slot>"`，仅标注该 primitive 自己的槽位（嵌套 primitive 自行标注）。
- 尺寸：`data-control="<sm|md|lg…>"`（对应 `size.control.<size>`）放在**拥有可见边框与命中区的元素**上——字段包裹层（带图标/尾部的 input、自绘箭头的 select）标在包裹层，内部 input/select 填满包裹层，包裹层把点击转发给内部控件（点击空白处聚焦输入）。
- 状态词汇：`active` = 指针按下（pressed）；当前路由/当前项属于 `selected`（`aria-current`），不要把 nav 的 "active" variant 当作按下态。
- 变体颜色：按 `variant_contracts.<v>` 的 `background/foreground/border/hover`（`@N%` = 该 token 的 N% 透明度混合）与 `theme_overrides.<theme>` 实现静止/悬停色，不得自行猜测填充或描边。
- 状态：选中用 `aria-selected` / `aria-current` / `aria-pressed` / `data-state=active|on|checked`；禁用用原生 `disabled` 或 `aria-disabled`；展开/打开用 `aria-expanded=true` 或 `data-state=open`。状态矩阵按这些属性找实例。
- 只给读屏的文字（如折叠图标栏中的导航标签）用视觉隐藏（≤1px 裁剪），不要用 `display:none`，以保持槽位与可访问名称。

## 3. 交互 primitive 行为（`interaction` 声明的落地）

- Tooltip：悬停延迟约 300–500ms、键盘 `:focus-visible` 立即出现；Escape、指针离开、失焦、滚动、按下即关闭；`role=tooltip` + 触发元素 `aria-describedby`；不得使用原生 `title` 代替；触屏不靠悬停（长按/可见文字替代）。
- 菜单（下拉/右键）：`role=menu`/`menuitem`（单选项 `menuitemradio`+`aria-checked`）；打开后焦点进入首个可用项；↑↓/Home/End 移动；Escape/Tab/外部点击/选中关闭；关闭后**焦点归还触发元素**；触发器 `aria-haspopup=menu` + `aria-expanded`。右键菜单同时支持右键、触屏长按与 Shift+F10/ContextMenu 键。
- 对话框/命令面板/抽屉：Escape 关闭、外部点击关闭（对话框可配置）、打开时焦点进入。
- 可折叠导航/图标栏：触发按钮 + 快捷键（若模板给出）；状态在本地持久化；折叠态每个导航项保留图标、可访问名称与 Tooltip，计数/未读等必需指示保留为角标。
- 浮层定位：相对触发元素放置，视口内碰撞翻转/夹紧，`position: fixed` 挂到文档根，避免被滚动容器裁剪。

## 4. 主题

- 模板有 `tokens.themes` 时提供切换：浅/深/跟随系统，默认跟随 `prefers-color-scheme`，选择本地持久化；按 variant selector（如根元素 class）激活。
- 任何「文字放在彩色底上」的组合（头像、徽标、状态色块）必须在**每个主题**下都满足对比度：只使用在所有主题中与前景色达标的底色 token，或按主题选择前景色。

## 5. 动效与可达性

- 状态过渡使用 `transition-[…] duration-150` 量级；按下反馈可用 `scale`/`translate`（状态矩阵签名包含 transform/scale/translate/rotate）。
- 必须遵守 `prefers-reduced-motion: reduce`（动画/过渡降为近 0）。
- 滚动容器使用细滚动条（若模板/源有对应事实）。
- 窄视口（< md 或粗指针）所有交互命中区 ≥ `size.touch-min`；`[data-control]` 在触屏下用 `min-height` 抬高而不是改 token。

## 6. 必跑检查（每个主题 × 最小/中/最大 viewport）

```
python3 runtime/project_tokens.py --instance .ui-template-design --out <tokens.css> --check
python3 runtime/scan_design_constraints.py <src> --json
python3 runtime/check_ui_quality.py --instance .ui-template-design --url <url> --themes light,dark --theme-class dark --view dialog=click:<css> --out <evidence>/ui
python3 runtime/check_anatomy_conformance.py --instance .ui-template-design --url <url> --viewport WxH --color-scheme <theme> --require-all --action …
python3 runtime/check_state_matrix.py --instance .ui-template-design --url <url> --viewport WxH --themes light,dark --theme-class dark --open <slug>=<action> … --out <evidence>/states
```

`--action`/`--open`/`--view` 用来打开浮层与抽屉；窄视口下侧栏在抽屉内时先打开抽屉。任何放行（`--allow`）必须写明理由并在报告中列为缺口。
