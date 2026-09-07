## Why

Agent 擅长把单个页面做出来，但不擅长长期维护同一套视觉系统：每个页面私造 spacing、调色板和页头，编译通过即结束。现有 Author/Apply 成对产品解决的是「抽模板 / 按模板写页面」，缺一个可独立安装的 skill，把前端从「直接生成页面」改成「在可执行 Design System 约束下组装页面」。

## What Changes

- 新增独立 public skill `skills/ui-template-design/`：在消费项目建立并冻结 Token → Primitive → Pattern → Page Type 体制，配套可执行规则、Gallery 与有限次数的视觉回归。实现按 skill-creator：SKILL.md + progressive disclosure references、确定性 scripts、契约 eval。
- Design **可单独安装、单独跑完**。不依赖 Author、Apply、catalog 或项目 `templates/`。published 模板只作可选视觉输入；Apply 只作可选页面消费方。
- 消费项目产物是设计系统本体（token、primitives、patterns、Gallery、规则块）加上 `.ui-template-design/` 状态与 freeze digest。不创建 schema v2 模板，不把 kit 写进 catalog。
- Author/Apply 成对产品保持不变。Apply 若发现匹配的 design freeze，不得再发明壳 / 原语 / 页类型；没有 freeze 时现行 Phase 0–9 不变。
- 仓库路由 `ui-template-manager` 增加「建立/重构设计系统 → Design」。
- 分发：第三条 public skill **不**加入「必须配套安装」名单。`npx skills add … -s ui-template-design` 单独可用；模板对仍成对安装。
- 派生文档（README、AGENTS.md、FUNCTIONAL-LOOP）声明三 skill 关系。`docs/ui-template-design.md` 仍是排除项草案，不以它作发布证据。

## Capabilities

### New Capabilities

- `ui-template-design-workflow`: 独立 Design System skill 的行为契约：分层体制、任务类（bootstrap / refactor / iterate）与站点形态（greenfield / existing）分开判定、可执行约束、Gallery 与视觉自愈上限、独立完成定义、对 Author/Apply 的 fail-open 适配。

### Modified Capabilities

- `skill-lifecycle-governance`: 公开产品增加可单独安装的 `ui-template-design`；Author/Apply 仍必须成对出现在模板 bundle 中；Design 进入 allowlist / mirror，但缺它不得让模板对发布失败，缺 Author/Apply 也不得让单独安装 Design 失败。
- `ui-template-apply-workflow`: 若消费项目存在身份匹配的 design freeze，Apply 必须投影该 freeze，不得重新发明结构层；无 freeze 时保持现行工作流。
- `ui-template-workflow`: Authoring 增加与 Design 的移交边界：仅当用户要求把项目视觉语言发布为模板时才进入 Authoring；Design 不得 Index 模板。

## Impact

- 新建 `skills/ui-template-design/`（SKILL.md、references、evals、可选 runtime 扫描/digest）。
- 治理：`governance/scope.yaml`、`governance/release/distribution-v1.yaml`、compatibility、README / AGENTS.md / FUNCTIONAL-LOOP、`ui-template-manager` 路由。
- Apply：检测 `.ui-template-design/freeze.yaml` 的可选投影（无 freeze 零行为变化）。
- 新 freeze schema（`design-freeze/v1` 一类），独立于模板 schema v2。
- 不改官方 catalog 内容、不 promote `example/**`、不自动 publish/tag、不把 Design 绑进「必须成对升级」。
- 实现阶段必须走 skill-creator：先写 skill 草案与 2–3 条真实 eval prompt，再靠契约 eval 与描述触发面收口；本提案只规划，不写生产 skill 正文。
