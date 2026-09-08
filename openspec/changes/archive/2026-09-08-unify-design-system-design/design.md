## Context

Design 已有 0–9、task class、decision gate、gallery 和 visual loop。本子 change 将产物从独立 freeze 格式切换为统一 Active Instance，并保持 Design 可单独安装。

## Goals / Non-Goals

**Goals:**

- 让 Active Instance 成为项目唯一可实施真相。
- 用 source origin 表达 blank、领养和旧 freeze 迁移。
- 保留选型引导、decision gate、Gallery 和真实浏览器验证。

**Non-Goals:**

- 不发布 library package。
- 不实现业务页。
- 不要求 Design 与 Author/Apply 配对安装。

## Decisions

### Task class 与 source origin 分离

`bootstrap/refactor/iterate` 描述项目状态；`blank/template-package/legacy-freeze-migration` 描述来源。这样避免新增 `adopt` 任务类后复制三套流程门禁。

### Copy-bound adoption

领养 package 时复制 core 而不是引用宿主路径，且不重写语义。项目差异留在 binding 或显式 Active Instance 变更中，从而保持 package 身份可审计。

### Projection 属于 binding 治理

原生主题文件是落地结果，不是第二 token 权威。binding 记录目标、映射和 digest，使 Design 与 Apply 能发现手工旁路。

### Freeze 仍要求真实浏览器

统一 digest 只证明文件一致，不证明可实施视觉效果。Gallery 和 current-build 证据继续是 freeze 必要条件。

## Risks / Trade-offs

- [旧 freeze 迁移丢失语义] → migration receipt 记录 unresolved；未解决不得 freeze。
- [领养后用户想改 package 语义] → 明确两条路径：项目层差异留在 active instance，通用变更回 Author。
- [binding 记录过多工程细节] -> 闭集字段限制在选型、路径、projection 和 build identity，不引入依赖清单或 stack adapter。

## Migration Plan

1. 接入统一 validator。
2. 重新定义 Phase 0–9 artifact ownership。
3. 增加 package adoption 与 legacy freeze migration 流程。
4. 用 greenfield、existing refactor、iterate 和 migration fixtures 验证。

## Open Questions

无。
