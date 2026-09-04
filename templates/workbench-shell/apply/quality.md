# apply/quality

本矩阵只定义 workbench-shell 的 rule ID、检查对象、取证和通过条件。expected 读取 [`../tokens.yaml`](../tokens.yaml) 当前声明及 [`../evidence.yaml`](../evidence.yaml) active provenance；结果写入通用 Phase 8/9 current-build records。检查数量由 included scope、coverage、动态 token scale 与适用 rule IDs 生成。

## Tokens 与视觉

| Rule IDs | 检查对象 | 取证 | 通过条件 |
| --- | --- | --- | --- |
| [QUALITY-001] | shell/canvas/surface/raised 表面 | applicable elements 的 computed style，引用 @TOKEN-002 | 每层匹配当前主题角色，无反向混用。 |
| [QUALITY-002] | 全部可见文本字号与行高 | 遍历 computed style，并与 `typography.scale` 当前键集合比对，引用 @TOKEN-005 | 每个值可映射到当前声明；不依赖固定档数。 |
| [QUALITY-003] | 正文、次级文本与非文本弱化标记 | DOM role + computed color，引用 @NN-006 | 正文只使用允许角色，faint 未承载正文。 |
| [QUALITY-004] | 普通表面、菜单与窗口级浮层阴影 | computed shadow 与 `shadow.*` token map，引用 @NN-007 | 阴影层级与表面语义一致。 |
| [QUALITY-005] | light/dark 主题角色与交互层级 | 双主题 computed style + token/evidence refs，引用 @NN-009 | 角色键完整，hover/selected 语义一致。 |

## Shell 与布局

| Rule IDs | 检查对象 | 取证 | 通过条件 |
| --- | --- | --- | --- |
| [QUALITY-006] | root 与模式滚动容器 | scroll owner、bounding box 与 overflow evidence，引用 @NN-001、@LAYOUT-001 | root 不滚动；A–E 的声明容器承担滚动。 |
| [QUALITY-007] | PageHeader、Toolbar、正文对齐 | computed geometry 与 layout token map，引用 @NN-004、@LAYOUT-004 | chrome 对齐且模式切换不漂移。 |
| [QUALITY-008] | Web expanded/collapsed/overlay | `responsive.web.*` 边界两侧的浏览器 evidence，引用 @RESP-001 | expanded、collapsed、overlay 行为正确；窄 Web 未冒充 Mobile。 |
| [QUALITY-009] | included route 的 page mode | route inventory 与 @ROUTE-005–@ROUTE-009 evidence | 每个 route 唯一映射 A–E；legacy 文档详情为 B 或 excluded。 |
| [QUALITY-010] | FloatingChat 与底部工具区域 | scroll-end 与 overlay-open evidence，引用 @NN-011、@LAYOUT-008 | 最后内容和动作不被遮挡。 |

## 组件与状态

| Rule IDs | 检查对象 | 取证 | 通过条件 |
| --- | --- | --- | --- |
| [QUALITY-011] | included components 的适用状态 | DOM/AX/computed-style/state evidence，引用对应 AX rule | coverage 中 included 状态均有非颜色可辨 expected/actual。 |
| [QUALITY-012] | label、error、required、disabled、read-only | Accessibility tree 与 DOM association，引用 @AX-035 | name/description/state 可由 AT 解析。 |
| [QUALITY-013] | A/B 集合行与单元格动作 | keyboard path 与 DOM nesting，引用 @NN-016 | 只聚焦真实交互元素，无嵌套交互。 |
| [QUALITY-014] | Dialog/Sheet/Popover | open、focus enter/contain、close、return 与 route-close evidence，引用 @AX-050 | 全部焦点行为在 current build 可复验。 |
| [QUALITY-015] | empty、filtered-empty、error、not-found | role、文案与 action evidence，引用 @AX-051、@AX-054 | 状态语义和下一步明确。 |

## 响应与平台

| Rule IDs | 检查对象 | 取证 | 通过条件 |
| --- | --- | --- | --- |
| [QUALITY-016] | Web shell、A–E 内容与 C tabs | coverage 驱动 viewport evidence，引用 @RESP-001、@RESP-003、@RESP-005 | 所有 included Web viewport 行为匹配规则。 |
| [QUALITY-017] | A 列表列与 E 聚合网格 | 改变容器而非仅改变 viewport 的 evidence，引用 @NN-013、@RESP-006 | 列/卡片响应由容器和当前 token scale 驱动。 |
| [QUALITY-018] | Desktop window chrome、tabs、history、canvas | Desktop current-build evidence，引用 @LAYOUT-012、@ROUTE-013、@ROUTE-014 | 独立 Desktop 路径完整，未套用 Web breakpoint。 |
| [QUALITY-019] | Mobile safe area、bottom tabs、sheet、keyboard、gestures | Mobile current-build evidence，引用 @LAYOUT-010、@AX-065、@AX-068、@AX-069 | 独立 Mobile 路径完整，未套用 Web overlay shell。 |

## 全局质量

| Rule IDs | 检查对象 | 取证 | 通过条件 |
| --- | --- | --- | --- |
| [QUALITY-020] | 文本、状态与 focus indicator 对比 | validator 结果 + 真实背景 computed evidence，引用 @TOKEN-003、@TOKEN-004、@NN-012 | required pairs 可解析并达到适用门禁；无静默跳过。 |
| [QUALITY-021] | navigation、overlay、collection、settings、submit/cancel | 仅键盘操作 trace，引用 @NN-012 | included 流程无需 pointer 可完成。 |
| [QUALITY-022] | title、current item、icon-only、status/alert、table semantics | Accessibility tree，引用 @AX-012、@AX-016、@AX-017 | role/name/state/relationship 完整。 |
| [QUALITY-023] | navigation、overlay 与 progress motion | reduced-motion current-build evidence，引用 @NN-018 | 减少动效后无位移/滚动干扰，状态仍可感知。 |
| [QUALITY-024] | view、filter、selected item、detail 与 tabs | refresh/deep-link/back-forward evidence，引用 @NN-010、@ROUTE-001 | URL 或等价 route state 完整恢复声明状态。 |
