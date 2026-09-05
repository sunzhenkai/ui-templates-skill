---
name: ui-template-apply
description: 使用已有 schema v2 UI 模板按 Phase 0–9 实现真实页面，维护 .ui-template-apply checkpoint/artifacts，完成 current-build 浏览器证据、review 与幂等 feedback。用于“用模板实现页面/按模板做 UI/基于模板搭后台”；创建模板应移交 ui-template-author。
---

# ui-template-apply

本 skill 只消费已有模板，不创建、迁移或索引模板。Authoring 由 `ui-template-author` 所有。干净实现与保真对照见 [fidelity-compare.md](references/fidelity-compare.md)。

成对安装，不要用 `--all`：

```bash
npx skills add sunzhenkai/ui-templates-skill -s ui-template-author -s ui-template-apply
```

治理回滚用 `make bundle` / `make install`。项目库缺目标 published 行时，先从已安装 `ui-template-author/catalog/` 播种。

## 启动边界

- 已选 **published** 模板并要求实现页面 → 进入本流程（默认模式 A：干净实现）。
- 用户明确要求对齐原版视觉 → 仍只读模板实现，另按模式 B 对照可部署 oracle；差异回写 skill/模板后重生，不得改生成物。
- “做成模板/提取风格/导入模板/退役或删除模板” → 移交 `ui-template-author`。
- 项目库缺少目标 published 行时，先从已安装 `ui-template-author/catalog/` 播种再 `require-published`。只有项目库与 catalog 都没有该 published 模板时才报没有模板、停止并移交 Authoring，禁止猜测。项目 `retired` 行不得被 catalog 覆盖。Intake 运行 `manage_template_index.py require-published`（默认播种），非 0 不得进入 Phase 1。
- MUST NOT 读取原版 checkout、`meta.sources[]` 路径或工作区已有生成物作为实现参考。生成目录是本次约定的空目录或当前输出目录，不得把历史输出当参考。

## 必读契约

先读 [template-contract.md](references/template-contract.md)：只接受 `schema_version: 2` 与 `source | computed | estimated | default`；四种 origin 都按确定值消费；`spec.md` 是规则入口，`tokens.yaml` 是精确值唯一载体，coverage 在实现前形成 accepted/deferred/excluded 决定。存在 `fidelity.yaml` 时校验 supported profile；无 sidecar 为 legacy-baseline，未知 profile 停止。不得发布 stack adapter。

## Phase 0–9

严格按 [apply-workflow.md](references/apply-workflow.md) 执行，并在项目根维护标准 `.ui-template-apply/`：

0. Intake → `00-intake.md`
1. Design direction/token freeze → `01-design-direction.md`、`01-token-map.yaml`
2. IA/layout/routes → `02-routes.yaml`
3. Project structure → `03-structure.md`
4. Component inventory → `04-components.yaml`
5. Representative slice → `05-07-progress.yaml`
6. Complete included page modes → 同上
7. Global systems → 同上
8. Browser verification → `08-verification.json` + `evidence/`
9. Review/feedback → `09-review.md` + `feedback/`

每阶段状态和 digest 写入 `checkpoint.yaml`。恢复先验证 scope、template/tokens、artifacts、source/build identity 和 Phase 8/9 证据，从最早失效 phase 重开：layout profile 语义变化从 Phase 2，geometry/state 从 Phase 4，相关 Phase 8 证据过期。页面存在不能替代证据。

## 工具与质量

- 外部知识/审美/组件/浏览器/review 路由见 [toolchain.md](references/toolchain.md)。`ui-ux-pro-max` 必须遵守 Query Contract；输出只是候选。
- 门禁见 [quality-gates.md](references/quality-gates.md)。每个结果绑定稳定 rule ID、当前 template/source/build identity 和 evidence；不以固定 checklist 数量或 prose“已检查”宣称完成。
- 没有真实浏览器能力时停止并请求可运行方式；静态检查不能替代 Phase 8。

## Feedback 与汇报

可复用模板缺口创建 schema v2 proposed feedback；文件名 stem 必须等于 UUID，evidence refs 必须相对 `.ui-template-apply/` 根存在且不越界，targets 必须在完整 known rule IDs 中命中。按 UUID 或 normalized fingerprint 命中时合并证据，不重复创建；新目标路径碰撞不得覆盖，写后必须验证整个 inbox，失败则回滚。项目目录、API/mock、技术栈和业务专属问题留在消费项目。

最终汇报只引用 `.ui-template-apply/`：included/deferred/excluded、当前身份、完成 phases、current-build verification、P0/P1/recheck、反馈 UUID/receipt、实际工程命令及不可用工具回退。Phase 8/9 无效或任一 gate 失败时不得说“完成”。
