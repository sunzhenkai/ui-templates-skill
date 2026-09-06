## Context

`detect_architecture_site` 本身扫传入目录，但 skill / CLI 写成 `architecture-site <project-root>`。monorepo 仓库根几乎总有 `package.json` 或源码，于是被判 `existing` 并跳过选型。sage 现场还把功能规格与 workspace 约定写成确认。

## Goals / Non-Goals

**Goals:**

- 判定对象稳定为输出根；仓库已初始化但输出根为空必须 greenfield。
- architecture artifact 可机器核对 `output_root` 与 `site`。
- 选型访谈不能被兄弟栈或产品规格代替。

**Non-Goals:**

- 不规定默认前端栈。
- 不改 sage 消费仓生成物。
- 不把 `project-init` 做成唯一脚手架。

## Decisions

1. **探测只吃输出根。**  
   空目录、不存在、仅 git 占位、仅空子目录 → `greenfield`。依赖清单或实质源码文件 → `existing`。`.git` / `.ui-template-apply` 仍忽略。空子目录不再把现场打成 `existing`。

2. **`output_root` 必填。**  
   相对消费项目根（`.ui-template-apply/` 的父目录），禁止绝对路径与 `..`。`.` 表示输出根就是项目根。checker 复跑探测，`site` 不一致记 `ARCHITECTURE_SITE_MISMATCH`。

3. **确认只认本会话架构选择。**  
   用户逐层点名或确认候选后才能 `confirmed_by_user: true`。功能规格、ADR、兄弟包、workspace 清单只可写入可选 `observed_constraints`，不能当冻结。

## Risks / Trade-offs

- [Agent 把 `output_root` 写成 `.` 逃避嵌套判定] → skill 写明输出根是将写入新应用源码的目录；eval 覆盖嵌套空应用。
- [已有会话缺字段] → 从 Phase 0 重开，符合 identity 失效规则。

## Migration Plan

1. 改 schema / detector / checker / skill / spec / eval。
2. `make test` / `make eval` / `make validate` / `make mirror-write` / `make mirror-check`。
3. 不 archive、不 publish。
