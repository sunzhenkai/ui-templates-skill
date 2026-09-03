# 设计规范文档格式(spec.md、tokens.yaml、meta.yaml 与 apply/)

本文档定义 `templates/<name>/spec.md` 的章节骨架、`tokens.yaml` 与 `meta.yaml` 的字段,以及 optional `apply/` 约定。写规范时按此结构组织;来源未体现的字段必须在 `tokens.yaml` 回填默认值,`spec.md` 说明缺口与默认值依据,不要留空章节。

## spec.md 骨架

```markdown
# <模板名> 设计规范

> 一句话风格描述(如:"深色开发者工具风,高对比,紧凑排版,克制的强调色")。

- 来源:<类型 + URL/路径/文件名>
- 采集日期:<YYYY-MM-DD>
- 佐证截图:assets/<文件名>(如有)

## 0. 不可协商规则(Non-negotiables)

不超过 20 条、每条可独立检查的 MUST 规则;消费方无论使用什么技术栈都必须满足。其余正文规则标注 SHOULD(偏离须记录理由)或 MAY。

## 1. 整体风格

- 风格关键词:3~6 个(如:深色、极简、几何、高密度)
- 明暗:深色 / 浅色 / 双主题
- 密度:紧凑 / 适中 / 宽松
- 圆角倾向:锐利(0~4px) / 柔和(6~12px) / 圆润(≥16px)

## 2. 配色

按角色给值,而不是罗列色卡。每个角色给出 hex 值,并注明依据(精确提取 / 估算)。

| 角色 | 值 | 说明 |
| --- | --- | --- |
| 页面背景 | | |
| 卡片/容器背景 | | |
| 主文字 | | |
| 次要文字 | | |
| 主色(primary) | | 按钮、链接、关键交互 |
| 强调色(accent) | | 点缀、高亮,可多个 |
| 边框/分割线 | | |
| 成功 / 警告 / 错误 | | 若来源有体现 |

## 3. 字体

- 字体族:正文 / 标题 / 等宽(如适用),含 fallback
- 字号阶梯:列出实际出现的层级(如 12 / 14 / 16 / 20 / 28 / 36),注明各自用途(正文、卡片标题、页面标题等)
- 字重用法:常规 / 中等 / 粗体分别用在哪
- 行高与字距特点(如有明显特征)

## 4. 间距与布局

- 间距基调:以实际值归纳(如"4 的倍数体系,常用 8/16/24")
- 页面容器:最大宽度、左右留白
- 栅格/分栏特点(如有)
- 常见内边距模式:卡片、按钮、输入框

## 5. 组件风格要点

按来源中实际出现的组件写成紧凑契约,每个组件至少覆盖 semantic element、variants、sizes、states、geometry、a11y;交互组件必须包含 hover、focus-visible、disabled、selected。来源未体现的状态按归一与决策阶段回填默认值。示例:

- 按钮:实心主色、圆角 6px、hover 加深
- 卡片:容器背景 + 1px 边框,无阴影
- 输入框:……
- 导航:……

## 6. 其他特征(可选)

- 阴影:无 / 轻微 / 明显,给出典型值
- 动效:时长、缓动倾向(如来源可观察)
- 图标风格:线性 / 面性、粗细
- 图片/插画处理特点

## 7. 还原要点

写给"消费者"的 3~5 条最关键规则:照这几条做,页面就有这个风格的味道。例如:

1. 背景必须用 #0d1117 级别的深色,卡片再浅半档
2. 强调色只用于关键操作,面积不超过 5%
3. ……
```

## meta.yaml 字段

```yaml
name: <模板名,与目录名一致>
description: <一句话风格描述,与 spec.md 开头一致>
source:
  type: web | repo | image | doc
  ref: <URL / 仓库路径或地址 / 图片或文档文件名>
captured_at: <YYYY-MM-DD>
tokens: tokens.yaml
tags: [<风格关键词,如 dark, minimal, dashboard>]
confidence: high | medium | low   # 取最弱维度;doc 来源建议在 spec.md 分别说明 layout 与 visual 置信度
platforms: [web, mobile]   # 可选:模板覆盖多平台外壳时列出,各平台差异细节放 platforms/<platform>.md
coverage:
  visual_reference: true | false
  viewports: [desktop]
  themes: [light]
  components:
    observed: [<来源实际体现的组件>]
    defaulted: [<回填默认契约的组件>]
  states:
    observed: [default, hover]
    defaulted: [focus-visible, disabled, selected]
```

`confidence` 是模板复用时的重要参考:`low` 意味着消费者应把 spec.md 当风格方向而非精确数值。

## tokens.yaml(必备)

`tokens.yaml` 是颜色、字号、间距、圆角、阴影等精确值的机器可读唯一载体;`spec.md` 负责解释规则与用途,不维护第二份数值清单。最小结构:

```yaml
schema: 1
themes:
  light:
    background: { value: "#ffffff", origin: source }
    foreground: { value: "#0f172a", origin: default }
  dark:
    background: { value: "#0b1220", origin: default }
    foreground: { value: "#e5e7eb", origin: default }
typography:
  family:
    body: { value: "Inter, system-ui, sans-serif", origin: default }
  scale:
    body: { size: 14, lineHeight: 20, origin: source }
spacing:
  base: 4
  allowed: [4, 8, 12, 16, 24, 32]
radius:
  control: 10
  card: 8
```

硬性要求:

- `origin` 必填,取值 `source | computed | estimated | default`;`default` 表示模板回填的默认值,不得伪装成来源派生。
- 配色、字体族、字号阶梯、间距、圆角、阴影不允许空值或区间值;来源未体现时回填默认值并记录决策。
- 支持双主题时,`themes.light` 与 `themes.dark` 的角色键必须一致。
- 间距使用 `allowed` 白名单;组件几何(高度、内边距)优先引用该白名单。

## optional apply/ 实施指南

当模板足够复杂、需要约定消费顺序与验收方式时,可以增加 `apply/`;它只承载实施顺序与验收引用,不承载设计规则或工程结构:

```text
templates/<name>/
├── components.md    # 可选:设计层组件契约(semantic/variants/sizes/states/geometry/a11y,无栈映射)
└── apply/
    ├── playbook.md  # 必有:实施阶段顺序与 gate,逐条引用 spec 规则
    └── quality.md   # 推荐:验收矩阵,只写“检查哪条规则、如何取证”,不复制数值
```

归属判断:

- 页面模式、布局矩阵、断点表、URL 契约属于设计规则,写入 `spec.md` 或其拆分子文件,不放 `apply/`。
- 组件契约是设计层内容,放模板根目录 `components.md`;不得包含 `source: <组件库>` 之类栈映射。
- 以下内容**禁止**进入模板:目录契约(如 `src/` 结构)、API/mock/data 分层、状态库选型、stack adapter(如 `stack-<framework>.md`)、依赖清单、具体消费项目的业务域名。它们在 Apply Phase 3 由目标项目现场决策。

职责边界:

- `spec.md` 是设计规则唯一入口,定义“结果必须长什么样、如何交互”。
- `tokens.yaml` 是精确值唯一载体;`spec.md` 引用并解释,不维护第二份数值清单。
- `apply/playbook.md` 只定义“按什么顺序做、每步引用哪条规则、如何验收”。

写作要求:

- apply 文档必须引用 `spec.md` 的规则,不复制色值、字号、间距或布局细节。
- apply 文档使用简体中文;路径、组件名、命令、CSS 属性和框架术语保留原文。
- 不把 runnable starter、依赖清单或完整业务代码放入模板;模板仍以可共享规范为主。
- 若某个规则既需要出现在 `spec.md` 又影响实施验收,在 `spec.md` 定义规则,在 apply 文档中只写“检查该规则”的方式。

冲突处理:

1. `spec.md` 与 `apply/` 冲突时,以 `spec.md` 为准。
2. `spec.md`/`tokens.yaml` 与任何历史消费项目的工程结构冲突时,以模板为准;工程结构在目标项目重新决策。
3. 更新模板时,先判断发现属于设计规则、验收方式还是当前业务实现;最后一种不回写模板。

## 大型规范的拆分

`spec.md` 始终是共享核心与入口。当规范体量过大、或存在平台/场景维度的大量差异细节时,允许拆出子文件(如 `platforms/web.md`),并在 `spec.md` 中以相对链接指向;拆分出的细节文件不重复 spec.md 已有的通用规则。
