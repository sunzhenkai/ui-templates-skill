## ADDED Requirements

### Requirement: 壳展示形态按四态写清且触发分离
`templates/workbench-shell/` 的 `routes-and-layouts.md` 与 `platforms/*.md` SHALL 把本模板实际出现的壳展示映射到 Authoring 闭集四态：在文档流展开、收成 rail 仍占位、离开布局、变为 overlay。断点触发与用户开关 SHALL 分成独立规则。宽度与覆盖宽度 SHALL 只引用 `tokens.yaml` 的 `responsive.web.*` 与 `layout.sidebar-*` path。本模板未观察到的形态 SHALL 标 `unsupported`，SHALL NOT 发明第四种未出现形态，也 SHALL NOT 把该三态配方写成其他模板的默认完成条件。无 `fidelity.yaml` 时，这些形态是设计规则，SHALL NOT 标 profile-verified。

#### Scenario: 阅读 Web 平台文档
- **WHEN** consumer 阅读 `platforms/web.md` 与 `routes-and-layouts.md`
- **THEN** 能把 expanded 对应「文档流展开」、collapsed 对应「rail 仍占位」、overlay 对应「离开布局并变为 overlay」；断点阈值只见 token path；用户开关（若有）不与断点合成一条规则

#### Scenario: 不得把本模板三态套到其他模板
- **WHEN** 通用 Authoring 或另一模板没有展开/rail/overlay 来源证据
- **THEN** 不得把 workbench-shell 的 expanded/collapsed/overlay 矩阵当作默认配方或 observed

### Requirement: Phase 0 明确 legacy-baseline 且不读 provenance 实现
workbench-shell 的 `apply/playbook.md` Phase 0 SHALL 要求记录 `legacy-baseline` 与 `structural fidelity unavailable`（当前无 sidecar）。Intake SHALL NOT 把 `meta.sources[]`、上游产品名或历史生成物列为实现输入。通用 catalog 播种与 `require-published` 仍由 Apply skill 执行；模板指南只声明本实例的 coverage / A–E / 平台路径决定。

#### Scenario: 无 sidecar 进入 Phase 0
- **WHEN** consumer 用当前 published workbench-shell 开始 Apply
- **THEN** `00-intake.md` 写明 structural fidelity unavailable / legacy-baseline；不得把缺 `fidelity.yaml` 当成要上游绝对路径的理由

#### Scenario: provenance 不是实现参考
- **WHEN** Agent 读取 workbench `meta.sources[]`
- **THEN** 不得打开对应 checkout、按 ref clone，或把出处身份写入 intake 作为实现输入

### Requirement: published 正文变更递增版本并同步 catalog
对仓库根 `templates/workbench-shell/` 的 published 正文（规则、平台、apply 映射或 meta 身份字段）做 portable 更新时，`meta.template_version` SHALL 递增。Author catalog 中的 `workbench-shell` SHALL 随后成为该生产目录的同一 published 副本；任一 drift SHALL 使发布前 catalog 检查失败。本次同步 SHALL NOT 写入 `fidelity.yaml`，SHALL NOT 把 defaulted 抬成 observed。

#### Scenario: 更新生产模板后 catalog 一致
- **WHEN** 维护者改完 `templates/workbench-shell/` 并完成 portable 校验
- **THEN** `template_version` 高于更新前；`skills/ui-template-author/catalog/workbench-shell/` 与生产目录内容摘要一致

#### Scenario: 无 session source 不写 sidecar
- **WHEN** 本会话没有与声明 revision 一致的 session source
- **THEN** 更新后的模板仍无 `fidelity.yaml`，`confidence.layout` 不高于 medium

## MODIFIED Requirements

### Requirement: App Shell 完整实现
workbench-shell 设计规则 SHALL 定义 Web 与 Desktop 的 shell 表面、侧栏、画布、页头、覆盖导航、滚动归属和可访问性行为。Web 在 viewport 不小于 `responsive.web.expanded-min` 时使用展开侧栏，不小于 `responsive.web.collapsed-min` 且小于 `responsive.web.expanded-min` 时使用折叠 rail，小于 `responsive.web.collapsed-min` 时使用带可访问触发器、宽度为 `layout.sidebar-mobile-width` 的覆盖 Sheet；根容器保持 token 声明的视口高度且不滚动。精确像素 SHALL NOT 出现在实例附录或 `apply/` prose 中。

#### Scenario: 展开桌面宽度渲染
- **WHEN** Web viewport 不小于 `responsive.web.expanded-min`
- **THEN** App Shell 显示展开浮岛侧栏、画布卡片和模板定义的外层呼吸边

#### Scenario: 桌面宽度渲染
- **WHEN** Web viewport 不小于 `responsive.web.collapsed-min`
- **THEN** App Shell 按 collapsed rail 或不小于 `responsive.web.expanded-min` 的展开矩阵渲染，并保持画布与根滚动规则

#### Scenario: compact 宽度渲染
- **WHEN** Web viewport 不小于 `responsive.web.collapsed-min` 且小于 `responsive.web.expanded-min`
- **THEN** 侧栏以模板定义的折叠 rail 常驻，核心导航仍可达且画布不产生意外根滚动

#### Scenario: 窄屏打开导航
- **WHEN** Web viewport 小于 `responsive.web.collapsed-min` 且用户激活页头导航触发器
- **THEN** Shell 显示可关闭的覆盖 Sheet，宽度读取 `layout.sidebar-mobile-width`，触发器有 accessible name

#### Scenario: 抽屉内选择路由
- **WHEN** 用户在覆盖 Sheet 中选择真实路由
- **THEN** URL 更新、当前项语义正确、目标页面渲染，Sheet 关闭并按约定恢复焦点

### Requirement: 页面 chrome 与导航语义
playbook SHALL 规定集合页头、面包屑页头和简单页头的实现方式，保持 `layout.page-header-height` 高度、`layout.page-gutter` 页左距、标题截断、计数和动作区一致。面包屑祖先 SHALL 是真实可导航 link，叶子 SHALL 不渲染为交互控件，面包屑页 SHALL 保留明确的页面标题语义。精确像素 SHALL NOT 写进 playbook prose。

#### Scenario: 切换页面
- **WHEN** 用户在不同页面模式间切换
- **THEN** 页头高度、左距、分割线和动作区几何保持稳定，且 expected 来自当前 token path

#### Scenario: 点击面包屑祖先
- **WHEN** 用户点击详情页中的祖先 crumb
- **THEN** 浏览器导航到对应容器页，且该 crumb 在可访问性树中是 link

### Requirement: 响应式与平台路径
workbench-shell SHALL 以可直接验收的行为矩阵区分 Web expanded、Web collapsed rail、Web overlay、Mobile 平台 shell 和 Desktop 平台 chrome。断点、触发器、页头动作、页面模式与安全区 SHALL 引用 `spec.md`、token path 和平台文档的唯一规则，SHALL NOT 在实例附录中复制像素字面量。

#### Scenario: Web compact 宽度
- **WHEN** Web viewport 不小于 `responsive.web.collapsed-min` 且小于 `responsive.web.expanded-min`
- **THEN** 使用折叠 rail 和 compact 页面降级，行为与平台矩阵一致

#### Scenario: Web overlay 宽度
- **WHEN** Web viewport 小于 `responsive.web.collapsed-min`
- **THEN** 常驻侧栏退出布局，页头提供覆盖导航入口，且所有 included 页面保持一致

#### Scenario: web compact 宽度
- **WHEN** Web viewport 不小于 `responsive.web.narrow-content-threshold` 且小于 `responsive.web.collapsed-min`
- **THEN** 使用 overlay 路径，页头提供导航入口，页面内容按 compact 规则降级

#### Scenario: web mobile 宽度
- **WHEN** Web viewport 小于 `responsive.web.narrow-content-threshold`
- **THEN** 继续使用一致的覆盖导航，并按窄内容规则收缩动作、内容和页面模式，不与原生 Mobile 平台路径混淆

#### Scenario: 页头动作降级
- **WHEN** 可用宽度不足以显示完整动作标签
- **THEN** 动作按模板规则收缩，所有 icon-only 控件保留非空 accessible name

#### Scenario: 平台路径切换
- **WHEN** consumer 选择 Mobile 或 Desktop 平台而非 Web 响应式路径
- **THEN** 使用对应平台文档定义的 shell 与安全区，不把 Web 断点行为误当原生平台规则

### Requirement: Workbench 已发布模板保持可消费且不索取上游路径
`templates/workbench-shell/` SHALL 继续作为合法 schema v2 模板被 portable 校验与 Apply baseline 消费。`meta.sources[]` SHALL 只作为并列出处身份（固定 repo revision 与已泛化 doc revision）。无本会话 session source 时，模板 SHALL 保持无 `fidelity.yaml` 的 `legacy-baseline`；Authoring/治理/Apply SHALL NOT 向用户索要这两个来源的本地绝对路径，SHALL NOT 扫描 sibling checkout、`/tmp` 或 `example/**`，SHALL NOT 按 provenance ref clone，也 SHALL NOT 用旧模板 snapshot locator 冒充 source-direct observed records。

#### Scenario: 无 session source 时校验 workbench
- **WHEN** maintainer 在未提供上游 checkout 的情况下验证 workbench-shell
- **THEN** portable core v2 与 INDEX 一致性通过；replay 为 not-run 或不适用；不得把缺本地 source root 报告为 blocker

#### Scenario: 禁止把 provenance 当路径请求
- **WHEN** Agent 读取 workbench `meta.yaml` 中的 source-001/source-002
- **THEN** 它不得请求用户提供对应本地绝对路径，也不得把缺 checkout 解释为必须停下补路径

#### Scenario: Example 实现存在差异
- **WHEN**`example/workbench-shell/**` 的生成代码、样式、测试或文档发生变化
- **THEN**workbench 校验与任何后续 profile 生成不读取、不修改也不使用该变化作为来源证据
