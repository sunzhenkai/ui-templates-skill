# Proposal — 侧栏普通项字重 token（quiet-inset 0.5.0 → 0.5.1）

## Intent

0.5.0 落地后 wiki.lan 线上复核发现遗漏：`--sidebar-active-weight` 只覆盖选中态，普通项字重
仍继承 body 的 400。linear 复测普通项（Inbox/My issues/Reviews…）内部文字同为 13px/**500**；
multica 普通项实测 14px/400。两参照不同 → 照字重 token 化惯例补 `--sidebar-item-weight`
（默认 400 保 workbench-shell 语义），quiet-inset 显式 500。

## Conflict check

- `library/shadcn/ui/sidebar.tsx` 共享文件 → 双包升版（quiet-inset 0.5.1 / workbench-shell 5.0.11）。
- data-active 态由既有 `data-active:[font-weight:var(--sidebar-active-weight,500)]` 覆盖，
  与新基础 token 不冲突（变体优先级更高）。

## Files

- `skills/ui-template-apply/library/shadcn/ui/sidebar.tsx`：MenuButton 基础类加
  `[font-weight:var(--sidebar-item-weight,400)]`
- `templates/quiet-inset/theme.css`：`:root` 新增 `--sidebar-item-weight: 500` + F-2 注释补记
- `templates/quiet-inset/meta.yaml` / `CHANGELOG.md`：0.5.1
- `templates/workbench-shell/meta.yaml` / `CHANGELOG.md`：5.0.11（默认值渲染不变）
- catalog/registry 由 `make sync` 重生成

## Validation

- validate_package ×2 → 0 error；make check 全绿
- 消费项目重锁 0.5.1 后线上复核普通项 font-weight = 500
