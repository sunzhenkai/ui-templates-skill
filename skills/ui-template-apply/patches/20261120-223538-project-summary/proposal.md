# 应用项目时生成 .ui-template.md 摘要

- target: skills/ui-template-apply
- mode: update
- patch: 20261120-223538-project-summary
- risk: medium
- status: proposed

## Intent

首次安装、追加安装项、升级和解决冲突时，在项目根目录生成 `.ui-template.md`，记录当前风格包、版本和已安装项，并指向 `ui-decisions.yaml` 与 `ui-template.lock.json`。文件由安装脚本根据 lock 同一份数据确定性生成；`--dry-run` 和 `--status` 不写文件。不改变主题、组件、页面决策或升级冲突处理行为。

## Conflict check

`ui-template.lock.json` 仍是安装状态的机器可读事实源，`ui-decisions.yaml` 仍保存项目决策；Markdown 只是派生的可读摘要，不引入另一套手工配置。生成内容不含时间戳，保持安装确定性。现有项目下次写 lock 时会补齐摘要，不要求立即迁移。

## Rationale

消费项目可以直接从根目录识别所用 UI 模板及版本，agent 也有明确的安装痕迹可读。由脚本生成能避免仅依赖文档约定而漏建文件，并通过追加安装项后的内容断言验证同步更新。

## Files

- skills/ui-template-apply/scripts/install_registry.py：生成并重写项目摘要。
- skills/ui-template-apply/steps/02-install.md：说明摘要的生成时机与事实源。
- skills/ui-template-apply/SKILL.md：把摘要纳入安装流程和项目侧文件说明。

## Validation

- 应用前：`git apply --check --recount`。
- 应用后：扩展 `tests/test_install.py`，断言首次安装生成包名、版本、安装项与状态文件入口，追加安装项后摘要同步更新。
- 运行安装测试与 `make check`；检查 `git diff --check`、frontmatter、文档预算和隐私信息。
