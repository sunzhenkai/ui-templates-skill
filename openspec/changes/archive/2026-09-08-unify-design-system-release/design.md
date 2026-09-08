## Context

前四个子 change 分别建立 schema、Author package、Design Active Instance 和 Apply implementation。本子 change 只做原子发布切换、官方迁移和最终验收，不重新裁决契约。

## Goals / Non-Goals

**Goals:**

- 让 release metadata、生产模板、catalog、三个 skill 和文档同时指向 `design-system/v1`。
- 保留 schema v2 与旧 freeze 的显式迁移入口和回滚说明。
- 用 fixture、双构建和干净重生证明跨 skill 闭环。

**Non-Goals:**

- 不新增契约语义。
- 不自动 publish、tag 或 archive。
- 不读取或修复 `example/**` 生成物。

## Decisions

### 一条 breaking release 线

选择 bundle `3.0.0` 与 package `3.0.0` 同步切换，而不是保留双 catalog。这样可以避免最新 skill、旧 official package 和旧项目组合爆炸。

### Candidate-first official migration

workbench-shell 先从 schema v2 生成 candidate 和 receipt；生产 catalog 切换单独请求。这样满足治理的 publish gate，也允许迁移失败不污染生产。

### Release evidence 分层

格式 fixture 证明契约，官方迁移证明实例，bootstrap/increment 重生证明联动，双构建 checksum 证明分发。四类证据缺一不可。

## Risks / Trade-offs

- [官方迁移暴露 schema 遗漏] → 在 release 子 change 前先跑迁移 dry-run；问题回到对应 skill/schema 子 change。
- [双构建 checksum 受路径影响] -> release manifest 使用相对路径、固定排序和可重现归档。
- [旧项目误解 migration-only] -> compatibility、README 和 runtime error 提供同一迁移入口。

## Migration Plan

1. 校验前四个子 change 全部完成。
2. 生成并验证 workbench-shell candidate。
3. 用户单独确认后切换生产模板与 catalog。
4. 更新 release manifest、迁移、回滚和派生文档。
5. 执行完整回归与双构建，再等待单独 publish/tag 请求。

## Open Questions

无。
