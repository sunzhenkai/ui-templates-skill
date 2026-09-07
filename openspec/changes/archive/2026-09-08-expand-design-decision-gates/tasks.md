## 1. Production skill

- [x] 1.1 新增 `references/decision-gates.md`，定义候选呈现、授权、账本、必经 gate 和停止行为
- [x] 1.2 将 decision gates 纳入 `bootstrap | refactor | iterate` 必读，并更新 SKILL 主流程与完成定义
- [x] 1.3 补充 greenfield architecture gate、existing scope/inventory gate 和 iterate scope gate
- [x] 1.4 在 `artifact-templates.md` 增加 `00-intake.md` 的 `decision_gates` 最小 shape

## 2. Eval

- [x] 2.1 新增 `design-decision-gates` contract assertions
- [x] 2.2 更新 cases revision 与 fixture hash
- [x] 2.3 在隔离工作区运行 Design contract eval 并确认 9 cases passed

## 3. Governance validation

- [x] 3.1 运行 `openspec validate --all --strict`
- [x] 3.2 运行 Design contract eval
- [x] 3.3 运行目标单元测试；`make eval` 与 locked baseline 通过
- [x] 3.4 重建 production mirror 并通过 `make mirror-check`
- [ ] 3.5 全仓 `make validate` 受另一个并发 active change `add-apply-design-decision-gates` 的现有 strict error 阻塞；本 change scoped strict validation 通过
