# Proposal: apply-site-detection-and-evidence-ergonomics

## Why

一次完整的 workbench-shell example web 重建（ui-template-apply greenfield bootstrap Phase 0–9）暴露了三个结构性缺口，全部呈现「链路末端 fail-closed 才发现」的形态：

1. **adopt 后判定翻转**：`detect_architecture_site` 跳过 `.git`/`.ui-template-apply` 但不跳过 `.ui-template-design`。adopt-only bootstrap 把 Active Instance 落进输出根后，greenfield 声明与重探结果必然失配（`ARCHITECTURE_SITE_MISMATCH`），会话被迫谎报 `site: existing` 才能过门禁。`ui-template-test` clean-mode 文档已把该行为记载为「判定器已知局限」并给出 `--explicit-greenfield` workaround，说明历次轮次反复踩中。
2. **Phase 8 证据集合不可前置枚举**：required scenario 全集由 `derive_scenario_ids` 确定性派生，但只有 checkpoint 子命令内部调用；会话只能在最终门禁发现漏覆盖（本次漏 2 条 `component_geometry` 场景）。
3. **apply 产物作者态错误事后暴露**：flow 序列裸量（`?`/`@`/中文）、`key: -`、裸日期、digest 字段填成身份字符串、Phase 9 记录与 Phase 8 字段措辞不一致——全部在 checkpoint/verification 门禁才 fail，缺写时校验与纪律文档。

另有取证方法论（token computed-style 序列化差异、focus-visible 采集、AX tree API、slot 顺序 DOM 锚点）只存在于会话经验中，未沉淀为 skill 文档。

## What Changes

- **判定器语义修正（BREAKING for detector）**：`detect_architecture_site` 的会话状态目录跳过集合增加 `.ui-template-design`；输出根只凭应用源码/依赖清单判 `existing`，Active Instance 状态目录不再参与判定。
- **`scenarios` 只读子命令**：`check_template_apply_state.py scenarios --fidelity --layout --expectations` 输出 Phase 8 必备 scenario 确定性全集（与 checkpoint fail-closed 集合同源同值），Apply 会话在采集前枚举。
- **`artifact-lint` 只读子命令**：对单个 apply 产物做写时校验——YAML 可解析、无裸日期、digest 字段为 `{algorithm, value}` 对象、可 canonical JSON 编码；把 checkpoint 末端错误提前到写完当下。
- **skill 文档增补**：apply-workflow（产物写时纪律、Phase 8 前置枚举、Phase 9 记录字段从 Phase 8 复制）、toolchain（current-build computed-style 取证方法：probe 元素、canvas 归一化与 color-mix 限制、focusVisible、CDP AX、data-slot 锚点约定）、active-implementation（身份/digest 对照表）；`ui-template-test` clean-mode 移除「判定器已知局限」workaround 段落。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `design-system-implementation`: 新增「Architecture site detection ignores session state」（判定器跳过会话状态目录）与「Derivable Phase 8 scenario enumeration」（采集前可枚举全集）；新增「Apply artifact write-time lint」（产物写时校验入口与纪律）。

## Impact

- **代码面**：`scripts/template_apply_state/state.py`（跳过集合）与镜像 `skills/ui-template-apply/runtime/template_apply_state/state.py`、`skills/ui-template-author/runtime/template_apply_state/state.py`；`scripts/check_template_apply_state.py`（两个新子命令）与镜像 `skills/ui-template-apply/runtime/check_template_apply_state.py`；eval `apply_architecture_contracts`（runner + fixture + cases/baseline 的 fixture_sha256）及 `skills/ui-template-author/runtime/{contract_eval/runner.py, fixtures/eval/apply-hygiene-contracts.yaml, deterministic-baseline.json}`、`governance/eval/deterministic-baseline.json`、`skills/ui-template-apply/{evals, runtime/evals}/cases.yaml`。
- **文档面**：`skills/ui-template-apply/references/{apply-workflow,toolchain,active-implementation}.md`；`.agents/skills/ui-template-test/references/clean-mode.md`（级联清理）。
- **兼容性**：判定变化只放宽 greenfield（新增跳过目录），`existing` 判定不受影响；既有 checkpoint 若因该误报谎报过 `site: existing`，属历史数据，恢复校验按现探测结果处理。两个新子命令均为只读新增，不改任何门禁语义。
- **非目标**：不改 schema、不改 checkpoint/verification fail-closed 规则、不重写 immutable history、不自动 publish/tag/archive；`make validate` 既有 `CERTIFICATION_STALE`（candidate 认证过期，先于本 change 存在）不在本 change 修复面内。
