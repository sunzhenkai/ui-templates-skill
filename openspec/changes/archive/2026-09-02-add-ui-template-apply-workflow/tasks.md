## 1. 准备与约定核对

- [x] 1.1 重新阅读 `AGENTS.md`、`skills/ui-template/SKILL.md`、`skills/ui-template/references/spec-format.md` 与 `.agents/skills/ui-template-manager/SKILL.md`，确认文档语言、单一源码和维护边界。
- [x] 1.2 重新阅读 `templates/workbench-shell/spec.md` 与 `templates/workbench-shell/platforms/*.md`，列出 implementation 文档必须引用而不是复制的规则。
- [x] 1.3 检查当前 Git 状态，确认本次只修改 skill、模板文档与项目说明，不修改 `example/workbench-shell/` 实现代码。

## 2. 扩展 ui-template skill 入口

- [x] 2.1 更新 `skills/ui-template/SKILL.md` frontmatter description，使其同时覆盖“从来源创建/维护模板”和“使用已有模板分阶段实现 UI”。
- [x] 2.2 在 `SKILL.md` 中定义 Template Authoring 与 Template Apply 两个工作流入口、各自触发条件和共同核心原则。
- [x] 2.3 明确 Template Apply 的前置条件：必须选择或先创建/扩展模板，确认页面范围、平台路径和技术栈。
- [x] 2.4 在 `SKILL.md` 中加入指向 `apply-workflow.md`、`toolchain.md` 和 `quality-gates.md` 的必读引用。

## 3. 新增通用 Apply workflow 文档

- [x] 3.1 创建 `skills/ui-template/references/apply-workflow.md`，定义 Intake、Art direction & tokens、IA/layout/routes、Code structure、Component inventory、Representative slice、Complete page modes、Global systems、Browser verification、Review & feedback 十个阶段。
- [x] 3.2 为每个阶段写清输入、核心产物、工具配合、完成门禁和常见终止条件。
- [x] 3.3 规定 App Shell/layout 和代码结构必须先于 composed component 实现，代表性端到端页面必须先于批量页面扩展。
- [x] 3.4 定义阶段中断恢复方式，允许从已有产物继续，但必须先核验产物仍满足前一阶段 gate。
- [x] 3.5 定义模板反馈闭环：区分模板规则、stack adapter 问题、项目业务实现问题，并指定各自回写位置。

## 4. 新增 toolchain 与 quality gates

- [x] 4.1 创建 `skills/ui-template/references/toolchain.md`，按 Knowledge、Taste、Components、Visual feedback、Automated review 五类能力组织默认工具。
- [x] 4.2 写明 `ui-ux-pro-max`、`frontend-design`、shadcn、Playwright MCP、chrome-devtools MCP、browser-use 和 design review 的适用阶段与输入输出。
- [x] 4.3 为每个默认工具定义缺失回退方案，确保没有 MCP 或 subagent 时仍能达到同等验收目标。
- [x] 4.4 创建 `skills/ui-template/references/quality-gates.md`，定义路由语义、可访问性、响应式、URL 状态、computed style、控制台、主题、浮层和工程检查。
- [x] 4.5 加入本仓排查发现的典型反例：路由用 button、icon-only 控件无名、交互控件嵌套、自定义 token 被样式合并工具覆盖、文档流阴影和无效 URL 参数静默降级。

## 5. 扩展模板格式与 manager 约定

- [x] 5.1 更新 `skills/ui-template/references/spec-format.md`，新增 optional `implementation/` 目录约定。
- [x] 5.2 定义 optional `meta.yaml` implementation 元数据，例如 playbook 入口和支持的 stack adapter。
- [x] 5.3 明确 `spec.md` 仍是设计规则唯一入口，implementation playbook 冲突时必须服从 `spec.md`。
- [x] 5.4 更新 `.agents/skills/ui-template-manager/SKILL.md` 的引用清单和维护约定，使其包含新增 references，但不复制 apply 流程细节。

## 6. 修正 workbench-shell 响应式规则

- [x] 6.1 更新 `templates/workbench-shell/spec.md` 第 13 节，消除断点表与平台路径注释之间的歧义。
- [x] 6.2 明确 web platform 在 768–1023px 和 <768px 下的侧栏与导航入口行为，并保持所有页面一致。
- [x] 6.3 明确 mobile platform 的覆盖抽屉特征与 desktop platform 的贴缘侧栏/顶行 chrome 不因浏览器宽度改变。
- [x] 6.4 同步更新响应式验收清单，使浏览器宽度和平台路径的正交关系可直接检查。

## 7. 新增 workbench-shell 实施总 playbook

- [x] 7.1 创建 `templates/workbench-shell/implementation/playbook.md`，作为实施流程唯一总入口。
- [x] 7.2 定义 workbench 专属阶段：范围确认、tokens、代码结构、App Shell、页面 chrome、基础组件、代表性页面、全部页面模式、全局系统、响应式、浏览器验证和 review。
- [x] 7.3 为每个阶段列出输入、产物、引用文档、完成定义和回退策略。
- [x] 7.4 在 playbook 入口链接 `routes-and-layouts.md`、`components.md`、`code-structure.md`、stack adapter 和 `quality.md`。

## 8. 定义完整 routes、layouts 与页面模式

- [x] 8.1 创建 `templates/workbench-shell/implementation/routes-and-layouts.md`，提供 route inventory 模板和 URL 参数约定模板。
- [x] 8.2 完整覆盖 A 列表/集合、B 主从双栏、C 文档详情、D 设置页、E 聚合网格五种页面模式。
- [x] 8.3 为每种模式定义结构、滚动归属、页头/工具栏、选中状态、空态、加载态、错误态、404 态、响应式降级和验收点。
- [x] 8.4 提供业务示例映射，覆盖收件箱、事件列表、事件看板、服务目录、值班日历、交付分析和设置页，同时标明示例实体不进入通用规则。
- [x] 8.5 定义 compact 与 mobile 宽度下每个页面模式的行为矩阵，包括单栏切换、选中保留、属性栏隐藏、页签方向、动作收缩和描述隐藏。
- [x] 8.6 定义深链、刷新、前进、后退和无效参数的行为要求。

## 9. 定义核心组件 inventory

- [x] 9.1 创建 `templates/workbench-shell/implementation/components.md`，建立组件 inventory 的固定字段：用途、semantic element、variants、sizes、states、a11y、source、workbench usage。
- [x] 9.2 覆盖 Shell 与导航：Sidebar、workspace switcher、nav link、drawer、collapse control、resize control。
- [x] 9.3 覆盖页面 chrome：PageHeader、breadcrumb、toolbar、FAB、progress indicator。
- [x] 9.4 覆盖表单与选择：Button、Input、Textarea、Select、Combobox、Checkbox、Switch、Date picker。
- [x] 9.5 覆盖数据展示：Badge、Table、Pagination、Kanban column/card、Service card、Calendar card、Metric card、Trend/chart container、Avatar、Skeleton、Empty state。
- [x] 9.6 覆盖浮层与反馈：Dialog、Confirm dialog、Search palette、Toast、Menu、Tooltip、Shortcut help。
- [x] 9.7 为每个组件定义 default、hover、focus-visible、active、disabled、loading、selected、error 等相关状态和键盘要求。
- [x] 9.8 明确 icon-only 控件、tab、checkbox、dialog、table、看板卡片和拖拽操作的 accessible name、role、keyboard 与非颜色状态要求。

## 10. 定义 workbench 代码结构

- [x] 10.1 创建 `templates/workbench-shell/implementation/code-structure.md`，定义 App Shell、layout、route/page、business feature、基础 UI、lib、状态、service/mock 和测试目录契约。
- [x] 10.2 规定路由级页面、跨域 primitives、只属于业务域的组件、hooks、纯工具、全局状态和测试的归属判断规则。
- [x] 10.3 定义文件命名、component naming、route naming、state selector、API 边界和 mock 数据组织约定。
- [x] 10.4 明确不把业务组件提升到共享 UI 目录的判断标准，避免通用组件目录退化为未分类目录。

## 11. 新增默认技术栈 adapter

- [x] 11.1 创建 `templates/workbench-shell/implementation/stack-react-vite-tailwind-shadcn.md`，说明这是默认 adapter 而非模板唯一技术栈。
- [x] 11.2 映射 React、Vite、Tailwind、shadcn 与 code-structure 的目录关系。
- [x] 11.3 定义 shadcn 组件选型顺序：优先使用生产组件，再按 workbench token 与 layout 规则适配，最后才考虑 custom component。
- [x] 11.4 说明 Tailwind token 命名、`tailwind-merge`/等价样式合并工具的冲突风险和检查方式。
- [x] 11.5 定义该栈的构建、静态检查、测试和浏览器验证入口约定，不引入新的强制依赖。

## 12. 定义 workbench 质量验收

- [x] 12.1 创建 `templates/workbench-shell/implementation/quality.md`，与通用 quality gates 保持一致并补充 workbench 专属检查。
- [x] 12.2 定义 desktop、compact 和 mobile 视口矩阵，列出整页滚动、内部滚动、横向滚动、页头几何和触达性检查。
- [x] 12.3 定义可访问性矩阵：keyboard、focus、accessible name、nested interactive、dialog focus、状态非颜色信号和 WCAG AA。
- [x] 12.4 定义 computed style 检查：九档字号、三级文字灰度、间距、圆角、边框、阴影、主题 token 和自定义类合并结果。
- [x] 12.5 定义状态矩阵：loading、empty、error、unauthorized、not found、saving、success 和 offline 如适用。
- [x] 12.6 定义交付前证据要求：截图、console 结果、AX/computed style 检查、工程检查和 review 结论。

## 13. 集成模板入口与仓库说明

- [x] 13.1 在 `templates/workbench-shell/meta.yaml` 中添加 optional implementation 元数据。
- [x] 13.2 在 `templates/workbench-shell/spec.md` 的入口处添加指向 implementation playbook 的链接，并说明 implementation 服从主 spec。
- [x] 13.3 检查 `templates/INDEX.md` 是否需要更新；若模板定位未变化，不添加重复索引项。
- [x] 13.4 更新 `AGENTS.md` 的仓库结构说明，记录 `implementation/` 与新增 skill references。
- [x] 13.5 检查 `README.md` 是否需要更新；如提及模板能力或示例，补充 Template Apply 与 implementation playbook 的简短说明。

## 14. 校验与收尾

- [x] 14.1 运行 `openspec validate "add-ui-template-apply-workflow" --type change --strict` 并修复所有错误。
- [x] 14.2 检查所有 Markdown 相对链接指向存在的文件。
- [x] 14.3 逐项核对 specs：双工作流、阶段 gate、toolchain 回退、浏览器验证、review、模板反馈、完整页面模式、组件 inventory、代码结构、响应式和可访问性均有落点。
- [x] 14.4 确认没有修改 `example/workbench-shell/` 实现、新增依赖或引入完整 runnable starter。
- [x] 14.5 复查所有新增文档使用简体中文，技术术语、CSS 属性、路径和组件名保留原文。
- [x] 14.6 汇总实际新增/修改文件、关键设计决策和遗留风险，供 review 与后续 apply 使用。
