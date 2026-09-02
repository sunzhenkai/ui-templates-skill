# Result

- target: .agents/skills/ui-template
- mode: self-upgrade
- patch: 20260902-232854-self-upgrade
- risk: medium
- status: applied
- applied-at: 2026-09-02T23:28:54+08:00 之后（应用时刻见 git 工作树变更）

## Validation

- `git apply --check --recount`: pass
- `git diff --check`: pass
- target tests: not-available（仓库未定义测试命令，AGENTS.md 明示不臆造工具链）
- privacy check: pass（扫描器对 UI 设计 token 术语有误报，非凭据；无 /home/ 路径、无密钥）
- mode check: pass（self-upgrade：三目录 + 注入段，未改既有双工作流行为）

补充确定性验证：

- SKILL.md frontmatter 完整，name=ui-template 与目录名一致
- `## Self-evolution` 段恰好出现 1 次，无 `<skill-dir>` 占位符残留
- 生产文件与暂存树 `diff -r` 一致（唯一差异为 references/ 不在暂存范围）
- `evals/cases.yaml` YAML 解析通过，10 个 case id 唯一
- 新文件无行尾空白

## Notes

- 风险门禁：medium；用户显式请求「更新 .agents/skills/ui-template 为自更新 skill」，即已批准标准 self-upgrade 的具体改动内容，门禁视为已通过。
- evals/cases.yaml 的 10 条 cases（basic 1 / core 5 / failure 2 / boundary 2）全部从现有 SKILL.md 的 MUST、禁止与门禁抽取；regression 类无既有测试依据，按规范留空不凑数。
- examples/ 与 experience/ 仅含 README 与空目录占位，无伪造历史条目。
- 首次生成的 change.patch 因 `git diff --no-index` 对空文件的 header 缺陷校验失败；应用前按协议在同一 patch 目录内重建 diff（difflib 重建），应用尝试未发生，不违反历史不可改写规则。
- 仓库 AGENTS.md 指出 skills/ui-template/ 为通用 skill 单一源码；本 patch 仅按用户显式指定升级 .agents/skills/ui-template/，两者同步由用户决定。
