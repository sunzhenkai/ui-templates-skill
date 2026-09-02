# 设计规范文档格式(spec.md、meta.yaml 与 implementation/)

本文档定义 `templates/<name>/spec.md` 的章节骨架、`meta.yaml` 的字段和 optional `implementation/` playbook 约定。写规范时按此结构组织;来源缺某项信息时,写"来源未体现"或给出标注 `(估算)` 的值,不要留空章节。

## spec.md 骨架

```markdown
# <模板名> 设计规范

> 一句话风格描述(如:"深色开发者工具风,高对比,紧凑排版,克制的强调色")。

- 来源:<类型 + URL/路径/文件名>
- 采集日期:<YYYY-MM-DD>
- 佐证截图:assets/<文件名>(如有)

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

按来源中实际出现的组件描述,每条一句话讲清"长什么样",例如:

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
  type: web | repo | image
  ref: <URL / 仓库路径或地址 / 图片文件名>
captured_at: <YYYY-MM-DD>
tags: [<风格关键词,如 dark, minimal, dashboard>]
confidence: high | medium | low   # repo/web 精确提取为 high;image 反推一般为 medium/low
platforms: [web, mobile]   # 可选:模板覆盖多平台外壳时列出,各平台差异细节放 platforms/<platform>.md
implementation:             # 可选:只有模板包含消费端落地 playbook 时填写
  playbook: implementation/playbook.md
  stacks:
    - <stack-adapter-name>  # 如 react-vite-tailwind-shadcn;stack adapter 放 implementation/ 下
```

`confidence` 是模板复用时的重要参考:`low` 意味着消费者应把 spec.md 当风格方向而非精确数值。

## optional implementation playbook

当模板足够复杂、需要约定消费顺序、组件映射、代码目录或默认技术栈时,可以增加:

```text
templates/<name>/
└── implementation/
    ├── playbook.md                        # 必有:实施总入口与阶段 gate
    ├── routes-and-layouts.md              # 推荐用于 layout-heavy 模板
    ├── components.md                      # 推荐用于组件密集模板
    ├── code-structure.md                  # 推荐用于目标项目落地模板
    ├── stack-<framework>.md               # 可选:技术栈 adapter
    └── quality.md                         # 推荐:模板专属验收矩阵
```

职责边界:

- `spec.md` 是设计规则唯一入口,定义“结果必须长什么样、如何交互”。
- `implementation/playbook.md` 定义“按什么顺序做、每步交付什么、如何验收”。
- stack adapter 定义某个技术栈下的目录、组件来源和工程检查;不得改变通用设计规则。

写作要求:

- implementation 文档必须引用 `spec.md` 的规则,不复制色值、字号、间距或布局细节。
- implementation 文档使用简体中文;路径、组件名、命令、CSS 属性和框架术语保留原文。
- 不把 runnable starter、依赖清单或完整业务代码放入模板;模板仍以可共享规范为主。
- 若某个规则既需要出现在 `spec.md` 又影响实施验收,在 `spec.md` 定义规则,在 implementation 文档中只写“检查该规则”的方式。

冲突处理:

1. `spec.md` 与 `implementation/` 冲突时,以 `spec.md` 为准。
2. stack adapter 与通用 implementation playbook 冲突时,若只是技术栈差异,以 stack adapter 为准;若影响通用设计结果,必须先修正 `spec.md` 或通用 playbook。
3. 更新模板时,先判断发现属于通用规则、模板实施顺序、stack adapter 还是业务实现,再写入对应文件。

## 大型规范的拆分

`spec.md` 始终是共享核心与入口。当规范体量过大、或存在平台/场景维度的大量差异细节时,允许拆出子文件(如 `platforms/web.md`),并在 `spec.md` 中以相对链接指向;拆分出的细节文件不重复 spec.md 已有的通用规则。
