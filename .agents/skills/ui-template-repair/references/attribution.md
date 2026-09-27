# 断点归因判定表与案例库

归因的唯一目标:回答「这个表面缺陷的信息,在 author → design system → apply 链路的哪一层丢失」。判定顺序按数据流走:先看**采集图**(源头有没有),再看 **fidelity/core**(投影后有没有),再看 **schema/validator**(有没有地方写、写了有没有人查),最后看 **apply 消费**(有没有义务消费、错误会不会被门禁抓住)。

## 判定表

### 断点 A — 采集盲区

**问**:source 里存在的事实,采集图(`governance/candidates/<name>/session-capture/ui-source-graph.yaml`)里有没有?

**看**:
- 采集图 `definitions/usages[].facts` 里搜相关 property(先查 `scripts/template_authoring/capture.py` 的 `FACT_PROPERTIES` 闭集确认该 property 是否存在)。
- `repo-capture-format.md` 的 Mandatory question matrix(rounds):该问题是否在必答清单里。**沉默与未作答等价**——不在矩阵里的问题,采集图大概率就没有。
- 两类高发盲区:
  - **负空间/否定性特征**(「侧栏没有边框」「分隔靠 canvas 不靠竖线」):正向事实有人问,否定事实没人问。特征是 source 靠「不做某事」实现视觉,采集协议只记录「做了什么」。
  - **结构嵌套**:采集只记平级 `slot_role/slot_order` 序列,「header 在卡内」这类 containment 无 property 可表达。
- **全局基线 vs 逐处 opt-in**:source 的全局 reset(如 preflight `a { text-decoration: inherit }`)产生的默认行为,按 context 闭包的采集模型天然漏掉「元素默认态」;下划线这类特征要区分「全局默认无、逐处 opt-in 有」的方向。

**证据形状**:采集图无该 fact + 必答矩阵无该问题 → 断点 A。

### 断点 B — 投影缺陷

**问**:采集图里有的事实,`fidelity.yaml` / `core/layout.yaml` 里还在吗?形状对吗?

**看**:
- `scripts/template_authoring/profile.py` 的 `facts_to_fidelity`:分组、投影目标、**硬编码**(曾把 relations 硬编码为「root contains 一切」,嵌套语义全丢)。
- 投影闭集:profile.py 里 state context/state 的合法值集合之外的名字被**静默归一**(如未知 context 归 `navigation-link`)——静默归一是投影层的数据损坏。
- negative facts 是否带过投影(`_negatives` 只认 `negative: true` 或特定语义值)。

**证据形状**:采集图有 fact → fidelity 无对应 record/字段,或形状被拍平 → 断点 B。

### 断点 C — schema/校验缺口

**问**:该语义有没有地方写?写了有没有人查?

**看**:
- `schemas/template/fidelity/v1/fidelity.schema.json`(sidecar)与 `schemas/design-system/v1/*.schema.json`(core):字段面是否存在(如 region 有没有 `parent`、geometry 有没有 `anatomy`)。
- validator 面:`scripts/validate_design_system.py`(v1 路径)与 `scripts/template_validation/fidelity.py`(sidecar 语义)——**v1 路径曾完全不检查 sidecar 语义**,sidecar 里的自相矛盾畅通无阻。
- **交叉矛盾无人查**:`core/rules.yaml` 的 statement 与 fidelity 记录值相反、或同一 record 内 `text_decoration: underline` 与 negative fact 并存——错误期望会被生成物「正确地」满足,门禁形同虚设。这是最危险的一类:门禁显示 passed,缺陷照样出货。

**证据形状**:schema 无字段,或字段存在但 validator 无对应检查 → 断点 C。

### 断点 D — 消费缺口

**问**:template 侧事实正确且完整,apply 侧会不会用错/漏用,错了会不会被抓?

**看**:
- `skills/ui-template-apply/references/apply-workflow.md` Phase 2/4:对应消费义务是否存在(如「placement 嵌套树是硬约束」「negative facts 禁止被组件库默认覆盖」——没有这些条文时,apply 遇到模板沉默就自由发挥,组件库默认边框/浏览器默认下划线直接补位)。
- `scripts/template_apply_state/fidelity.py` 的 `derive_scenario_ids`:Phase 8 的确定性 scenario 全集是否派生该维度。**scenario 不派生 = 门禁不测 = 错误实现照过**。
- 生成物 `.ui-template-apply/checkpoint.yaml` 与 `04-components.yaml`:看 apply 当时的决策——「模板未声明,我按常识实现」是消费缺口的直接口供。

**证据形状**:template 有事实 + apply 实现相反/多余 + Phase 8 无对应 scenario → 断点 D。

### 断点 E — 数据矛盾

**问**:模板自己是否先错了?

**看**:同一事实在 `core/rules.yaml`(自然语言)、`fidelity.yaml`(结构化)、`measured-expectations.yaml`(可测断言)三处是否一致。矛盾时,哪一处与 source 事实一致就以哪一处为修正方向。

**证据形状**:模板内部两处记载相反(且无 validator 拦截,叠加断点 C)→ 断点 E。

## 案例库:workbench-shell 四缺陷(2026-09)

| # | 用户报告 | source 事实(实测/源码) | 断点 | 修复落点 |
| --- | --- | --- | --- | --- |
| 1 | link 没对齐、有下划线 | preflight 使链接默认无下划线;下划线逐处 opt-in(`hover:underline`);图标+文字用 `inline-flex items-center` | E(存量 record `underline`+negative 自相矛盾,与 rules「do not underline」冲突)+ A(default 态装饰不必答)+ C(矛盾无交叉校验)+ D(Phase 8 state scenario 用了错误期望) | 必答矩阵 round3③ default 态 text_decoration;`NEGATIVE_FACT_INVALID`;`FIDELITY_STATE_DECORATION_CONFLICT`(capture/投影/validator 三层);存量矛盾记录修正为 none+negative |
| 2 | 左侧菜单有边框 | `Sidebar variant="inset"` 侧栏零 border,分隔靠 SidebarInset 的 ring+圆角+inset margin | A(「nav 无边框」负空间不在必答矩阵)+ D(模板沉默时 apply 以组件库默认加 `border-r`,无 scenario 抓) | 必答矩阵 round3② nav-group border 事实(token 或 none negative);apply Phase 2「未声明的边框是布局形态决策→unresolved」;negative facts 禁止默认覆盖 |
| 3 | 下拉图标无法点击 | 整 trigger 是 button,chevron 是内部装饰(`pointer-events-none`),点图标必开 | A(select/combobox 无 anatomy 采集)+ C(schema 无触发器结构字段)+ D(无命中区验证;实测坐实:chevron 中心在 `<select>` bbox 外,穿透点到无关元素) | 必答矩阵 round3④ anatomy(`whole-trigger/split-trigger`);投影进 geometry;apply Phase 4 按解剖实现;quality-gates「affordance 命中区」验证域 |
| 4 | header 应在内容 card 里 | header 在 SidebarInset(卡)内部,`h-12 border-b` | A(采集只有平级 slot 序列,无 containment)+ B(投影硬编码 root contains 一切)+ C(layout schema 有 `parent` 字段但没人填、无一致性校验) | 必答矩阵 round3① container_role;投影生成 region `parent`+嵌套 contains 边;validator parent 悬空/边冲突;Phase 8 containment scenario(bbox 包含断言) |

**模式总结**:四缺陷的共同形态是「采集端不问 → 投影端没载体 → 消费端无强制」,所以任何单点补丁(只在 apply 加一条纪律)都会被下一轮重建冲掉;三层同时落 fail-closed 才闭合。

## 实测技巧(Step 1)

- **点击探针**:取 affordance 元素 `getBoundingClientRect()` 中心坐标,先断言中心是否落在触发控件 rect 内,再 `page.mouse.click(x, y)` 观察效果。本案例中「无法点击」的真实机理就是图标中心在控件外。
- **结构关系**:`元素A.getBoundingClientRect()` 是否被 `元素B` 的 rect 完全包含——判定 header 在卡内/卡外比读 JSX 更可靠。
- **computed style 语义**:静息 `text-decoration-line: underline`(即使颜色透明)与 `none` 是不同的机制事实;采集与验证都要用 computed 值,不用 class 名推断。
