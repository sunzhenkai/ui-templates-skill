# Tasks

- [x] 采集端：`template_authoring/chrome.py` 必答矩阵第三轮（chrome-containment / chrome-separation / state-decoration / trigger-anatomy），`mandatory_fact_gaps` / `mandatory_answer_states` 接受 contexts
- [x] 采集端：`capture.py` fact 模型新增 `container_role` property 与 `root|whole-trigger|split-trigger` 语义值；`NEGATIVE_FACT_INVALID` 拒绝正向语义标 negative
- [x] 投影端：`profile.py` `container_role` → region `parent` + 嵌套 contains 边；`anatomy` → component geometry properties；underline+negative 投影抛错
- [x] schema：fidelity sidecar `region.parent`、`geometryProperties.anatomy`、semanticValue 补 `icon-label|label-only|root|whole-trigger|split-trigger`
- [x] validator：sidecar `FIDELITY_STATE_DECORATION_CONFLICT` / `FIDELITY_REGION_PARENT_DANGLING` / `FIDELITY_CONTAINMENT_CONFLICT`（v2 validate_semantics 与 v1 `validate_fidelity_sidecar`）；v1 placement contains/owns 边与 parent 一致性
- [x] Apply：`derive_scenario_ids` 派生 `phase8:containment:` 与 `phase8:placement-containment:` scenario
- [x] 文档：repo-capture-format（第三轮矩阵、fact 语义闭集、NEGATIVE_FACT_INVALID）、extraction-layers（拓扑嵌套投影）、apply-workflow（Phase 2 嵌套硬约束与边框决策、Phase 4 触发器解剖与链接基线）、quality-gates（containment 断言、affordance 命中区、链接装饰基线）
- [x] 存量修正：`templates/workbench-shell/fidelity.yaml` 自相矛盾记录改 `none`+negative，catalog 副本同步
- [x] 镜像同步：`skills/ui-template-author/runtime`、`skills/ui-template-apply/runtime`、`skills/ui-template-design/runtime`
- [x] 测试：`tests/test_round3_mandatory.py`（矩阵四问、矛盾拒绝、嵌套投影、anatomy 投影、sidecar 检查、containment scenario）；fixtures 补 default 态装饰事实
- [x] 验证：`make test`、`make eval` 全绿；`make validate` 仅剩先于本 change 存在的 `CERTIFICATION_STALE`
- [ ] 后续（需用户单独发起）：从 multica session source 重采 workbench-shell 四类 facts、重投影嵌套拓扑并更新 `core/layout.yaml`，过 authoring gate 与 Template Certification Gate 后 promotion；ui-template-test 干净模式重建 example web 验证四缺陷消失
