## 1. capture 必答矩阵第二轮

- [x] 1.1 `chrome.py` 矩阵新增三组必答：交互控件 focus 状态（border token + ring/shadow 机制）、in-card section-nav 场景多窗格拓扑（root 滚动语义、每窗格 scroll domain、导航列 stretch）、section-nav 解剖（icon 槽、分组标签）与页面上下文 selected/hover 状态；gaps 标签 `focus:`/`pane-scroll:`/`nav-anatomy:`/`nav-state:`
- [x] 1.2 `capture.py` 接入（沿第一轮 `MANDATORY_FACT_MISSING` 路径）；`profile.py` 的 `mandatory_answers` 覆盖新条目；`state_presentations` 投影把 focus 机制缺失判为未作答
- [x] 1.3 骨架必答清单注释同步；`repo-capture-format.md` 契约第二轮成文
- [x] 1.4 fixtures/测试/eval：focus 沉默失败、多窗格缺拓扑失败、解剖 exclusions 通过、focus 机制缺失判未作答；digest/pin/baseline 同步

## 2. primitives 变体契约

- [x] 2.1 `schemas/design-system/v1/primitives.schema.json` 增可选 `variant_contracts`（presentation/radius/control_height/hover/active/focus_ref/context_bindings）与 `anatomy` 槽（含次序）；validator 校验契约字段解析到 token/rule/state 事实
- [x] 2.2 Generate 侧：capture 事实映射到契约块（button 逐变体、nav-item 双上下文绑定、input focus_ref）；契约缺失时 validator 对 included 交互控件报不完整（新模板必答，旧模板沉默走 Apply 停止）
- [x] 2.3 fixtures/eval：契约完整通过、契约外样式偏离失败、上下文错绑失败

## 3. Apply gate

- [x] 3.1 `_route_composition_findings` 新增 `SCROLL_OWNER_UNTRACE`：route `scroll_owner` 必须等于绑定 layout 某 scroll domain owner；多窗格 layout（≥2 scroll domains）要求 route 声明 `multi_pane: true` 且 03-structure 记录 overflow-hidden 根
- [x] 3.2 Phase 1 gate 静态扫描：输出根全局机制 CSS（如 `:focus-visible { outline }`）未 trace 到模板状态事实/vendor 原语 ⇒ 失败；白名单（token 投影、变量定义、reduced-motion）写入 quality-gates.md
- [x] 3.3 apply-workflow/quality-gates 文档：「沉默即停止」扩展到状态处理与解剖；focus 逐控件 token 化或 vendor 原语直用
- [x] 3.4 eval/测试：scroll owner 失配、多窗格复用单容器、全局 focus 发明三个失败面各有用例

## 4. Phase 8 派生扩张

- [x] 4.1 `derive_scenario_ids`：state_presentations（focus/selected/hover）⇒ state 场景；layout 每条 scroll_domain ⇒ 滚动归属场景
- [x] 4.2 断言细则成文（border-color/box-shadow/overflow 解析值）；missing scenario fail-closed 对账
- [x] 4.3 eval：状态/滚动场景缺失即 verification 失败

## 5. workbench-shell 1.3.2

- [x] 5.1 graph 补事实：input/button/nav-item 的 focus-visible 状态（border-ring + ring 机制 token）、settings 多窗格拓扑、section-nav icon+分组解剖与 page-surface 选中态；重跑 capture（captured、零 unresolved）
- [x] 5.2 七层重建：primitives 契约块（button 逐变体 rounded-lg/h-8 系列、nav-item 双上下文、input focus_ref）、settings 独立 layout 记录（双 scroll_domains）；完整 authoring gates + promote 落库 1.3.2

## 6. web 修复与取证

- [x] 6.1 移除全局 `:focus-visible` outline；input/button/交互控件按契约实现 focus（border-ring + ring 机制）与 `rounded-lg`；button hover/active 对齐契约（含 active 位移）
- [x] 6.2 settings 页根改 height-constrained `overflow-hidden` 双窗格滚动（导航列/内容区各自 overflow-y-auto，导航列撑满卡片高）
- [x] 6.3 section-nav 条目 icon+label、分组标签、`surface-selected` 选中态、移动端降级；侧栏 token 不再用于页面上下文
- [x] 6.4 重跑 build/unit/e2e 与 Phase 8（含新 state/scroll-domain 场景）；checkpoint 重开→闭合，apply-close 恢复 closed

## 7. 治理收尾

- [x] 7.1 FUNCTIONAL-LOOP/AGENTS 派生文档同步矩阵第二轮表述；`make eval`/`make test` 回到基线（仅剩既知待决项）
- [x] 7.2 归档顺序确认：先 close-layout-fidelity-blind-spots 后本 change（共享 Requirement 的叠加语义已在 delta 中对齐）
