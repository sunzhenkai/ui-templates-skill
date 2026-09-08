## Context

本 change 是 `unify-design-system` 的 taskflow driver，不直接改生产代码。`grill.md` 已收口 D1–D32：统一契约采用 `design-system/v1` portable core + project binding，Apply 只消费有效 Active Instance，旧格式迁移-only，vendor 随 Apply 治理分发，最终一次 breaking release 切换。

## Goals / Non-Goals

**Goals:**

- 把五个已收敛的实施切片固定为五个 OpenSpec 子 change。
- 保证公共 schema 先于 skill 改造合入。
- 让 driver 只跟踪编排、回归、回填和归档，实现进度留在各子 change。

**Non-Goals:**

- 不在 driver 内实现 schema、skill 正文、模板迁移或 bundle 变更。
- 不自动 publish、tag 或 archive。
- 不读取或修复 `example/**` 生成物。

## Decisions

### 子 change 依赖图

采用串行主线：`schema → author → design → apply → release`。理由：

1. schema 是三个 skill 的公共事实源，必须先冻结。
2. Author 与 Design 分别定义 package 和 Active Instance，Apply 的 bootstrap/increment 依赖两者身份语义。
3. release 依赖全部前置实现，并负责官方迁移、兼容矩阵和最终验收。

Author 与 Design 的规划产物可并行评审；同一工作树内合入仍按上述顺序执行，避免共享 schema/eval 文件冲突。

### 子 change artifact 边界

| 子 change | 主要能力 | 禁止越界 |
| --- | --- | --- |
| `unify-design-system-schema` | schema、digest、引用、capability、migration/vendor manifest、统一 validator | 不改生产 skill 和 catalog |
| `unify-design-system-author` | portable package 抽取、candidate、INDEX、feedback | 不生成 binding 或应用实现 |
| `unify-design-system-design` | Active Instance、binding、projection、freeze、Gallery | 不发布 package 或实现业务页 |
| `unify-design-system-apply` | bootstrap/increment、checkpoint、vendor loading、browser gate | 不编辑 core contract |
| `unify-design-system-release` | workbench migration、compatibility、bundle allowlist、最终验收 | 不新增契约语义或自动 publish |

### Progress ownership

子 change 的 `tasks.md` 是实现真相。driver task 只有在其对应子 change 全部 checkbox 勾选且 `openspec validate --strict --type change <name>` 通过后才可勾选。

## Risks / Trade-offs

- [schema 后期被发现不足] → 停止后续 slice 合入，先补 schema 子 change 并更新其 fixture/eval。
- [Author/Design/Apply 语义漂移] → 每个子 change 必须消费统一 validator，不复制格式解释。
- [release 一次切换过大] → release 前四个子 change 分段回归；release 只做候选迁移、manifest、文档和验收。
- [driver 进度假同步] -> 逐个校验子 change 完成状态后才回填 driver checkbox。

## Migration Plan

1. 准备任务分支。
2. 依次应用 schema、Author、Design、Apply 子 change。
3. 应用 release 子 change，生成并验证 `workbench-shell` candidate。
4. 用户单独确认 publish 后才切换 catalog 和发布。
5. 全仓回归、回填验收、提交并归档全部子 change。

## Open Questions

无。
