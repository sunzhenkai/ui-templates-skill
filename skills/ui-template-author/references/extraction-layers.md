# 分层抽取

L0–L6 只是变更集合的标签，不是七层完成仪式。从源创建或更新必须声明**本次改哪些路径或组件**；未纳入的文件保持原字节。禁止用“3–5 个代表组件”冒充完整 coverage。

## 拓扑嵌套投影（L1/L3）

`core/layout.yaml` 的 placement regions 不是必然平级。采集图中 `container_role` 事实（如 inset 壳里 `page-header` / `page-toolbar` 的容器是 `page-canvas`）必须投影为 region 的 `parent` 与对应 `contains` 关系；validator 对 parent 悬空、parent 与 contains 边不一致 fail closed。把「卡内 header」拍平成「root 平级子节点」会直接导致 Apply 把 header 实现在内容卡外——投影时丢失嵌套等同于伪造拓扑。同理，`nav-group` 等侧栏 slot 的 border 事实（token-ref 或 `none` negative）必须保留：inset 壳「侧栏无边框、分隔由 canvas 提供」的负空间事实缺失时，Apply 会以组件库默认边框补位。

## 声明准入（写入前的统一前置）

四种来源（web/repo/image/doc）只决定**如何采集**；写入 package 前的准入判据一致。每条候选声明必须过三证，缺一即 omit，不得降级写入：

1. **Observation**：来自 `meta.sources[]` 已声明来源的可观测证据（evidence `locator`）。
2. **Basis**：可复核依据（`method`、可解析 revision，或带 `basis`/`decision_id` 的 default）。
3. **Consequence**：evidence `target` 解析到已声明的 token 路径或 stable entity/rule id，且该声明会改变 Apply 的实现选择。

scope 分 `surface` 与 `product`：`product` 声明要求同一 role 上 ≥2 distinct sampled surface 的 recurrence 证据；不足时收窄为 `surface`，不得用单 surface 证据冒充产品级规则。

Index 前执行 no-op pass：删除组件清单式罗列、对 YAML 具名值的重复散文、以及「保持精致」「注意一致性」一类不改变产物的句子。保留的每条 statement 必须指向具体 token/pattern/state/choice。

## 标签（可选，用于命名变更集合）

| 标签 | 典型路径 |
| --- | --- |
| L0 身份 | `design-system.yaml` + `meta.yaml`；旧 v2 为 `meta.yaml` sources / revision / conformance |
| L1 壳 / chrome | `core/layout.yaml`；旧 v2 为 `fidelity.yaml` layout_scenes |
| L2 Token | `core/tokens.yaml`、`core/evidence.yaml`；旧 v2 为 `tokens.yaml`、`evidence.yaml` |
| L3 Scene / 路由 | `core/layout.yaml` + `core/page-types.yaml`；旧 v2 为 `routes-and-layouts.md` |
| L4 原子组件 | `core/primitives.yaml`；旧 v2 为 `components.md` 基础控件 |
| L5 复合组件 | `core/patterns.yaml`；旧 v2 为 page-header、list-grid、dialog 等 |
| L6 Apply 映射 | `apply/playbook.md`、`quality.md` |

## 壳展示形态（来源出现才写）

L1 只记录槽位/拓扑；同一壳如何展示写在 L3 / `platforms/*.md`。来源若出现下列变化，必须用 `LAYOUT-###` / `RESP-###` 写清，**不得**用 `shrink` 或 `state_presentations.visibility` 代替：

1. **形态**四选一（可多条）：在文档流展开 / 收成 rail 仍占位 / 离开布局 / 变为 overlay。
2. **触发**分开写：断点 vs 用户开关，禁止合成一条规则。
3. 折叠或离开后，**同一组目的地是否仍可达**；trigger 落在哪个 region。
4. 宽度只进 `tokens.yaml`。有 sidecar 时：rail → `rail` slot，覆盖 → `overlay` + 已声明则闭合的 `header-trigger`。
5. 来源只展示一种形态：其余标 `unsupported`；**禁止**套用其他模板的 expanded/collapsed/overlay 配方。

未出现这些变化时本节不适用，不补默认三态。

## Intake

本次从源导入或从源更新开始前必须冻结并报告 capability（`tokens-only | ui-kit | page-system`）、

- session source 与将写入的 source ID / revision；
- **本次变更集合**（路径和/或组件名单；可用上表标签分组）；
- conformance：默认 structural；style-only 需要理由。

未声明变更集合不得 Generate-from-source。未纳入本次集合的文件保持原字节，不得借“整理文档”重写。用仓库脚本核对：

```bash
python3 scripts/manage_template_index.py check-changeset \
  --before <previous-template-dir> --after <candidate-dir> \
  --allow <relative-path> [--allow ...]
```

安装环境把 `scripts/` 换成 `ui-template-author/runtime/manage_template_index.py`。部分变更失败则整次不 Index。

## 诚实覆盖

声称“常用组件已有规格”时，这些名字在 `coverage.components` 必须是 observed 或 unsupported。defaulted 可以存在，但不能支撑高度一致，也不得把 `confidence.components` 写成 high。无 session source 时不得把 defaulted 抬成 observed。
