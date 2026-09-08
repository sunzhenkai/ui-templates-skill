## Context

Author 已有分层抽取、change set、INDEX、feedback 和 source replay 治理。本子 change 的关键是保留这些纪律，把产物与机器验证切到 `design-system/v1`。

## Goals / Non-Goals

**Goals:**

- 复用 L0–L6 标签，把抽取结果映射到七层 core。
- 用统一 validator 替代 Author 内部的格式解释。
- 保持 candidate-only、INDEX、feedback 和 source replay 的 fail-closed 行为。

**Non-Goals:**

- 不新增栈适配器。
- 不生成 project binding。
- 不迁移官方模板；catalog 切换由 release 子 change 执行。

## Decisions

### 保留 L0–L6

选择沿用现有变更集合标签并重定义目标映射，而不是发明新阶段。这样可以复用已有 eval、fixtures 和用户经验，同时让旧 feedback 的领域标签仍可理解。

### Candidate-first 写入

所有从源生成的结果先写入 candidate。只有 validator、eval 和用户确认通过后才允许改生产 INDEX；这比双写旧/新格式更能避免漂移。

### Capability 在 Intake 冻结

`tokens-only | ui-kit | page-system` 必须与用户声明的抽取范围同时确认。Validator 因此可以区分“显式不支持”和“应该抽取但遗漏”。

## Risks / Trade-offs

- [旧 v2 feedback 无法直接映射] → 迁移工具记录 rule/scope 映射，无法稳定映射时标记 unresolved。
- [Author 可能越界补齐 binding] → validator 拒绝 package 内 binding，skill 正文增加移交红线。
- [defaulted 组件被误当完整] → coverage 与 confidence 联合门禁阻止 high confidence。

## Migration Plan

1. 先为 Author runtime 加统一 validator adapter。
2. 再切换 generation 模板到 package layout。
3. 用 source replay 与 feedback fixtures 验证局部更新。
4. release 子 change 才迁移生产 official catalog。

## Open Questions

无。
