# Proposal — 阅读页 / 目录树 pattern + 发布门禁与 P14 契约补口

## Intent

一轮真实的多页应用改造（设置分区、文档阅读、关系图、目录树导航）暴露的问题里，多数属于
「机制已修但规则没写进模板、能机检的没进闸门」。本 patch 把经验固化为 pattern、契约与发布门禁：

1. 新增 reader / tree-nav 两个 pattern（阅读页布局与连续性、树形二级菜单）；
2. 把 settings 分区合并原则、canvas 节点交互规则补进现有 pattern；
3. P14 契约补 `blocks/surfaces`、`blocks/page-header`、`blocks/use-container-width` 三个文件；
4. 发布门禁 `make preflight`，并明确「门禁不得接管道」——失败被 `| tail` 吞掉会把 stale 派生物推上去。

非目标：不新增 block（TreeNav 列为候选，第二个消费端出现再上提）、不改任何 library 组件实现。

## Conflict check

- pattern 改动只补规则，不改变既有原型与 `blocks` 依赖。
- P14 新增条目只做 substring 断言，现有实现全部满足；不影响消费项目。
- `make preflight` 只是组合既有 target，不改变 CI `make check` 语义。

## Validation

- `make preflight`：sync + 48 tests + validate ×2 全绿。
- 消费项目重锁后：tsc / eslint / build / vitest / fidelity / validate project 全绿。
