# Result — 保真脚本 pnpm 支持

## 落点

- `scripts/verify_fidelity.py`：新增 `package_manager()` 与 `package_run()` / `package_exec()`；
  锁文件与安装/构建/测试命令按包管理器分流。
- quiet-inset `0.6.16 → 0.6.17`、workbench-shell `5.0.28 → 5.0.29`。

## 验证

- `make preflight`：48 tests / validate ×2 全绿。
- pnpm 消费端：保真基线建立与比对通过（7 stories）。
