# Result

- target: .agents/skills/ui-template-manager
- mode: self-upgrade
- patch: 20260903-092845-self-evolution-upgrade
- risk: medium
- status: applied
- applied-at: 2026-09-03T09:35:00+08:00

## Validation

- `git apply --check --recount`: pass
- `git diff --check`: pass
- target tests: not-available（仓库未配置测试框架；未臆造命令）
- privacy check: pass
- mode check: pass（self-upgrade；未改 skills/ui-template/，未改历史 patches/）

## Checks

- frontmatter `name: ui-template-manager` 保持不变。
- 新增 `examples/README.md`、`evals/README.md`、`evals/cases.yaml`、`experience/README.md` 与 `experience/{failures,successes,patterns}/.gitkeep`。
- `evals/cases.yaml` 通过 PyYAML 解析：8 个 case，id 唯一，覆盖 basic/core/failure/boundary/regression。
- `SKILL.md` 末尾追加标准 Self-evolution 段，`<skill-dir>` 已替换为 `.agents/skills/ui-template-manager/`。
- 应用后的生产目录与 patch 期望树 `diff -r` 完全一致。
- 无个人路径、密钥或内部 URL；examples/experience 未伪造任何历史条目。

## Notes

none
