## 1. Release preconditions

- [x] 1.1 确认 schema、Author、Design、Apply 四个子 change 全部 tasks 勾选且 strict validation 通过
- [x] 1.2 冻结 bundle `3.0.0`、skill `3.0.0` 和 package `3.0.0` 的兼容矩阵
- [x] 1.3 准备任务分支并确认工作树只包含本任务 OpenSpec 变更或获得用户确认

## 2. Official migration candidate

- [x] 2.1 生成 `templates/workbench-shell` schema v2 到 design-system v1 的 candidate 与 migration receipt
- [x] 2.2 校验 candidate 的 page-system 七层、stable IDs、provenance、coverage 和 digest
- [x] 2.3 运行 Author、Design、Apply 相关 fixture/eval，确认 receipt 无 unresolved/errors
- [x] 2.4 等待用户单独确认后更新生产模板、INDEX 和 Author catalog；未确认时保持 candidate

## 3. Governance and distribution

- [x] 3.1 更新 `governance/release/compatibility.yaml`、distribution manifest、VERSION、CHANGELOG、migration 和 rollback 文档
- [x] 3.2 更新 bundle allowlist，纳入四个 vendor reference、manifest、UPSTREAM 和 license，并排除无关文件
- [x] 3.3 同步 README、AGENTS、`governance/FUNCTIONAL-LOOP.md` 和 skill 移交/安装说明
- [ ] 3.4 更新 OpenSpec base specs 与 active change 依赖，确保无 pending 术语漂移

## 4. Final acceptance

- [x] 4.1 运行 tokens-only、ui-kit、page-system 和 active increment 四类 fixture/eval
- [x] 4.2 完成一次干净 bootstrap 重生和一次 scoped increment 重生，并保存会话证据；不改 `example/**`
- [x] 4.3 连续执行两次 `make bundle` 并核对 checksum 与 manifest 稳定
- [x] 4.4 运行 `make bootstrap`
- [x] 4.5 运行 `make validate`
- [x] 4.6 运行 `make test`
- [x] 4.7 运行 `make eval`
- [x] 4.8 运行 `openspec validate --all --strict`
