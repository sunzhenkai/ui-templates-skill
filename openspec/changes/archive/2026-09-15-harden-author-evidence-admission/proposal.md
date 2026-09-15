# Proposal: harden-author-evidence-admission

## Why

Authoring 目前保证 package 自洽与 provenance 可解析，但缺少**单条声明级**的准入判据：一条 token/rule/pattern 只要能被写出、且 evidence 可解析，就会进入 package。结果是「重复出现」「局部样式」「视觉偏好」可以被写成产品级规则，prose/rules 沉积不改变实现选择的句子，更新时还能静默删掉已接受的既有决策——三者都不触发任何 gate。参照 `create-design-md` 的证据纪律（三证准入、recurrence 阈值、consequence-bearing prose、更新 diff 回归守卫），把 Author 的准入从「能写出来」收紧为「能证明该被写出来」，同时不改变现有闭环不变量（生成物不是修复面、Apply source-blind、package 只含 portable 语义）。

## What Changes

- **单条声明的三证准入**：任何提升进 package 层的声明 SHALL 同时具备 Observation（可观测证据）、Basis（可复核依据）与 Consequence（对具体实现选择的影响）；缺一即 omit，SHALL NOT 降级写入到任意层。
- **Recurrence 门槛**：声明为产品/站点级 scope 的声明 SHALL 在同一 role 上跨至少两个已采样 surface 复现；否则 scope 收窄到单 surface。evidence 增补 `scope`（`surface | product`，缺省 `surface`）与 `recurrence_refs`。
- **Consequence-bearing prose 与 no-op pass**：package 层 prose/rules SHALL 只保留会改变实现选择的陈述；最终 pass SHALL 删除不改变产物的句子与泛泛建议。
- **非静默移除守卫（BREAKING）**：update 移除 active stable entity/rule ID 时 SHALL 显式记为 `retired`/`superseded` 并给出替代或理由，report SHALL 列出移除集；静默删除 SHALL 被 change-set gate 拒绝。
- 统一校验通道增补稳定错误码：package validator 报 `CLAIM_ADMISSION_INCOMPLETE`、`RECURRENCE_UNSUPPORTED`，change-set gate 报 `SILENT_DECISION_REMOVAL`；evidence schema 增补 `scope`/`recurrence_refs`；fixtures/eval 补正例与反例。
- 同步 skill/reference 文档（`skills/ui-template-author/SKILL.md`、`references/source-*.md`、`extraction-layers.md`、`authoring-report.md`）写入准入测试、recurrence 门槛、no-op pass 与移除集报告要求。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `design-system-authoring`: 新增「Claim evidence admission」「Recurrence-gated scope promotion」「Consequence-bearing prose and no-op pass」「Non-silent decision removal」四项要求。
- `design-system-contract`: 新增「Evidence admission and recurrence consistency」，规定 validator 的三条新交叉校验与稳定错误码，以及 evidence schema 的 `scope`/`recurrence_refs` 字段语义。

## Impact

- **代码面**：`schemas/design-system/v1/evidence.schema.json`（新增 `scope`/`recurrence_refs` 及条件约束）、`scripts/validate_design_system.py`（`CLAIM_ADMISSION_INCOMPLETE`/`RECURRENCE_UNSUPPORTED`/`SILENT_DECISION_REMOVAL` 三条交叉校验）、`scripts/run_authoring_gate.py` 与 `scripts/manage_template_index.py check-changeset`（移除集守卫）、`skills/ui-template-author/{SKILL.md,references/*}`、共享 validator 副本同步（`scripts/sync_design_system_validator.py`）、fixtures/eval/baseline。
- **兼容性**：新增校验为 fail-closed 前向收紧。`scope` 缺省为 `surface`，历史 package 不因缺字段失败；但声明 `scope: product` 时新约束立即生效，既有 `templates/workbench-shell` 若存在单 surface 却声明 product scope 的 evidence 将在下次校验失败，需收窄 scope 或补齐 recurrence。移除守卫使「rewrite 时顺手删 ID」从静默变为显式声明。
- **非目标**：不引入 `create-design-md` 的单文件 `DESIGN.md` 产物模型；不改 package 内 `evidence.yaml` 作为 provenance 权威的设计（不采用「产物内不得有 citation/audit」的绝对禁令，只要求 prose/rules 干净）；不改 `.agents/skills` 与 public skill 镜像；不重写 `openspec/changes/archive/**`、`skills/**/patches/**`、`skills/**/experience/**`；不自动 publish/tag/promote/archive。**不包含**「多来源优先级」与「已安装 spec 版本探测」两项——前者可由现有 source 路由吸纳、后者已由 pinned `design-system/v1` 契约覆盖，如需另开 change。
- **依赖关系**：与 archive 的 `close-fidelity-truth-gaps` 在 `design-system-contract` 的 provenance 校验相邻；本 change 以新增 requirement 与新增字段落地，不改写既有「Provenance, coverage and confidence consistency」，避免 archive 冲突。
