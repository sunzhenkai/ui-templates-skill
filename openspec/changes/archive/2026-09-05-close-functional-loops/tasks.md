## 1. 文档与治理

- [x] 1.1 写入 `governance/FUNCTIONAL-LOOP.md`，并在 AGENTS/README/scope 引用
- [x] 1.2 将 `example/workbench-shell/web/**` 加入治理排除；保留 `web-v2/**`
- [x] 1.3 将 `docs/functional-loop-review.md` 标为 superseded
- [x] 1.4 修正 `example/workbench-shell/prompts/CMD.md`

## 2. Authoring 生命周期与分层

- [x] 2.1 增加 `template-lifecycle.md` 与 `extraction-layers.md`
- [x] 2.2 更新 Authoring SKILL、spec-format、source-repo、manager 路由
- [x] 2.3 INDEX 增加状态列；validator 校验 published/retired/orphan
- [x] 2.4 增加 `scripts/manage_template_index.py` 的 list/show/retire/delete

## 3. Apply 干净实现与对照

- [x] 3.1 增加 `fidelity-compare.md`
- [x] 3.2 更新 Apply SKILL、apply-workflow、template-contract：拒绝 retired，禁止原版/历史 web

## 4. 契约与回归

- [x] 4.1 写入本 change 的 OpenSpec delta
- [x] 4.2 增加 loop contract eval 与 unittest
- [x] 4.3 `make mirror-write` 后跑 test/eval/validate
