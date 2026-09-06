---
date: 2026-09-06
kind: failure
skill: ui-template-apply
---

# 已初始化 monorepo 里的新前端跳过架构选型

## Context

消费仓已有 workspace 与其他应用。用户要求按模板实现全新前端输出根（`agent-web`）。

## What happened

Agent 把仓库根或兄弟包当成 `existing`，或把功能规格 / workspace 约定写成 `confirmed_by_user`，没有停下做闭集层选型。

## Lesson

判定只看本次输出根。仓库已初始化但输出根为空仍是 `greenfield`，必须展示候选并等待确认。兄弟栈与功能规格只是候选，不是冻结。
