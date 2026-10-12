# 空白表面先实现代表页再冻结共享 token

- target: skills/ui-template-design
- mode: update
- patch: 20261012-093200-representative-page-before-tokens
- risk: medium
- status: proposed

## Intent

空白 bootstrap 与含视觉的 refactor 在冻结共享 token 之前先实现并修订一条主流程代表页。template-package 与 iterate 保持原路径。

## Conflict check

共享精确值仍只写在 core/tokens.yaml。全站其余页面未实现仍可完成。不新增检查脚本。

## Rationale

视觉质量来自先实现并修订代表页，再抽取共享值。规则对任意空白表面成立，不绑定具体产品。

## Files

- skills/ui-template-design/SKILL.md
- skills/ui-template-design/references/visual-loop.md

## Validation

- git apply --check
- python3 -m unittest tests/test_skill_contracts.py
