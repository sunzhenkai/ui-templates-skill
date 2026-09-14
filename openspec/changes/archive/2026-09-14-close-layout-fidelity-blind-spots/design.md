# Design: close-layout-fidelity-blind-spots

## Context

本仓 capture→Generate→Apply→Phase 8 链路的保真上限由 capture graph 的事实闭包决定，而闭包校验（`template_authoring/chrome.py`）目前只强制 chrome 槽位闭合；`repo-capture-format.md` 的词表本可表达内容卡片几何与 section navigation（`inset_*`、`gap`、`radius`、`border`、`shadow`、`background` 均为合法 fact property），但没有任何机制强制作者作答。事故链：graph 缺事实 → fidelity 投影缺记录 → 模板 placement 无 geometry 授权 → Apply 以 `LOCAL-PLACEMENT-*` 发明 full-bleed/水平 Tabs → Phase 8 scenario 从同一份 fidelity 派生而共享盲区。既有 `design-system-placement-closure` spec 已含「Inset content region」「Content-local section navigation」要求，本设计是把 spec 要求下沉为 capture 必答与下游机器断言，不新造概念。

## Goals / Non-Goals

**Goals:**

- capture 必答事实矩阵机器强制（fail closed），骨架输出必答清单。
- fidelity 投影保留应答状态（observed / exclusion / unresolved 三态可见）。
- workbench-shell 模板 1.3.1 契约补全（内容卡片 geometry + rule + `pattern/section-nav` + NN-102 语义修正）。
- Apply 侧布局决策 trace 强制与 vendor 壳层原语纪律。
- Phase 8 scenario 派生随事实自动扩张（geometry ⇒ computed-style；pattern ⇒ 存在性+位置）。
- shell-bearing 模板 catalog promotion 强制认证前置。

**Non-Goals:**

- 不重写 archive 与 immutable history；不自动 publish/promote（catalog 1.3.1 切换仍需用户单独确认）。
- 不改已发布模板的 portable 校验路径（无 session source 不走 capture）。
- 不引入 LLM judge 或网络依赖；全部判定确定性可离线复现。

## Decisions

1. **矩阵实现位置：`chrome.py` 闭合规则扩展，而非新文件。** `chrome_fact_gaps` 已有「声明 anchor ⇒ 必须有 anchor_role 事实」的先例；inset 几何五项与 page_mode 必答项沿同一模式加为 gap 检查，错误码复用 `CHROME_COMPOSITION_INCOMPLETE` 同级新码（如 `MANDATORY_FACT_MISSING`）。备选「在 capture.py 单独校验层」被弃：闭合语义应内聚一处，避免两套 gap 逻辑漂移。
2. **必答项粒度：token-ref 即可，不要求精确值。** 矩阵只要求「有事实」（token-ref / 闭集语义 / 显式 negative 三选一），精确值继续由 `tokens.yaml` 唯一携带——与 spec「sidecar 只引用 token path」一致，不破坏值权威分层。
3. **page_mode 必答问题以 page-types 声明驱动，不新增图节点类型。** section navigation 作为 component/context 入图（现有 kind 闭集已覆盖），必答性由「page_mode × 问题」矩阵在闭合校验中查 presence；无法作答走既有 `exclusions`（理由枚举维持闭集，必要时扩 `insufficient-source`）。
4. **模板修复走候选重跑，不走原地补丁。** workbench-shell 1.3.1 从 graph 补事实开始重走 capture→Generate→Validate→Eval→Index 全链（staging 目录、promote 门禁），保证 replay 计数与新事实一致；避免「手改模板层绕过 capture」破坏可重放承诺。NN-102 断点描述修正与新 rule（LAYOUT-107）在 Generate 阶段产出。
5. **Apply trace 校验落在 Phase 2 路由闭合与 Phase 8 派生两端。** Phase 2 静态查 `placement_plan` 引用（模板 geometry/rule/pattern ID 可解析）；Phase 8 动态断言 computed style。两端都以 Active Instance 为事实源，不新增 schema 文件——`02-routes.yaml` 的 `placement_plan.local_rules` 旁增 `template_refs`（apply-workflow 文档性约束，非新 schema）。
6. **scenario 派生规则成文进 `derive_apply_scenarios.py` 已有入口**（若该脚本仅为骨架则补实现），规则：Active Instance 每条 placement geometry 记录产 1 条 geometry scenario；pattern 闭包每 pattern 产 1 条存在性 scenario。派生集合与 verification 的 missing-scenario fail-closed 校验对账。
7. **认证前置挂在 promotion 入口校验**（`check_catalog` / promotion 路径）而非 capture：壳层判定读模板 layout 的 shell chrome 声明；无 accepted certification report 即拒绝并给稳定错误码。认证链路本身不改（Visual Oracle 与 Equivalence Records 机制已在 CERTIFICATION-v1）。

## Risks / Trade-offs

- **capture 契约收紧是 fail-closed 前向变更**：旧 session-source graph 重放将失败——这是预期行为（暴露沉默项），fixtures 与 eval 同步更新以锁定新基线；已发布模板 portable 校验不受影响。
- **必答矩阵有维护成本**：新增 page_mode 时矩阵要同步——矩阵定义放在 chrome.py 单处常量，eval 增一条「矩阵自描述一致性」case 防漂移。
- **Phase 8 scenario 数量扩张**拉长验证时间：接受（正确性优先）；断言逐 token 粒度但截图仍按场景聚合，不逐 token 截图。
- **Apply「沉默即停止」可能打断自动化**：停止仅限布局形态类决策（本事故类），栈与文案等仍按现行规则；预期用户裁决频率低（模板补全后沉默项应趋零）。
- **web 修复按 Impact-based Resume 从 Phase 1 重开**（layout profile 语义变化触发 Phase 2 重开、证据过期）：工作量已知且可控，本 change 的 tasks 覆盖。
