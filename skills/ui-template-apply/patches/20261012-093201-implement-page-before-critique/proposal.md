# 代表页先实现再记录批判

- target: skills/ui-template-apply
- mode: update
- patch: 20261012-093201-implement-page-before-critique
- risk: medium
- status: proposed

## Intent

frontend-design 用来实现并修订代表页。批判记录写在改页之后。共享精确值回写 token；已冻结系统上改共享精确值仍走 design iterate。

## Conflict check

保留 prebuild_design_critique 字段名以维持契约测试。不放宽 fidelity / scenario 校验。

## Rationale

写页面是质量来源。检查记录描述已经改过的页面。

## Files

- skills/ui-template-apply/references/vendor-loading.md
- skills/ui-template-apply/references/apply-workflow.md

## Validation

- git apply --check
- python3 -m unittest tests/test_skill_contracts.py
