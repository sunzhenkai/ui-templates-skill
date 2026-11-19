# Result

- target: skills/ui-template-apply
- mode: update
- patch: 20261120-010500-block-urlstate-footer-wrap
- risk: low
- status: applied
- applied-at: 2026-11-20T01:10:00+08:00

## Validation

- `git apply --check --recount -R`（工作树已应用）: pass
- `git diff --check`: pass
- `make sync`：registry.json 与 catalog 重新生成，已含在 patch 内
- `make check`：47 tests OK（skipped=1）；`check_no_project_names` pass；`build_registry --check` pass；`sync_catalog --check` pass
- 消费方：quiet-inset 0.2.0 重锁后项目侧 `validate project` / `verify_fidelity` / `check_rendered` / 冒烟复跑通过

## Notes

version 从包 meta 派生，因此两包同时升位（quiet-inset 0.2.0、workbench-shell 5.0.6）；`upstream:` 比较的是锁里的包版本。
