# apply/playbook

本指南只把 workbench-shell 规则映射到通用 Apply Phase 0–9。checkpoint 只使用通用 phase ID；expected 从 [`../tokens.yaml`](../tokens.yaml) 与设计规则读取，provenance 从 [`../evidence.yaml`](../evidence.yaml) 读取。证据遵循通用 Apply 的 current-build 结构，不维护第二份报告。

| Phase | 检查对象 | Rule IDs | 取证 | 通过条件 |
| --- | --- | --- | --- | --- |
| Phase 0 — Intake | schema、coverage、目标平台、A–E route scope、legacy 文档详情 | @TOKEN-001、@ROUTE-005、@ROUTE-006、@ROUTE-007、@ROUTE-008、@ROUTE-009、@RESP-001 | validation 结果与 included/deferred/excluded decision | schema/evidence/rule refs 可解析；每个 route 映射 A–E；legacy 文档详情映射 B 或 excluded；Web/Mobile/Desktop 路径不混同。 |
| Phase 1 — Design direction & token freeze | 四层表面、双主题、动态 token scale、focus | @NN-002、@NN-005、@NN-009、@NN-012、@TOKEN-002、@TOKEN-003、@TOKEN-004、@TOKEN-005、@TOKEN-006 | token map、active evidence refs 与 expected/actual mapping | 所有 consumable token 已映射；无 prose 重算或未解释值；focus expected 可追踪。 |
| Phase 2 — IA/layout/routes | shell、A–E、URL、scroll owner、Web 响应矩阵 | @NN-001、@NN-010、@LAYOUT-001、@LAYOUT-004、@ROUTE-001、@RESP-001 | route/layout artifact 与 rule-ID matrix | 每个 included route 有唯一 page mode、状态恢复、scroll owner 与平台响应行为。 |
| Phase 3 — Project structure | 目标项目现场边界与命令归属 | @LAYOUT-002、@LAYOUT-003 | 通用 Phase 3 artifact | 现场决定不反向写入模板；shell/global/page-mode 责任可被后续证据定位。 |
| Phase 4 — Component inventory | included route 的语义、状态、键盘与浮层 | @NN-012、@NN-016、@AX-001、@AX-017、@AX-031、@AX-041、@AX-046、@AX-050、@AX-051、@AX-061 | component inventory 与 AX rule refs | 交互无嵌套；icon-only、focus、非颜色状态和浮层返回均有 expected。 |
| Phase 5 — Representative slice | 一个端到端 route 的 shell、模式、状态与窄路径 | @NN-014、@NN-015、@LAYOUT-004、@RESP-001、@ROUTE-004 | current-source 浏览器/测试 evidence refs | 代表切片同时覆盖 shell、URL、loading/empty/error、keyboard 与 computed style。 |
| Phase 6 — Complete included modes | Phase 0 included 的 A–E 页面模式 | @ROUTE-005、@ROUTE-006、@ROUTE-007、@ROUTE-008、@ROUTE-009、@RESP-003、@RESP-005、@RESP-006 | 每个 included route/state 的 progress evidence | included modes 完整；deferred/excluded 不伪造证据；legacy 文档详情保持 B/excluded 决定。 |
| Phase 7 — Global systems | 搜索、通知、modal、navigation progress、FloatingChat 等 included systems | @LAYOUT-002、@LAYOUT-008、@LAYOUT-009、@TOKEN-007、@AX-061、@AX-064 | 成功/失败、keyboard 与 route-result evidence | 只完成 Intake included systems；浮层边界、净空与 focus 返回符合规则。 |
| Phase 8 — Browser verification | included route × coverage × state × current build | @QUALITY-001、@QUALITY-006、@QUALITY-008、@QUALITY-009、@QUALITY-011、@QUALITY-016、@QUALITY-020、@QUALITY-024 | 通用 Phase 8 records 与可定位 evidence refs | expected/actual、rule ID、route、viewport、theme、state 与 current identities 完整；未闭合 failure 阻断。 |
| Phase 9 — Review & feedback | visual、responsive、interaction、a11y、route、IA 与 reusable gaps | @QUALITY-005、@QUALITY-014、@QUALITY-021、@QUALITY-022、@QUALITY-023、@QUALITY-024 | 通用 Phase 9 recheck 与 feedback records | P0/P1 已闭合或显式接受；recheck 绑定 Phase 8 record；模板反馈只描述可复用规则缺口。 |
