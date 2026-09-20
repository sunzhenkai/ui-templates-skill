# 修复落点清单、存量兼容与验证

## 落点清单(按数据流顺序)

修复必须让「新采集的数据 → 新投影 → 新校验 → 新消费」整条链闭合。只落其中一层等于没修。

| # | 层 | 文件 | 动作 |
| --- | --- | --- | --- |
| 1 | 必答矩阵 | `scripts/template_authoring/chrome.py` | 新 round:问题判定逻辑(沉默 → `MANDATORY_FACT_MISSING`);`mandatory_fact_gaps`/`mandatory_answer_states` 需要新维度(如 contexts)时扩签名并同步调用点(`capture.py` 主流程、`profile.py` 投影) |
| 2 | fact 模型 | `scripts/template_authoring/capture.py` | `FACT_PROPERTIES` 补 property;`SEMANTIC_VALUES` 补闭集值;矛盾 fact 拒绝(参照 `NEGATIVE_FACT_INVALID`:正向语义标 `negative: true` 一律拒绝) |
| 3 | 投影 | `scripts/template_authoring/profile.py` | 新 property 的投影目标(fidelity record/region/geometry);**禁止静默归一**(未知值丢弃/改名)与硬编码拍平(嵌套、negative);投影层对自相矛盾输入抛错兜底 |
| 4 | sidecar schema | `schemas/template/fidelity/v1/fidelity.schema.json` | 字段面跟上(`region.parent`、`geometryProperties.anatomy`、`semanticValue` 枚举);`_validate` 闭集同步 |
| 5 | core schema | `schemas/design-system/v1/*.schema.json` | 仅当 core 层需要新字段;已有字段(如 layout region 的 `parent`)优先用起来而不是另起炉灶 |
| 6 | validator | `scripts/validate_design_system.py`(v1)+ `scripts/template_validation/fidelity.py`(sidecar 语义) | 新检查 fail closed;v1 路径确认 sidecar 语义真的被查(它曾完全不查);报错码进 `tests/` 与文档 |
| 7 | apply 消费 | `skills/ui-template-apply/references/apply-workflow.md`(Phase 2/4 消费义务)、`quality-gates.md`(验证域) | 「模板沉默 → unresolved 等用户裁决」「negative facts 禁止被组件库默认覆盖」类条文;指明新事实类型怎么消费 |
| 8 | scenario 派生 | `scripts/template_apply_state/fidelity.py`(`derive_scenario_ids`/`project_layout`) | 新维度派生确定性 Phase 8 scenario(`phase8:<kind>:...`);**不派生 = 门禁不测** |
| 9 | 协议文档 | `skills/ui-template-author/references/repo-capture-format.md`(新 round + fact 语义闭集)、`extraction-layers.md`(投影规则) | 机器强制对应的人读版本;写清「为什么」(负空间、嵌套、解剖各自丢过什么) |
| 10 | runtime 镜像 | `skills/ui-template-author/runtime/`、`skills/ui-template-apply/runtime/`、`skills/ui-template-design/runtime/` | 逐字节同步全部被改的 `scripts/**.py` 副本(含 `shared_validate_design_system.py` 三份);`tests/test_repo_capture.py` 的 sync 测试与 `check_active_release.py` 的 `SHARED_VALIDATOR_DRIFT` 会守这条 |
| 11 | 存量矛盾数据 | `templates/<name>/fidelity.yaml` + `skills/ui-template-author/catalog/<name>/` | 仅断点 E:把矛盾记录修正到与 rules 及 source 事实一致的方向;catalog 副本必须同步(否则 `test_catalog` 红) |

## 存量兼容原则

- **不追溯**:新校验只对显式使用新结构的模板生效。例:containment 一致性检查只查「region 声明了 `parent`」的模板;存量平级模板零影响。这样 `make validate` 不会因历史数据被打红。
- **例外是自相矛盾数据**(断点 E):矛盾记录在任何时刻都是错的,立即修正——但只修「自洽性」,不趁机重写内容;内容级更新(补嵌套拓扑、新 facts)属于重采,留给后续闭环。
- **语义放宽规则**:一致性检查要注意 relation 类型差异——`contains`/`owns` 是容器语义(边 from 必须 == parent),`horizontal`/`vertical`/`overlay` 是兄弟/覆盖语义(from 不要求是 parent)。把所有边都按容器校验会误伤存量。
- 改共享 fixture(`tests/fixtures/repo-capture/`)会连带 fixture git revision、closure digest、negative 计数三个硬编码常量,一起更新(`tests/test_repo_capture.py` 顶部)。

## 验证

1. **回归测试**(参照 `tests/test_round3_mandatory.py` 的结构):每类断点至少一正一反——必答沉默 fail / 作答通过;矛盾 fact 拒绝 / 合法 fact 通过;投影形状断言(parent、contains 边、anatomy);scenario 派生含新 ID;validator 报错码命中。测试优先直接构造最小 graph/receipt 做单元测试,不动共享 fixture(fixture 改动有连锁)。
2. **治理命令**:`make test`、`make eval`、`make validate` 全跑。
3. **存量失败先在性判定**:失败出现时 `git stash` → 重跑 → `git stash pop`;改动前就红的(如 `CERTIFICATION_STALE`)归档为存量债,写进 openspec change 的非目标,**不得顺手修**(认证重跑是独立治理动作)。
4. **openspec change**:`openspec/changes/<date>-<slug>/` 必含 proposal(Why 用本批缺陷的真实归因、Impact 列全部落点与镜像)、specs delta(ADDED Requirements + Scenario)、tasks(含「后续需用户单独发起」项)。

## 后续闭环(呈报给用户,不自动执行)

机制修复的验收最终要靠一次重建,但以下动作治理上都需要用户单独确认:

1. **重采模板**:以本机 source 作 session source(用户本会话授权),按新必答矩阵补 facts、重投影、更新 `core/` 对应层;走 `update-from-source` 的变更集合声明。
2. **认证**:`run_template_certification.py` 全流程 + `governance/release/CERTIFICATION-v1.md`;`CERTIFICATION_STALE` 类存量债在此一并闭合。
3. **promotion**:candidate → 生产 `templates/` 与 catalog,用户确认。
4. **重建验证**:`.agents/skills/ui-template-test` 干净模式重建 template + example web,逐条核对缺陷清单消失。

在修复报告里把这四步列为「后续(需用户单独发起)」,并给出本批缺陷的逐条验收断言(实测哪种 computed style / bbox / 点击结果算通过)。
