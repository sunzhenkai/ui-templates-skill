# 模板消费契约

本文件只定义 `ui-template-apply` 读取模板时的不变量。模板格式的生成规则、字段全集与校验口径以 `skills/ui-template/references/spec-format.md` 为唯一权威来源；本文件不复制格式定义。

## 读取优先级

1. `templates/<name>/spec.md` 是设计规则唯一入口，冲突时一律以它为准。
2. `templates/<name>/tokens.yaml` 是颜色、字号、间距、圆角、阴影等精确值的唯一载体；expected 值只从它来，不从 prose 重新演绎。
3. `platforms/*.md`、`routes-and-layouts.md`、`components.md`、`apply/*.md`（如存在）只补充平台差异、页面模式与实施顺序，不推翻上述两层。

## origin 读取语义

- `origin: observed`：来源实测，消费时不得改值。
- `origin: default`：Authoring 回填的模板默认值，消费时作为确定值使用，不得即兴替换。
- `(估算)` / `origin: estimated`：反推值，消费时仍作为确定值使用；如需偏离，先在 Implementation Brief 记录理由并征得确认。

## coverage 驱动验收严格度

- 所需页面模式、视口、主题或状态在 `meta.yaml` coverage 中标记为已覆盖 → 按模板规则直接验收。
- 标记为 defaulted 或未覆盖 → 实现前向用户确认处理方式，不得静默即兴发挥；验收时把该模式列为显式假设。

## 冲突处理

发现模板内文档互相冲突时：按"读取优先级"裁决 → 在汇报中记录冲突内容与裁决依据 → 触发"模板反馈产出"流程，让 Authoring 侧决定是否回写模板。
