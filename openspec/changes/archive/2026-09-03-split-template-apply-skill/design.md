## Context

当前 `skills/ui-template/` 是单体 skill：SKILL.md 237 行，body 常驻 Authoring 与 Apply 两条流程；8 个 reference 已按职责分裂（Authoring 5 个、Apply 3 个）；`.agents/skills/ui-template-manager/` 是指向它的薄封装；`scripts/validate_templates.py` 是模板库写入门禁。仓库约定（AGENTS.md）要求流程/格式改动落在 `skills/ui-template/`，并在引入真实结构时同步更新 AGENTS.md。

## Goals / Non-Goals

**Goals:**
- 每次触发只加载当前职责所需的 SKILL.md body 与 reference。
- 两个 skill 通过 `templates/` 公开数据契约松耦合，可独立演进。
- 消除 SKILL.md body 与 reference 的重复（阶段总览、收尾要求、验收清单）。
- 保持 `templates/` 数据格式与 validator 行为零变更。

**Non-Goals:**
- 不修改任何 `templates/<name>/` 的实际内容与格式。
- 不引入第三个“共享 skill”或共享包。
- 不改动 `scripts/validate_templates.py`。
- 不在本变更中重写 Apply 的阶段定义或质量门禁内容，只迁移与瘦身。

## Decisions

### D1. 新 skill 命名为 `ui-template-apply`
动词短语、与原 skill 名形成显式配对，description 只声明 Apply 触发词（“用模板实现/按模板做页面/基于模板搭后台”），不包含“做成模板/提取风格”。备选 `ui-template-consumer` 被否决：名词化、触发面弱。

### D2. 共享层是数据契约，不是共享文档
`spec-format.md` 仍是模板格式唯一归属，留在 `ui-template`。新 skill 增加 `references/template-contract.md`（约 30 行），只写消费方不变量：`spec.md` 优先级、`tokens.yaml` 精确值唯一性、`origin` 读取语义、coverage 驱动的验收严格度、冲突处理。备选“复制 spec-format 到两个 skill”被否决——两份格式定义必然漂移；备选“抽出第三个共享 skill”被否决——过度工程，实际共享面只有一个数据契约。

### D3. 反馈闭环走数据，不走流程
`ui-template-apply` 发现可复用规则缺口时，产出结构化反馈记录（Markdown：场景、证据、建议、影响范围），落在任务汇报或模板目录旁的约定位置；`ui-template` 在更新模板前消费这些记录。两个 skill 不互相 import 流程文档。反馈记录格式从简，不新建数据库或脚本。

### D4. reference 与自进化资料按归属迁移
- `apply-workflow.md`、`toolchain.md`、`quality-gates.md` 迁移到新 skill。
- `evals/cases.yaml` 与 `experience/` 中 Apply 专属条目迁移；两边都覆盖的条目按 case 拆分。
- 历史 `patches/` 留在 `ui-template` 作为演进档案，不迁移（历史记录不可重写归属）。

### D5. `ui-template-manager` 保留单入口并按意图路由
manager 继续作为本仓库项目级薄封装，但按用户意图分别指向 `skills/ui-template/` 与 `skills/ui-template-apply/`。备选“拆成两个 manager”被否决：manager 本身是路由薄封装，单入口更符合现状，且避免 `.agents/skills/` 目录膨胀。

### D6. SKILL.md body 导航化，消除与 reference 的重复
`ui-template` 的 body 保留：触发边界、Authoring 核心原则、来源选择表、格式契约归属、反馈消费、指向 reference 的条件加载；删除 Apply 正文与重复的模板写作细节（细节归 `spec-format.md`）。新 skill 的 body 保留：触发边界、阶段列表（一行一阶段 + gate）、消费契约摘要、工具路由、汇报要求；阶段细节与验收清单全部留在 reference。

## Risks / Trade-offs

- [安装遗漏导致 Apply 请求无人处理] → 两个 skill 的 description 互指对方职责；README/AGENTS.md 明确“完整能力需同时安装两个目录”。
- [消费契约与格式定义漂移] → `spec-format.md` 唯一归属；`template-contract.md` 只写“怎么读”，不写“怎么生成”，并在文中声明格式权威来源。
- [旧使用方触发面破坏] → 在 proposal 标记 BREAKING；`ui-template` 检测到 Apply 意图时显式提示新 skill 名，而不是静默失败。
- [拆分期间 reference 内容被意外改写] → 任务要求迁移文件用 `git mv`，内容瘦身与文件迁移分两个提交单元。

## Migration Plan

1. `git mv` 三个 Apply reference 到新目录，先保证零内容变更。
2. 新建 `ui-template-apply/SKILL.md` 与 `template-contract.md`，迁移 evals/experience 条目。
3. 重写 `ui-template/SKILL.md`（收窄 description、删 Apply 正文、导航化 Authoring）。
4. 更新 `ui-template-manager` 路由与 AGENTS.md。
5. 运行 `python3 scripts/validate_templates.py` 确认模板库零影响。
6. 回滚策略：整个变更是纯文档/目录重组，`git revert` 单次提交即可恢复单体 skill。
