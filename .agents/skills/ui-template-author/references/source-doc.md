# 来源：设计文档（doc）

核心：布局与交互按文档精确转写；文档没有给出的视觉 token 显式回填 default，不得伪装成来源派生。

## 提取步骤

1. 记录 `meta.sources[]`：文件/URL ref、文档版本/commit/文件 SHA-256 revision、采集时间。Markdown、PDF 或导出文档都要固定 revision。
2. 分类：布局、chrome、断点、交互、组件规则可按原文 source 转写；颜色、字体、阴影等只有文档明确给值时才是 source。文档写了展开/折叠/隐藏/覆盖导航时，按原文转到 L3 / `platforms/*.md`，断点值进 token；没写则 `unsupported`，不发明三态矩阵。清单见 [extraction-layers.md](extraction-layers.md)。
3. 尽量索取获授权截图或运行 URL，并分别按 image/web 指南增加独立 source；没有视觉参考时 visual coverage 使用 defaulted，overall 上限为 medium。
4. 缺口 token 填完整 default，basis 说明文档缺失、风格/密度推理与可访问性依据。禁止留空或交给 Apply 自选。
5. 文档冲突按更具体、更新 revision 裁决，同时保留两个 locator 与决策理由。业务实体、项目名、目录/API/技术栈内容先泛化，不进入模板。

## evidence

source locator 使用标题层级 + 段落/页码/表格单元格（例如 `§Responsive > Breakpoints, PDF p.12`），记录 source revision、转写方法、captured_at 和 confidence。跨段归纳标 computed；无法确定的视觉推断标 estimated；默认补全标 default + basis/decision ID。

文档中的截图、图标、字体和附件并不自动允许再分发。每项归档资产记录 license、redistribution、redaction；客户名、内部链接、账号/人员数据和未公开产品信息必须脱敏。许可不明/禁止分发或仍需脱敏时，只保留 locator/digest，不入库原资产。

## 置信度与 coverage

layout、visual、components 分维度记录：明确布局规则可 high，缺视觉参考时 visual 不高于 medium；overall 不高于最弱必需维度。文档未定义的主题、平台、页面模式、组件和状态归入 defaulted/unsupported，不能因已补默认值而标 observed。
