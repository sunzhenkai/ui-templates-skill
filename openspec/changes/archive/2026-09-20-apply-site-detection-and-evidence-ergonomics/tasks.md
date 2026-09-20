## 1. 判定器语义修正

- [x] 1.1 `scripts/template_apply_state/state.py` 的 `detect_architecture_site` 跳过集合增加 `.ui-template-design`
- [x] 1.2 同步镜像：`skills/ui-template-apply/runtime/template_apply_state/state.py`、`skills/ui-template-author/runtime/template_apply_state/state.py`
- [x] 1.3 `tests/test_template_apply_state.py` 新增 `test_architecture_site_ignores_active_instance_state_dir`
- [x] 1.4 eval `apply_architecture_contracts` 增 `active_instance_ignored` 断言（`scripts/contract_eval/runner.py` + fixture + author runtime 镜像）
- [x] 1.5 同步 fixture_sha256：`governance/eval/deterministic-baseline.json`、`skills/ui-template-author/runtime/deterministic-baseline.json`（含共用该 fixture 的 `apply-session-closed-delete-hint`）、`skills/ui-template-apply/{evals,runtime/evals}/cases.yaml`
- [x] 1.6 文档级联：`apply-workflow.md` Phase 0 判定说明；`ui-template-test clean-mode.md` 移除「判定器已知局限」workaround

## 2. scenarios 只读子命令

- [x] 2.1 `check_template_apply_state.py` 新增 `scenarios --fidelity --layout --expectations`，输出与 `derive_scenario_ids` 同源全集
- [x] 2.2 同步镜像 `skills/ui-template-apply/runtime/check_template_apply_state.py`
- [x] 2.3 测试：CLI 输出与 `derive_scenario_ids` 一致、无输入时为空集
- [x] 2.4 `apply-workflow.md` Phase 8 前置枚举步骤

## 3. artifact-lint 只读子命令与产物纪律

- [x] 3.1 `check_template_apply_state.py` 新增 `artifact-lint`（可解析 / 无裸日期 / digest 对象形状 / 可 canonical 编码）
- [x] 3.2 同步镜像
- [x] 3.3 测试：好样例通过；坏样例（裸日期 + 字符串 digest + flow 裸量）逐项报告
- [x] 3.4 `apply-workflow.md` 增「产物写时纪律」与 Phase 9 字段复制要求

## 4. 取证方法论与身份对照文档

- [x] 4.1 `toolchain.md` 增「current-build computed-style 取证方法」（probe 元素、canvas 归一化与 color-mix 限制、focusVisible、CDP AX、data-slot 锚点）
- [x] 4.2 `active-implementation.md` 增「Identity / digest 对照表」

## 5. 验证

- [x] 5.1 `make test` 通过（213 tests）
- [x] 5.2 `make eval` 通过（71/71 executed，failures 空）
- [x] 5.3 `make validate` 无新增 finding（唯一 finding 为先于本 change 的 `CERTIFICATION_STALE`，需单独请求 re-certification）
- [ ] 5.4 `openspec validate --all --strict`：本机无 openspec CLI 且 npm 无该包，未执行；已按 archive 格式做结构自检（文件齐全 / ADDED Requirements / 6 scenarios），待有 CLI 环境补跑
