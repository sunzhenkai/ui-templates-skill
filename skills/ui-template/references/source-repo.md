# 来源：代码仓库（repo）

核心：先找 token 定义，再沿引用读取组件用法。若来源实际只是 Markdown/PDF 设计文档，改走 `source-doc.md`。

## 提取步骤

1. 确认用户有权读取仓库；记录 `meta.sources[]` 的仓库 ref、commit/tag/内容快照 digest revision 和采集时间。只读来源，不改来源仓库。
2. 按优先级定位：design-token 文件/CSS variables/theme 对象；样式配置；组件 variants。大仓库先 Glob/Grep，再沿 import 追踪 3–5 个代表组件。
3. token 声明直接转写为 `origin: source`；组件解析后的实际值若需计算则为 computed。token 与组件用法冲突时，以实际组件用法为设计判断依据，但在 evidence 保留两处 locator 和裁决方法。
4. 读取按钮、输入、导航、容器、表格等 semantic/variants/sizes/states/a11y 用法；可运行且获准时再按 Web 指南补浏览器证据，运行失败不伪造观察结果。

## evidence

locator 使用可复现的 `relative/path:line-or-symbol`、JSON pointer、CSS selector 或导出 symbol；同时记录 source revision、method、captured_at、confidence。归一多个声明时列出主 locator 与 artifact/辅助定位。无法从仓库确定的值必须 default + basis/decision ID，不得将框架默认值伪装为来源。

复制截图、字体、图标、插画前检查仓库许可证不等于资产许可证。每个入库资产记录具体 license、redistribution 与 redaction；未知许可、禁止分发、测试账号/内部数据/品牌敏感素材不得进入可分发模板。可以记录 locator 而不复制资产。

## 置信度与 coverage

显式 token 声明通常 visual high；仅由类名或条件组合推断时降低 confidence。组件/状态未追踪到实际引用时不得标 observed。layout/visual/components 分维度记录，overall 不高于最弱必需维度；未覆盖主题、平台、页面模式和状态分别归入 defaulted 或 unsupported。
