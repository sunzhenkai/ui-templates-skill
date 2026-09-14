## 1. Capture 必答事实矩阵（环节 0/1）

- [x] 1.1 在 `template_authoring/chrome.py` 定义矩阵常量：inset 壳五项几何（inset/gap、radius、border、shadow、background）与 page_mode 必答问题（多分区页 section-navigation 放置；detail 页 master/detail 分侧与上下文面板位置），并扩展闭合校验输出 `MANDATORY_FACT_MISSING`
- [x] 1.2 `capture.py` 将必答项纳入闭合失败路径：缺事实且无带理由 exclusions ⇒ `status: unresolved`，不产 `captured` receipt；必要时扩 exclusions 理由枚举（如 `insufficient-source`）
- [x] 1.3 `profile.py`（facts_to_fidelity）投影保留三态应答：observed / exclusion / unresolved 可区分，未作答项不得呈现为 observed
- [x] 1.4 `--init-source-graph` 骨架按矩阵生成必答清单注释
- [x] 1.5 同步 `repo-capture-format.md`（矩阵语义、必答五项、page_mode 问题、显式 exclusions 规则）与 `skills/ui-template-author/references/` 对应引用
- [x] 1.6 更新 capture fixtures（缺项失败 / 显式 exclusions 通过 / 三态投影）与 `run_contract_evals.py` 对应 case（含矩阵自描述一致性 case）

## 2. workbench-shell 模板 1.3.1（环节 1 续）

- [x] 2.1 session source graph 补事实：canvas 卡片五项几何（token-ref：space.2/radius.xl/color.surface-border/shadow.surface/color.page-canvas）、sidebar 容器 p-2、settings 卡内左列 section-nav（component/context 入图）
- [x] 2.2 重跑 capture（captured、closure digest 更新）与 replay（declared=resolved=executed=passed，计数 > 17）
- [x] 2.3 staging 重建候选 1.3.1：layout placement geometry 增补卡片记录；新增 rule/LAYOUT-107（内容区悬浮 inset 卡片）并绑定 placement；改写 NN-102 断点描述（PAGE_GUTTER px-4 为卡内页槽）；新增 `pattern/section-nav` 并挂入 settings 类 page-type patterns 闭包
- [x] 2.4 跑完整 authoring gates（capture/reproducibility/validate/eval）并 `--promote-index` 落库 `templates/workbench-shell@1.3.1`

## 3. Apply 消费纪律（环节 2）

- [x] 3.1 `apply-workflow.md` Phase 2 gate 增补：placement_plan 布局决策必须携带可解析的模板 geometry/rule/pattern `template_refs`；模板沉默 + 欲自定 ⇒ unresolved 停止询问用户
- [x] 3.2 vendor 纪律成文：binding `component_system: shadcn` 时壳层必须从 vendor sidebar 原语（含 SidebarInset）起步，偏离记录理由与确认；写入 vendor rules 触发条件说明
- [x] 3.3 同步 Phase 2/4 路由闭合校验文档与相关 eval case（发明布局被拦 / vendor 偏离被拦）

## 4. Phase 8 scenario 派生扩张（环节 3）

- [x] 4.1 在 `derive_apply_scenarios.py`（或等价派生入口）实现：Active Instance 每条 placement geometry 记录 ⇒ 一条 computed-style/logical-geometry scenario；pattern 闭包每 pattern ⇒ 一条存在性+位置 scenario（section-nav 断言卡内左列）
- [x] 4.2 `apply-workflow.md` 与 quality-gates 文档同步派生规则与 missing-scenario fail-closed 对账要求
- [x] 4.3 eval case：派生集合少于应产数量 ⇒ verification 失败

## 5. 认证前置（环节 4）

- [x] 5.1 catalog promotion/replacement 入口校验：shell-bearing 模板（layout 声明 shell chrome composition）无当前 accepted certification report ⇒ 拒绝并输出稳定错误码
- [x] 5.2 确认 Apply checkpoint 校验继续拒绝 oracle identity 注入（现有 SOURCE_BLIND 校验回归 case）

## 6. example web 修复与全链验证（环节 2/3 落地）

- [x] 6.1 按 Impact-based Resume 重开 apply 会话（Phase 1/2 失效）：修正 LOCAL-PLACEMENT 规则引用 1.3.1 契约，AppShell 消费 vendor SidebarInset/inset 卡片几何，SettingsPage 二级导航改为卡内左列（pattern/section-nav）
- [x] 6.2 重跑 Phase 8：新增 geometry computed-style 与 section-nav 位置 scenario 全通过；checkpoint/apply-close 恢复 closed
- [x] 6.3 回归：`make validate`、`make test`、`make eval` 全绿（catalog drift 若 1.3.1 已按用户确认 promotion 则转绿，否则在报告记录为待决项）

## 7. 治理收尾

- [x] 7.1 更新 `AGENTS.md`/`governance/FUNCTIONAL-LOOP.md` 派生文档中与 capture 闭合、scenario 派生相关的表述（不重写 archive）
- [ ] 7.2 `.agents/skills/` allowlist 归属按用户决策落地（本 change 范围外仅记录，不擅动）——待用户决策：allowlist 扩容或迁移 skill；当前 3 个 active_release 测试因它失败
