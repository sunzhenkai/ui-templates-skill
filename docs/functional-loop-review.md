# ui-templates-skill 全仓功能闭环审查与优化建议

> **Superseded（2026-09-05）。** 现行功能与目标以 [`governance/FUNCTIONAL-LOOP.md`](../governance/FUNCTIONAL-LOOP.md) 为准。本文是 2026-09-03 的历史审查，其中多数 P0 已落地，不得再指导实现。
>
> 审查日期：2026-09-03  
> 审查对象：`ui-template`、`ui-template-apply`、模板契约与校验器、`workbench-shell`、`web-v2`/`web-v3`、OpenSpec、安装/镜像/eval/experience 治理  
> 参考对象：本机 `ui-ux-pro-max` skill  
> 审查视角：不是逐文件挑错，而是判断“创建模板 → 校验/发布 → 消费模板 → 实现/验收 → 反馈回写 → 回归演进”能否形成可重复、可恢复、可审计的功能闭环。

## 1. 结论摘要

项目已经具备正确的核心骨架：Authoring 与 Apply 已拆成两个 skill，模板通过 `spec.md`、`tokens.yaml`、`meta.yaml` 解耦，Apply 有 0–9 阶段、真实浏览器门禁、反馈分类和中断恢复约束，`workbench-shell` 与 `web-v2` 也提供了非平凡实例。因此当前问题不是“缺一套流程文档”，而是**流程文档尚未被统一契约、确定性工具、证据产物和发布治理闭合**。

综合判断：

- **流程设计成熟度：较高。** Authoring 和 Apply 的职责、阶段与边界大体合理。
- **契约一致性：不足。** OpenSpec、README、Authoring、Apply、validator 对同一事实存在冲突。
- **确定性可信度：不足。** validator 对当前 OKLCH 色值实际没有执行 WCAG 检查，却仍返回通过；eval 仍是人工 checklist。
- **执行证据完整性：不足。** `web-v2` 的工程测试可运行，但无法证明 Apply Phase 8/9 要求的 AX、computed style、console、双主题、状态矩阵和 design review 全部完成。
- **发布与安装闭环：未成立。** 官方 README 和 Makefile 只安装 `ui-template`，外部用户无法按公开入口获得完整双-skill 能力。
- **反馈与演进闭环：未成立。** 已有反馈文件，但没有统一 inbox、ID、状态、结案回执和自动回归；experience 仍为空骨架。

建议先完成五项 P0 finding（归为四个工作流主题）：**统一单一事实源与 origin 契约、修复双-skill 安装、让 validator fail-closed、补齐 Apply 样例关键流程与证据链**。完成后再做 schema v2、eval runner、CI/release 和 provenance。

## 2. 审查范围、方法与事实基线

### 2.1 覆盖范围

本次审查覆盖：

1. 根级入口：`README.md`、`AGENTS.md`、`Makefile`、`.gitignore`。
2. Authoring：`skills/ui-template/SKILL.md`、全部 references、evals、examples、experience、patches。
3. Apply：`skills/ui-template-apply/SKILL.md`、全部 references、evals、experience。
4. 数据契约：`skills/ui-template/references/spec-format.md`、`skills/ui-template-apply/references/template-contract.md`。
5. 模板实例：`templates/INDEX.md`、`templates/workbench-shell/**`。
6. 确定性工具：`scripts/validate_templates.py`。
7. 规格治理：`openspec/specs/**` 与归档 changes。
8. 消费样例：`example/workbench-shell/web-v2/**`；同时识别 `web-v3` 的当前 WIP 状态。
9. skill 镜像：`skills/`、`.agents/skills/`、本机 `.kiro/skills/` 的一致性。
10. 对标参考：`/home/wii/.kiro/.agents/skills/ui-ux-pro-max/` 的 Query Contract、检索脚本、数据校验、provenance 与回归基线。

### 2.2 已验证基线

- `python3 scripts/validate_templates.py` 当前返回 `PASSED: 1 template(s) valid`，并确认 2 个主题、52 个一致角色和 spacing 白名单。
- `openspec validate --all --strict` 当前可通过 3 个规格；但该命令只证明结构合法，不能发现本报告列出的跨文件语义冲突。
- `web-v2` 当前复验：`pnpm install --frozen-lockfile` 成功；typecheck 通过；lint 为 0 error/10 warning；Vitest 14/14；build 通过并有约 1.23 MB 单 chunk 警告。仓库默认 E2E 配置因复用 4173 上的错误预览服务曾得到 3/24；改用隔离端口、禁用复用并绑定刚生成的 `dist` 后为 24/24。后一个结果证明当前 8 个 case 可运行，也同时证明默认命令缺少服务身份与 build provenance，不能单独充当 Phase 8/9 发布证据。
- `web-v3` 是未跟踪且审查期间持续变化的 WIP。2026-09-03 22:18+08:00 的快照已接入完整路由和 404，build 通过、Vitest 8/8，Playwright 为 25/27；因此旧的“空壳/build 失败”观察已失效，但它仍不应作为已交付能力。此类动态数字必须绑定时间、工作树 revision/hash 与报告路径。
- 本机 `ui-ux-pro-max` 的 `validate_data.py` 可通过；其全量 unittest 运行 132 项，其中 130 项通过、2 项因发布包缺少被测试脚本而导入失败。它可借鉴，但不是无缺陷标杆。
- 审查开始时工作树已有 `M .gitignore` 和 `?? example/workbench-shell/web-v3/`；二者不是本报告产生的改动。

## 3. 当前功能闭环

### 3.1 Authoring 当前链路

```text
用户意图
  → 来源识别（web / repo / image / doc）
  → 来源采集
  → token 归一与默认值回填
  → 生成 spec.md + tokens.yaml + meta.yaml (+ apply/)
  → 更新 templates/INDEX.md
  → 汇报
```

已具备：来源路由、重名处理、确定值/默认值理念、coverage、模板/工程边界、Apply 移交、自进化原则。

实际断点：

```text
生成模板
  -X→ 强制 schema/语义/链接/对比度验证
  -X→ 仅验证通过后更新索引
  -X→ 可追踪发布版本
  -X→ 反馈逐条 accepted / known-gap / rejected
  -X→ 反馈触发回归 case
```

`skills/ui-template/SKILL.md:43-49` 的编号流程从生成直接进入 INDEX 和汇报，仓库级 validator 要求只存在于 `AGENTS.md`，没有成为可共享 skill 的完成 gate。

### 3.2 Apply 当前链路

```text
已有模板
  → 0 Intake
  → 1 Art direction & token freeze
  → 2 IA / layout / route / URL
  → 3 Code structure
  → 4 Component inventory
  → 5 Representative slice
  → 6 Complete page modes
  → 7 Global systems
  → 8 Browser verification
  → 9 Design review & feedback
  → 中断恢复
```

这是项目目前最成熟的部分。`apply-workflow.md` 已明确每阶段输入、产物、gate、工具回退与恢复顺序，`quality-gates.md` 也覆盖路由语义、可访问性、浮层焦点、滚动、响应式、computed style、状态和工程质量。

实际断点：

```text
模板发现/适配性判断不足
  → coverage/page mode 无法完全机器表达
  → 阶段产物未形成标准目录与 checkpoint
  → Phase 8/9 证据没有固定 schema/provenance
  → feedback 没有状态机和回执
  → experience/eval 没有自动进入回归
```

### 3.3 目标闭环

```text
模板目录发现与适配评分
  → Authoring 采集 + token evidence
  → schema/语义/对比度/link 校验
  → catalog digest + versioned bundle
  → Apply Intake + coverage decisions
  → token lock + digest
  → IA/structure/inventory/slice/pages
  → browser evidence + review
  → feedback inbox + 三态处置
  → experience / eval fixture / patch
  → 回归通过后发布新版本
```

闭环的关键不是增加更多 prose，而是让每个箭头都有**机器可读产物、稳定 ID、失败语义和可重跑命令**。

## 4. 已有优势：应保留的设计

1. **双 skill 拆分方向正确。** `ui-template` 负责格式所有权与库管理，`ui-template-apply` 只消费公开契约，避免一个 SKILL 同时承担采集和工程实施。
2. **`spec.md` / `tokens.yaml` / `meta.yaml` 三层合理。** 规则、精确值、来源/coverage 分离，是后续做 schema、diff 和兼容性检查的良好基础。
3. **模板与工程结构解耦合理。** 现行 `spec-format.md:141-176` 禁止目录契约、API/data 分层、状态库和 stack adapter 进入模板；应保留，不应因参考 `ui-ux-pro-max` 而回退。
4. **Apply 0–9 阶段可执行性较强。** 尤其是代表切片先行、真实浏览器、URL 恢复、焦点返回、无效状态与中断恢复。
5. **quality gates 关注真实语义而非只看截图。** 真实 link、`aria-current`、AX tree、computed style、根滚动和多视口都是正确方向。
6. **反馈边界意识正确。** 可复用模板缺口与当前业务/工程问题已明确区分，缺的是协议和执行器，不是理念。
7. **`web-v2` 是有价值的真实样例。** 它包含完整技术栈、页面、状态、unit/E2E 和反馈，不应被空的 `skills/*/examples` 忽略。
8. **受控自进化原则合理。** “Experience → Pattern → Proposal → Eval → Update”以及不因一次失败直接改生产 skill，优于无审计自动自改。

## 5. P0：必须先修复的阻断问题

### P0-01 单一事实源失效：OpenSpec、README 与生产契约相互冲突

**证据**

- 现行生产契约只允许设计层 `apply/`，并禁止 stack adapter/目录结构：`skills/ui-template/references/spec-format.md:141-176`。
- validator 明确拒绝 `implementation/`：`scripts/validate_templates.py:188-193`。
- OpenSpec 主规格仍要求 optional `implementation/`，并允许技术栈适配、组件映射和目录结构：`openspec/specs/ui-template-workflow/spec.md:40-49`。
- `openspec/specs/workbench-shell-implementation/spec.md:8-44` 仍强制 `implementation/`、默认 React adapter 和目录契约。
- 根 `README.md:7-20` 仍描述拆分前的单 skill 和已不存在的 `templates/workbench-shell/implementation/playbook.md`。

**影响**

开发者按 OpenSpec 实现会被 validator 拒绝；用户按 README 安装又拿不到 Apply。任何后续优化都会因事实源不唯一继续漂移。

**建议**

1. 明确事实源分工：规范性 schema 与 `spec-format.md`/生产 contract 共同定义结构和语义；active OpenSpec 必须与之同步；validator 是契约的可执行实现，必须由正反 fixture 证明一致，不能反向定义规范；README/AGENTS 是派生说明；历史 patches 只作为不可变档案。schema 与 prose 冲突时应 fail 并要求修复，禁止任选其一继续。
2. 建立一个 OpenSpec 治理 change，以当前 `apply/` + 设计/工程解耦模型为准，更新或归档过期 requirements。
3. 删除 README 对 `implementation/` 的描述，改为双 skill 架构和当前 `apply/` 路径。
4. 为跨文件核心常量建立语义一致性检查：playbook 目录名、origin 枚举、schema version、阶段数、必备文件、禁入内容。

**验收**

- 生产文档和 active OpenSpec 不再出现规范性的 `implementation/` 要求。
- 同一正/反 fixture 被 OpenSpec、skill contract 和 validator 一致接受或拒绝。
- Markdown link check 为 0 broken links。

### P0-02 发行单元错误：公开入口无法安装完整能力

**证据**

- `AGENTS.md` 已说明完整能力需同时安装两个 skill。
- `README.md:15-20` 只复制 `skills/ui-template/`。
- `Makefile:1-8` 硬编码 `SKILL_NAME := ui-template`，且使用叠加式 `cp -r`；不会安装 Apply，也不会清理目标残留。

**影响**

新用户按唯一公开安装方式操作后，Authoring 可以触发，Apply 不存在；产品闭环在入口即断。

**建议**

1. 把发行单元定义为双-skill bundle：`ui-template` + `ui-template-apply`。
2. 提供一个确定性 install/sync 脚本，先写临时目录，再原子替换；禁止简单叠加复制。
3. 生成 `skills-manifest.yaml`，至少记录 bundle version、两个 skill version、template schema version、文件摘要和兼容范围。
4. 项目级 `ui-template-manager` 不进入外部 bundle；它只属于本仓库。

**验收**

- 在临时空项目执行 README 的一条命令后，两个 `SKILL.md` 及全部 references 均存在。
- Authoring 和 Apply 各有一条 trigger smoke test。
- 重复安装可删除已从源中移除的陈旧文件，且不会触碰 bundle 之外目录。

### P0-03 validator 对当前颜色产生“假通过”

**证据**

- `validate_templates.py:47-64` 只支持 `#rrggbb`。
- `validate_templates.py:127-154` 只把 `startswith("#")` 的值放入 contrast pairs；pairs 为空时不报错。
- 当前 `templates/workbench-shell/tokens.yaml` 的主题颜色是 `oklch(...)`。
- 当前校验输出没有任何 `WCAG pairs checked`，最终却整体 `PASSED`。

**影响**

校验器声称检查 WCAG AA，实际对唯一模板检查了 0 个颜色 pair。绿色结果会给 Authoring、Apply 和 CI 错误安全感。

**建议**

1. 支持 opaque OKLCH、HEX；带 alpha 的颜色必须与声明背景合成后计算。
2. 将颜色解析失败、缺少背景、required pair 为 0 设为失败，不能静默 skip。
3. 定义 required role pairs：foreground/background、muted-foreground 对其实际表面、card/popover/primary/secondary/accent 的 foreground pair；当前 `destructive` 是文本/状态色且没有 `destructive-foreground`，应检查它在实际 background/card/popover 上的组合，或在 schema v2 明确新增配对角色后再迁移校验。focus ring 按与实际相邻/合成背景的非文本 3:1 检查，不能虚构不存在的 token pair。
4. 输出结构化计数：`checked / failed / skipped / waived`，并支持 `--json`。
5. 增加 good/bad fixtures 和 mutation tests。

**验收**

- 合法/非法 HEX、OKLCH、alpha fixture 都有正反测试。
- 当前模板每个主题报告非零 required pairs；`skipped > 0` 时失败，除非有显式 waiver。
- 故意降低任一 required pair 对比度，测试必须红。

### P0-04 `origin` 枚举在 Authoring 与 Apply 内部冲突

**证据**

- 权威格式与 validator 允许 `source | computed | estimated | default`：`spec-format.md:136`、`validate_templates.py:31`。
- Apply 主文和消费契约却使用 `observed / default / estimated`：`skills/ui-template-apply/SKILL.md:29`、`references/template-contract.md:11-15`。
- 当前 workbench token 大量使用合法的 `origin: source`。

**影响**

严格按 Apply 文档实现的消费者可能拒绝合法模板；`computed` 没有消费语义，`observed` 又无法通过 Authoring validator。

**建议**

- 只保留四值枚举 `source | computed | estimated | default`。
- Apply 不再复制完整枚举；直接引用权威 schema，并补充“消费时均为确定值，偏离必须记录”的语义。

**验收**

- 生产文档中不再出现 `origin: observed`。
- 四种合法值 fixture 均通过，任一未知值确定性失败。

### P0-05 成熟 Apply 样例存在关键流程阻断与证据名不副实

**证据**

- `web-v2/src/components/app-shell/app-shell.tsx:17` 初始化 `mobileOpen=false`，唯一 setter 使用在关闭路径；没有打开移动导航的触发器。
- `sidebar.tsx:99-102` 在小屏将导航移出视口；模板要求 `<1024px` 使用覆盖 Sheet 与页头触发器：`templates/workbench-shell/platforms/web.md:24-25`。
- E2E 的“drag updates status optimistically”实际只断言首卡可见：`web-v2/e2e/smoke.spec.ts:44-49`。
- Apply 要求 console、AX、computed style、URL、状态、双主题和证据矩阵：`apply-workflow.md:295-319`；仓库没有对应 Phase 8/9 报告。
- `docs/brief.md:85` 声称存在 computed style 检查脚本，实际没有该脚本。
- `playwright.config.ts:12-17` 只执行 `pnpm preview`，非 CI 时允许复用已有 4173 服务，且没有构建或校验服务身份。本次默认命令实际误测其他预览服务，仅 3/24；隔离端口、禁用复用并使用刚构建的 web-v2 后为 24/24。

**影响**

隔离运行的 24/24 只证明现有 8 个 case 在 3 个 project 中可运行；默认命令的 3/24 又证明当前 harness 可误测其他服务。两者都不能证明移动导航可达、真实拖拽成功或 Phase 8/9 完成。样例尚不能可靠认证 Apply 工作流本身。

**建议**

1. 修复所有 `<1024px` 视口的导航 trigger、打开/关闭、路由后关闭、Esc 和焦点返回。
2. 将伪拖拽用例改为真实 DnD + 状态断言，并提供键盘/菜单替代路径测试。
3. 建立 `docs/apply/08-verification.json`、`09-review.md` 和截图/trace 目录。
4. E2E 监听 `console`/`pageerror`，增加 AX、computed style、URL back/forward/invalid、loading/empty/error/404、light/dark/reduced-motion 检查。
5. `test:e2e` 必须在干净 checkout 自建 dist，不能依赖被忽略的旧产物。

**验收**

- 390×844、980×900、1440×900 三档均能通过真实导航完成路由切换。
- 删除 accessible name、改错 token、制造 console error、破坏拖拽状态更新时测试必然失败。
- Phase 8/9 报告包含 commit/build hash、浏览器版本、route/viewport/theme/state、expected/actual、证据路径和复验结果。

## 6. P1：近期应补齐的完整闭环能力

### P1-01 把 Validate → Index → Report 写入 Authoring 主流程

当前 `ui-template` 生成后直接更新 INDEX。应改为：

```text
Generate
  → Validate schema
  → Validate semantic/reference/link/contrast
  → Run relevant contract evals
  → Update INDEX/catalog
  → Report evidence
```

任何验证失败不得更新索引或宣称完成。外部安装环境若没有仓库脚本，也必须有 portable contract checker，而不是依赖本仓 `AGENTS.md`。

### P1-02 定义模板 schema v2，消除“文档要求但机器无法表达”

当前问题：

- `spec-format.md` 示例的 spacing/radius 是裸 scalar/list，却又要求每个 token 有 origin。
- validator 只递归检查含 `value` 的 mapping，裸 leaf 可绕过 origin。
- Apply 要求 page mode coverage，但 `meta.yaml` schema 没有 `coverage.page_modes`。
- validator 只检查 coverage 的 `visual_reference/viewports/themes`，不检查 components/states。
- 数字 token 没有显式单位；component state token 也没有统一位置。

建议 schema v2：

- 所有 leaf 统一 `{ value, unit?, origin, evidence? }`。
- 增加 `coverage.page_modes`、`coverage.platforms` 与 observed/defaulted/unsupported。
- `meta.yaml` 增加 `schema_version`、`template_version`、`sources[]`、分维度 confidence。
- observed/defaulted/unsupported 不得重叠。
- 给 v1→v2 提供迁移器和兼容窗口，禁止静默解释旧格式。

### P1-03 建立 token 级 provenance/evidence

当前只有模板级 source 和 token 级粗粒度 origin，无法回答某个 token 来自 selector、源码行、截图区域还是默认决策。

建议增加 `templates/<name>/evidence.yaml`：

```yaml
- path: themes.light.background
  method: source
  ref: https://example/repo@revision
  locator: src/styles.css:42
  captured_at: 2026-09-03
  confidence: 0.98
  status: active
```

规则：

- `source/computed/estimated` 必须有 evidence；`default` 必须有 basis/decision ID。
- evidence 支持 `active/superseded`，更新时保留历史。
- validator 校验 token path 可解析、source ref 有 revision/capture context、日期与状态合法。

### P1-04 反馈必须从“文件”升级为可发现、幂等、可结案的协议

现有 `web-v2/docs/feedback.md` 有真实价值，但四个相对链接失效，且无 ID、目标模板、状态和消费回执。OpenSpec 要求回写/known-gap/驳回三态，Authoring SKILL 只写了回写/驳回。

建议最小字段：

```yaml
id: workbench-web-v2-001
template: workbench-shell
template_version: ...
source_project: example/workbench-shell/web-v2
scenario: ...
evidence: ...
suggestion: ...
scope: reusable | project-only
status: proposed | accepted | known-gap | rejected | applied | verified
disposition_reason: ...
targets: [...]
```

规定固定 inbox 或显式 glob；相同 ID 不重复应用。模板更新结束时所有输入反馈必须进入终态，并留下目标 diff/commit 或拒绝理由。

### P1-05 为 Apply 建立标准产物目录和 checkpoint

建议消费项目统一写入 `.ui-template-apply/`：

```text
.ui-template-apply/
├── checkpoint.yaml
├── 00-intake.md
├── 01-design-direction.md
├── 01-token-map.yaml
├── 02-routes.yaml
├── 03-structure.md
├── 04-components.yaml
├── 05-07-progress.yaml
├── 08-verification.json
├── evidence/
└── 09-review.md
```

`checkpoint.yaml` 至少保存 template path/version、`tokens.yaml` hash、included/excluded、phase status、artifact paths、last verified commit/build hash。恢复时先校验 hash；token 漂移必须回退 Phase 1，缺证据不得把阶段标为 complete。

### P1-06 使用稳定 gate/rule ID 串联规则、实现与证据

当前文档用章节名和“14 项”等易漂移数字引用。建议：

- Non-negotiables：`NN-001`。
- token：`TOKEN-001`。
- route：`ROUTE-001`。
- accessibility：`AX-001`。
- responsive：`RESP-001`。
- feedback：`FB-001`。

Brief、测试、verification、review、feedback 统一引用 ID。validator 检查 ID 唯一、引用存在、无悬空、未引用关键规则可被报告。

### P1-07 将 eval 从人工 checklist 变为可执行回归

两个当前 `evals/README.md` 仍要求人工核对 `must/must_not`。历史 patch 中的 10/15 等 case 数是当时 revision 的不可变审计快照，且后续 split change 明确迁移了 Apply 专属 case，不应拿历史数字判断当前缺陷；runner 只应对当前 Authoring 9 条 + Apply 8 条校验“声明数 = 解析数 = 执行数”，并记录 revision 与 fixture hash。

建议：

1. 区分 `judge: script` 与 `judge: llm`。
2. 优先自动化确定项：frontmatter、路由边界、origin、schema、coverage、链接、镜像、安装、checkpoint、feedback 状态机。
3. LLM eval 使用固定 fixture、rubric、输出 schema 和基线 hash。
4. runner 输出 JSON/JUnit，记录 case count、ID、fixture hash、运行版本和 delta。
5. 增加 authoring 的 web/repo/image/doc fixture；Apply 增加 no-template、token drift、coverage decision、recovery、evidence missing、feedback consumption。

### P1-08 建立最小 CI 与可复现工具链

建议 CI 分层：

- **governance**：template validator、OpenSpec strict、Markdown links、eval schema/ID、skill frontmatter、镜像/manifest drift。
- **web-v2**：frozen install、typecheck、lint、unit、build。
- **browser**：三视口 E2E，可在 PR 或 nightly；关键 P0 流程应在 PR。
- **mutation/negative fixtures**：证明 validator 与 gate 会在错误时失败。

同时固定 PyYAML、OpenSpec、Node、pnpm 版本；`package.json` 声明 engines/packageManager；提供统一入口，例如 `make validate`。

### P1-09 只保留一个权威 skill 源，镜像必须可重建

当前 `skills/` 与 `.agents`/`.kiro` 的生产正文大体一致；额外历史 patch 有明确的最初归属和同步记录，属于审计档案，不能直接认定为陈旧残留。真正可确定的结构性风险是 `Makefile` 使用叠加式 `cp -r`：若源中删除普通生产文件，目标副本不会自动删除。

建议：

- `skills/` 是唯一生产正文权威。
- `.agents`/`.kiro` 若入库，则生产文件只能由生成器重建并由 CI diff；若不入库，则作为安装产物忽略。
- sync 先清 staging、复制、生成 manifest/checksum，再替换目标。
- 历史 patches/experience 单独定义迁移与保留策略，不纳入生产正文等价 diff，也不得被同步脚本无条件删除。
- 用临时 fixture 验证“源删除一个普通生产文件后重装，目标残留消失”，不要用历史档案代替该测试。

### P1-10 修正文档、模板实例与样例的已知漂移

至少包括：

1. 根 README 的双 skill、安装、`apply/` 路径和 web-v2 导航。
2. AGENTS 中“无配置/无代码/无依赖”等过期陈述。
3. workbench 来源描述：AGENTS 的“设计文档/default”与 `meta.yaml` 的 `repo/source` 冲突。
4. `spec.md` 标准 focus 3px 与 `components.md` 部分组件 2px 的冲突。
5. `platforms/mobile.md` 的精确色值应进入 tokens 平台 namespace，或移除精确覆盖声明。
6. `web-v2` Brief 写 Inter，实际 CSS/README 使用 Geist；必须记录批准偏离或恢复一致。
7. unknown route 不应静默重定向 inbox，应提供真实 404。
8. 980px 的实现断点与模板 `<1024px` overlay 规则应一致。

### P1 逐项复验出口

| 项目 | 产物/命令 | 失败注入与通过条件 |
| --- | --- | --- |
| P1-01 Authoring gate | `validate → eval → index` runner 与运行报告 | 删除必备文件或制造无效 origin 后必须在 INDEX 写入前失败；合法 fixture 才能更新索引 |
| P1-02 schema v2 | versioned schema、v1→v2 migrator、good/bad fixtures | 裸 leaf、未知单位、coverage 重叠、未知 schema version 必须失败；迁移前后语义值一致 |
| P1-03 evidence | `evidence.yaml` schema 与 token-path resolver | 删除任一 `source/computed/estimated` 的 evidence 或使用悬空 path 必须失败；全部 token 可追溯时通过 |
| P1-04 feedback | feedback schema、inbox、triage receipt | 同一 ID 重跑不得产生第二次 diff；所有输入最终为 accepted/known-gap/rejected/applied/verified 之一并有理由 |
| P1-05 checkpoint | `.ui-template-apply/checkpoint.yaml` validator | 改动 token hash 必须回退 Phase 1；删除 Phase 8 evidence 不得把 Apply 标为完成 |
| P1-06 rule ID | rule/reference linter | 重复 ID、悬空引用、关键规则无证据必须失败；Brief→test→evidence→feedback 可按 ID 串联 |
| P1-07 eval runner | `run_contract_evals` JSON/JUnit | 当前声明数=解析数=执行数=17；改坏 locked case 必须造成非零退出，结果含 revision/fixture hash |
| P1-08 CI/tooling | frozen install + governance/web/browser jobs | 空缓存干净 checkout 运行；命令后 manifest/lockfile 无 diff；validator 负向 fixture 和关键 E2E 均可阻断 |
| P1-09 镜像 | bundle builder、生产正文 drift check、历史档案策略 | 临时源删除普通生产文件后重装，目标残留必须消失；生产正文 diff=0，历史档案按独立规则保留 |
| P1-10 漂移清理 | Markdown link checker + 跨文档断言 | 本地相对链接 0 broken；来源/origin/focus/字体/断点/路由规则各有一条自动一致性断言 |

## 7. P2：中期增强项

1. **版本与发布。** 增加 SemVer、CHANGELOG、bundle artifact/checksum、Authoring × Apply × schema 兼容矩阵和 rollback 点。
2. **模板 catalog digest。** 由脚本生成模板数、平台/主题/coverage 统计和关键文件 hash；禁止手工维护第二事实源。
3. **第二类模板。** 当前只有 workbench-shell，契约可能过拟合后台 App Shell；增加内容站或营销页 fixture 验证通用性。
4. **正式案例索引。** `skills/ui-template/examples` 不应继续声称没有成功案例；链接到 web-v2 brief、反馈和验证证据即可，不必复制源码。
5. **patch/experience 索引。** 增加 target/status/supersedes/evidence/OpenSpec change/commit/release/eval result，区分历史快照与现行规则。
6. **样例性能基线。** web-v2 按路由分包，记录 bundle budget；但它低于契约、移动导航和证据链优先级。
7. **资产许可与隐私。** Authoring 保存截图/图片时记录 provenance、license、redistribution、redaction；含账号或内部数据默认不得进入可分发模板。
8. **web-v3 promotion gate。** 它已不再是空壳，但仍是未跟踪且持续变化的 WIP；只有在纳入明确 change/branch、frozen install、typecheck/lint/build/unit/E2E、三视口证据、feedback、中文 README 和发布快照全部通过后，才能进入发布导航。

## 8. 从 ui-ux-pro-max 借鉴什么

### 8.1 应借鉴

#### A. Query Contract，而不是“调用一下工具”

`ui-ux-pro-max/SKILL.md:49-61` 规定：最小查询模式、单一主意图、2–5 个关键词、核对 top identity、最多重试一次、失败后明确 abstain、不得持久化未验证输出。

当前 Apply toolchain 只写“请求多个候选并映射到 token”。应升级为：

- 新项目方向用 `--design-system --json`；局部问题用显式 `--domain`；工程问题用 `--stack`。
- 每次只查一个主意图，记录 query/mode/top identity/source/fit/fallback。
- 空结果或错配只重写一次；仍失败则标记“无 verified match”，回退模板规则。
- Apply 默认禁止 `--persist`，因为模板 `spec.md/tokens.yaml` 才是权威。
- 路径从 skill root 发现，不硬编码本机或 Claude 特定目录。

#### B. 结构化 provenance 与 catalog snapshot

`ui-ux-pro-max` 的 `data-provenance.json` 记录 entity、sourceFile/sourceKey、status、verifiedAt、sla、appliesTo、confidence、sources；`catalog-summary.json` 记录计数、SHA-256、promotion policy 和 pending candidates；validator 会重算摘要并拒绝 stale snapshot。

可直接映射为本项目的 `evidence.yaml`、模板 catalog digest 和发布 manifest。

#### C. Fail-closed 的闭集推理契约

`reasoning_contract.py` 对未知 condition/action、重复 key、非法 token 全部失败，并只返回 mutation + activated audit trail，明确“never execute data”。

本项目不必把 `spec.md` 改成 DSL，但机器可读的 rule ID、coverage、feedback status、checkpoint phase 必须使用闭集枚举，未知值失败，不要猜测。

#### D. 语义级 validator 与负向测试

`ui-ux-pro-max` 不只检查 CSV 能否解析，还校验跨表身份、官方 host、状态/版本、字体/图标/颜色语义、catalog hash 和 provenance 覆盖。本项目 validator 应从“文件存在”升级为“跨文件事实一致 + 负向 fixture 必须失败”。

#### E. 回归基线与 abstention 指标

其 relevance fixtures 区分 calibration/held-out、hard negatives、locked cases、runtime/oracle fingerprint，并同时记录当前 floor 与 proposed target。未来本项目若加入模板检索/router，可借鉴 P@k/MRR/NDCG/negative abstention；在此之前，应先把 17 条现有 contract eval 自动化。

### 8.2 不应照搬

1. **不要复制大数据集。** 1934 fonts、1512 upstream icons、1260 stack guidelines 会给本仓引入许可、更新和 freshness 负担。
2. **不要引入第二套 `MASTER.md + pages override` 权威。** 它会与 `spec.md/tokens.yaml` 冲突。
3. **不要把 22 份 stack CSV vendoring 到模板。** stack adapter 应属于消费项目 `.ui-template-apply/`，并带版本和来源。
4. **不要复制通用 anti-pattern 为所有模板事实。** 只能作为候选，最终必须受来源、模板和用户约束。
5. **不要照搬其发布缺陷。** 本机安装包的 2 个测试因缺脚本无法导入，说明 release artifact self-containment 也必须被测试。
6. **不要照搬路径假设。** 参考 skill 文档中的 Claude 路径与本机实际安装路径并不一致。

## 9. 推荐目标架构

### 9.1 Authoring 控制面

```text
skills/ui-template/                 # 流程与格式所有权
schemas/                            # meta/tokens/evidence/feedback/checkpoint
scripts/
  validate_templates.py            # schema + semantics + links + contrast
  validate_repository.py           # docs/OpenSpec/mirror/manifest consistency
  run_contract_evals.py             # script/LLM eval orchestration
  build_bundle.py                   # 双-skill artifact + manifest
fixtures/
  templates/good|bad/
  feedback/
  apply-checkpoints/
templates/
  catalog-summary.json              # 脚本生成
```

### 9.2 Apply 数据面

```text
.ui-template-apply/
  checkpoint.yaml
  00-intake.md
  01-design-direction.md
  01-token-map.yaml
  02-routes.yaml
  03-structure.md
  04-components.yaml
  05-07-progress.yaml
  08-verification.json
  evidence/*
  09-review.md
  feedback/*.yaml
```

### 9.3 兼容与裁决原则

1. `schema_version` 决定可解析性；不支持时明确失败。
2. `spec.md` 决定设计规则；`tokens.yaml` 决定精确值。
3. `evidence.yaml` 解释来源，不覆盖 token。
4. `.ui-template-apply/` 记录消费项目决定，不回写模板工程结构。
5. feedback 只有 Authoring triage 后才能改变模板。
6. 所有发布物绑定 bundle version、schema version、hash 和 eval result。

## 10. 分阶段实施路线图

### 0–2 天：恢复单一事实源

1. 修 active OpenSpec，统一 `apply/` 模型。
2. 重写 README 安装与目录说明，修 6 个已知断链。
3. 统一 origin 四值枚举。
4. 将 Validate gate 写入 Authoring。
5. 修 Makefile/安装脚本为双-skill bundle，并做临时目录 smoke test。

**退出标准：**文档/规格/validator 无核心语义冲突；双 skill 可按 README 安装。

### 第 1 周：让绿色结果可信

1. 修 OKLCH/alpha 对比度与 fail-closed 输出。
2. 增加 schema/validator 正反 fixtures、`--json`。
3. 修复 web-v2 移动导航、真实 DnD、404、断点和 E2E 自构建。
4. 产出标准 Phase 8/9 evidence。
5. 建最小 governance + web-v2 CI。

**退出标准：**故意注入 token、AX、console、route、mobile nav 错误时，相关 gate 稳定失败。

### 第 2 周：闭合反馈、恢复与 eval

1. 落地 feedback schema/inbox/三态结案。
2. 落地 `.ui-template-apply/checkpoint.yaml` 和恢复 validator。
3. 将现有 eval 拆成 script/LLM，并输出 JSON/JUnit 基线。
4. 把 web-v2 反馈正式 triage，并至少转成一个 regression case。
5. 将 web-v2 纳入 examples，experience 至少沉淀真实 success/failure。

**退出标准：**从 Apply 发现到 Authoring 回执再到回归 case 可追踪；新会话可只凭 checkpoint 恢复。

### 第 3–4 周：schema v2 与发布治理

1. 引入 evidence、page mode coverage、单位、版本和迁移器。
2. 建 SemVer、CHANGELOG、manifest、release artifact/checksum。
3. 清理镜像策略，建立 reproducible sync/drift check。
4. 增加第二类模板 fixture。
5. web-v3 达到 promotion gate 后再决定替换或并列 web-v2。

## 11. 建议验收指标

| 维度 | 指标 |
| --- | --- |
| 契约一致性 | active OpenSpec/skills/validator 核心常量冲突为 0 |
| 安装 | 临时目录双-skill install smoke 100% 通过 |
| 链接 | 跟踪文档 Markdown 本地相对链接错误为 0 |
| token | 合法 origin 覆盖 4/4；未知值拒绝率 100% |
| 对比度 | required pairs 全部 checked；无静默 skipped |
| schema | good fixtures 全过，bad/mutation fixtures 全拒绝 |
| Authoring | 验证失败时 INDEX 和完成汇报均不发生 |
| Apply 恢复 | 产物/hash 缺失或漂移时自动回退正确阶段 |
| 浏览器证据 | included routes × 3 视口；关键路由 × 2 主题；证据绑定 build hash |
| 关键流程 | mobile nav、真实 DnD/替代操作、URL refresh/back/invalid、焦点返回均自动化 |
| 反馈 | 输入反馈 100% 有唯一 ID 和终态；accepted 项 100% 有目标 diff/回归 |
| eval | 声明数=解析数=执行数；结果含 fixture/runtime hash |
| 发布 | bundle 可复现，manifest/checksum/兼容矩阵完整 |
| 治理 | tracked skill 镜像 drift 为 0，CI 自动阻断 |

## 12. 建议优先级总表

| ID | 优先级 | 建议 | 价值 | 依赖 |
| --- | --- | --- | --- | --- |
| P0-01 | P0 | 统一 OpenSpec/生产契约/README | 恢复单一事实源 | 无 |
| P0-02 | P0 | 双-skill bundle 安装 | 打通外部入口 | P0-01 |
| P0-03 | P0 | OKLCH/alpha fail-closed validator | 消除假绿 | 无 |
| P0-04 | P0 | 统一 origin 枚举 | Authoring/Apply 可互操作 | P0-01 |
| P0-05 | P0 | 修 web-v2 移动导航与 Phase 8/9 证据 | 让样例真正证明 Apply | P0-03 |
| P1-01 | P1 | Authoring 强制 Validate gate | 阻止坏模板入库 | P0-03 |
| P1-02 | P1 | schema v2 | 消除字段歧义 | P0-04 |
| P1-03 | P1 | token evidence/provenance | 来源可审计 | P1-02 |
| P1-04 | P1 | feedback 状态机 | 闭合回写 | P0-01 |
| P1-05 | P1 | Apply checkpoint/标准产物 | 可恢复 | P1-02 |
| P1-06 | P1 | 稳定 gate/rule ID | 规则到证据可追踪 | P0-01 |
| P1-07 | P1 | executable eval runner | 防回归 | P1-02/P1-06 |
| P1-08 | P1 | CI + pinned tooling | 可重复验证 | P0/P1 validator |
| P1-09 | P1 | 单一源码 + 可重建镜像 | 消除副本漂移 | P0-02 |
| P1-10 | P1 | 修文档/模板/样例已知漂移 | 降低误用 | P0-01 |
| P2 | P2 | 发布、第二模板、patch index、性能/资产治理 | 规模化与长期维护 | P0/P1 完成 |

## 13. 最终判断

本项目不需要再增加一套更长的“最佳实践说明”，而需要把现有优秀流程转成**可判定状态机**：

- Authoring 必须在验证通过后才能入库；
- Apply 必须在证据存在后才能完成；
- feedback 必须在结案后才能算被消费；
- experience 必须在变成回归后才能推动生产规则；
- release 必须在 bundle 可复现后才能对外宣称完整能力。

`ui-ux-pro-max` 最值得吸收的是工程护栏：Query Contract、结构化 provenance、fail-closed parser、语义 validator 和带 fingerprint 的回归基线；不应复制其大数据规模或创建第二套设计权威。

若只能做一轮优化，建议严格按以下顺序：**单一事实源 → 双-skill 安装 → validator 可信 → web-v2 关键流程/证据 → feedback/checkpoint → executable eval/CI → schema v2/provenance/release**。这条路线可以以最少重构，最快把当前“流程看起来完整”提升为“功能上真正闭环”。
