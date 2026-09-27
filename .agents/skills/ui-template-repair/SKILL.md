---
name: ui-template-repair
description: 本仓库模板链路的缺陷归因与机制修复。当用户报告「从模板生成的 example web 对比 source/原版有视觉或交互差异」(链接样式、边框、下拉交互、header 位置等),尤其带「不要直接修 example、要从 author → design system → apply 机制看」类要求时,必须使用本 skill;ui-template-test 重建后仍复现的系统性偏差也走本 skill。本 skill 把每个表面缺陷归因到采集/投影/schema/校验/消费五类机制断点之一并修复机制,不修改生成物;单点实现 bug 或不涉机制链的页面问题不属于本 skill。
metadata:
  internal: true
---

# ui-template-repair

repository-only 机制修复器:输入是「生成物 vs source 的缺陷清单」,输出是「缺陷 → 机制断点 → 修复」的闭环。它只拥有**归因与机制修复流程**;模板生命周期语义归 `skills/ui-template-author`,Apply 语义归 `skills/ui-template-apply`,端到端重建验证归 `.agents/skills/ui-template-test`,认证与 promotion 归 `governance/release/`。本 skill 不进公开 bundle,不得复制生产 skill 的阶段定义。

## 铁律(违反任何一条即走偏)

1. **生成物不是修复面。** `example/**/web*` 是治理排除项;在生成物上打补丁等于伪造验证证据,机制缺陷会在下次重建复现。用户明确说「直接把 example 改对」时,先呈报机制归因,由用户显式改派。
2. **未归因的缺陷不得修复。** 每个表面缺陷必须先回答「信息在哪一层丢失」,拿到文件级证据,才能进入修复。找不到断点的缺陷如实报告「无法归因,疑似单点实现失误」,不强凑机制解释。
3. **修复必须落成 fail-closed 的机器强制。** 首选:采集必答矩阵(沉默即 `MANDATORY_FACT_MISSING`)、validator 新检查、scenario 派生。纯散文规则(references 里加一段「注意 XX」)不算修复——本次案例证明,散文规则("links do not underline")存在的同时错误照样穿透门禁。
4. **机制修复 ≠ 存量模板修复。** 修好机制只保证「下次重采正确」;存量模板重采、certification、promotion、example 重建是需要用户单独确认的后续(见 Step 5),不得自动执行。

## Step 1 — 冻结缺陷清单(实测,不轻信措辞)

把用户的口语缺陷逐条转成**可实测断言**。用户说「图标无法点击」,真实机理可能是图标落在命中区外、被遮挡、事件未绑定——每种机理指向不同断点。对生成物逐条实测(浏览器不可用时用生成物自带的 Playwright):

- 视觉缺陷:computed style(`getComputedStyle` 的 text-decoration/border/radius/box-shadow)+ bounding box 之间的包含/对齐关系。
- 交互缺陷:点击探针——取 affordance 图标中心坐标,断言其是否落在触发控件 bounding box 内,再实际点击观察效果。
- 结构缺陷:两元素的 DOM 嵌套 + bbox 包含关系(谁在谁里面)。

输出:缺陷编号、用户原话、实测断言与结果、涉及元素。同时**定位三份资产**并核对身份:

| 资产 | 位置 | 身份核对 |
| --- | --- | --- |
| source | `meta.sources[].revision` 指向的 checkout(本仓惯例在本机 sibling 目录) | `git cat-file -t <revision>` 可解析;工作树状态记录在案 |
| template | `templates/<name>/`(七层 `core/` + `fidelity.yaml` + `meta.yaml`) | INDEX 状态、`design-system.yaml` digest |
| 生成物 | `example/<name>/web*` | `.ui-template-apply/checkpoint.yaml` 的 template digest 与当前模板一致 |

source 不在本机时:只做 template ↔ 生成物两侧归因,缺陷报告里明确「source 侧证据缺失」;**禁止**按 `meta.sources[].ref` 联网取源补齐(那是 Authoring session source 语义,见 `source-repo.md`)。

## Step 2 — 三方取证

对每个缺陷,并行收集三方事实(只读;可派子 agent 分头调查,但每条结论必须带文件路径与行号):

1. **source 怎么做**:确切的 class/组件结构/全局 reset。注意区分「逐处 opt-in」与「全局默认」——例如链接无下划线来自 preflight 全局 reset,而下划线是逐处 `hover:underline`,两者的机制含义完全不同。
2. **template 是否表达**:在七层 `core/`、`fidelity.yaml`(含 `mandatory_answers`/`negative_facts`)、`measured-expectations.yaml` 里找对应事实。判定三态:有明确表达 / 部分表达 / 完全沉默。同时查**采集图**(`governance/candidates/<name>/session-capture/ui-source-graph.yaml`):事实是采集时就没问,还是采到了但投影丢了——这一步区分「采集盲区」与「投影缺陷」。
3. **生成物怎么实现**:当前代码与实测结果(Step 1 已有),以及 apply checkpoint 里对应 phase 的记录(placement plan、semantic decision、verification)——看 apply 是「自由发挥」还是「忠实实现了错误的模板」。

输出「缺陷 × 三方」对照表,每格一行结论 + 证据指针。

## Step 3 — 断点归因

对每个缺陷,判定信息丢失在哪一层。读 [references/attribution.md](references/attribution.md) 的判定表与案例库后再归因。五类断点:

| 断点 | 标志 |
| --- | --- |
| A 采集盲区 | 采集图里没有该事实;必答矩阵(`repo-capture-format.md` 的 rounds)没问该问题 |
| B 投影缺陷 | 采集图有,`fidelity.yaml`/`core/` 里没有或被拍平(如嵌套变平级、negative 丢失) |
| C schema/校验缺口 | schema 无处可写该语义,或写了但 validator 不查(含 rules 与 fidelity 自相矛盾无人查) |
| D 消费缺口 | template 有事实,但 apply 无消费义务、Phase 8 scenario 派生不含该维度,错误实现照过门禁 |
| E 数据矛盾 | 模板内部自相矛盾(如 `text_decoration: underline` 同时登记 negative fact),错误期望被错误实现「满足」 |

一个缺陷可能叠加多层(典型链:A+C+D)。归因结论写入报告:「缺陷 N → 断点 A/E,证据……,修复落点……」。

## Step 4 — 机制修复

按 [references/fix-surface.md](references/fix-surface.md) 的落点清单实施,骨架:

1. **采集端**:必答矩阵加问题(`scripts/template_authoring/chrome.py` + `repo-capture-format.md` 新 round),fact 模型补 property/语义值。
2. **投影端**:`scripts/template_authoring/profile.py` 把新事实投影进 fidelity/core(嵌套、negative、anatomy)。
3. **schema**:`schemas/template/fidelity/v1/` 与 `schemas/design-system/v1/` 字段面跟上。
4. **validator**:新检查 fail closed;对存量兼容(见下)。
5. **apply 消费面**:`apply-workflow.md`/`quality-gates.md` 消费义务 + `template_apply_state/fidelity.py` scenario 派生。
6. **镜像同步**:三个 skill 的 runtime 副本逐字节同步(`skills/ui-template-{author,apply,design}/runtime/`)。
7. **存量矛盾数据**:仅当模板数据自相矛盾(断点 E)时,把矛盾记录修正到与 rules 及 source 事实一致的方向,并同步 `skills/ui-template-author/catalog/` 副本;否则不动存量模板内容。

**存量兼容原则**:新检查只对显式声明新结构的模板生效(如 region 声明了 `parent` 才查嵌套一致性),不追溯旧模板——否则 `make validate` 被历史数据打红,而历史数据的正确修复路径是重采(Step 5),不是在本 skill 里手改。

## Step 5 — 验证与闭环

1. **回归测试**:用本批缺陷的真实形状写正反例测试(参照 `tests/test_round3_mandatory.py`):必答沉默 fail、矛盾 fact 拒绝、投影形状断言、scenario 派生、validator 报错码。
2. **治理命令**:`make test`、`make eval`、`make validate` 全部执行。存量失败用 `git stash` 判定**先在性**:先于本次改动存在的失败(如 `CERTIFICATION_STALE`)如实归档为存量债,不在本 skill 修复面内,不得顺手修。
3. **openspec change**:新建 `openspec/changes/<date>-<slug>/`(proposal + specs delta + tasks),修复面与存量债、后续项写清。
4. **后续闭环(需用户单独发起,本 skill 只呈报)**:从 session source 重采模板(补新 facts、重投影)→ authoring gate → Template Certification Gate → promotion → `ui-template-test` 干净模式重建 example 验证缺陷消失。见 [references/fix-surface.md](references/fix-surface.md) 末节。

## 路由边界

| 情况 | 去向 |
| --- | --- |
| 缺陷归因后确认是单点实现失误,机制无断点 | 呈报后停;不进入本 skill 修复面 |
| 用户要重建 template/example 验证机制修复 | `ui-template-test`(干净/增量模式) |
| 机制修复涉及模板从源重采、certification、promotion | `ui-template-author` 流程 + `governance/release/CERTIFICATION-v1.md`,promotion 需用户确认 |
| 用户在消费项目里报告 Apply 页面问题(不涉本仓机制) | `ui-template-apply` 的 Phase 9 feedback 链路 |
