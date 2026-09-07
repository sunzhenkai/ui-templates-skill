## Context

现行公开产品是必须成对安装的 `ui-template-author` 与 `ui-template-apply`，共享 schema v2 模板契约。消费项目里没有「可执行 Design System」这一层，Agent 仍会按页发明视觉。规划草案见仓库排除项 `docs/ui-template-design.md`；本 change 把它提升为可 archive 的契约，生产正文落在 `skills/ui-template-design/`。

约束：生成物不是修复面；模板不得含 `implementation/`；greenfield 无官方默认栈；`docs/**` 与 `example/**` 仍排除；实现阶段用 skill-creator 写 skill，但本仓 eval 走既有 contract runner，不把 skill-creator 的 eval-viewer 当作发布门禁。

## Goals / Non-Goals

**Goals:**

- 一个可单独安装的 public skill，在消费项目冻结 Token → Primitive → Pattern → Page Type。
- SKILL.md 用 progressive disclosure：body 只放路由、不变量、阶段表与完成定义；分层细节按需读 references。
- 确定性检查（freeze schema、token/import 扫描、独立夹具 eval）可脚本化。
- Author/Apply 行为在无 freeze 时零变化。

**Non-Goals:**

- 不在本 change 实现业务样例站，不 promote `example/**`。
- 不把 Design 绑进模板对强制升级。
- 不把 Storybook、shadcn、Playwright 写成唯一实现。
- 不在本规划阶段写生产 `skills/ui-template-design/**`（那是 apply）。

## Decisions

### D1. 名称保持 `ui-template-design`

与本仓产品家族并列，description 写明无模板也可，避免 under-trigger。备选 `ui-framework-design` 切断「必须先有模板」的联想，但会让 `npx skills add` 与 manager 路由看起来像另一个产品。

### D2. 独立契约 `design-freeze/v1`，不复用模板 schema v2

Freeze 是消费项目状态，不是可发布模板。复用 v2 会迫使安装 Author validator、并诱惑把 kit 写进 catalog。模板若存在，只做 token/rule 映射适配器。

### D3. 默认交付契约 + Primitive + Pattern + Gallery，而不是全站页面

独立 skill 的完成面是可组装的体制。全站迁移是后续任务。Golden Page 可选，不进完成必要条件（见 specs）。

### D4. Gallery 第一适配器是应用内路由

v1 在已确认栈的输出根提供 `/dev/design-system`（或等价 dev-only 路由）。Storybook 作为可选 adapter 写在 reference，不是 freeze 条件。避免把 Node 文档站写成 skill 硬依赖。

### D5. 可执行规则写成独立文件，不默默改写整份 `AGENTS.md`

skill 写入消费项目可被 Agent 加载的片段，例如 `.cursor/rules/ui-design-system.mdc` 与 `AGENTS.design.md`，并在 receipt 里提示合并。默默覆盖根 `AGENTS.md` 会丢失项目其它规则。

### D6. skill-creator 管正文形态，本仓 runner 管发布 eval

Apply 本 change 时按 skill-creator：

1. 先写 `SKILL.md`（name/description/body <500 行，祈使句，解释 why）。
2. references 按模式拆分，从 body 条件加载。
3. 准备 3 条真实用户口吻的 eval prompt（见下），实现后用契约 script judge 覆盖可判定部分。
4. 不把 skill-creator 的 `eval-viewer` / `evals/evals.json` 作为本仓 CI 门禁；如需定性对比，可另开会话，不阻断治理。

建议 description（实现时可再收口触发面）：

> 在消费项目建立并冻结可执行前端 Design System（语义 token、UI primitives、页面 Pattern、Page Type、Gallery 与视觉回归）。用于“做设计系统/统一 UI 框架/抽取 token 与页面模板/重构漂移的前端视觉/给 Agent 可组装的组件层”。无 published 模板、未安装 ui-template-author 或 ui-template-apply 时也必须使用本 skill。做成可发布模板交给 ui-template-author；按已有模板实现业务页面交给 ui-template-apply。

建议实现后的定性 prompt（skill-creator test cases）：

1. 「这是个空目录，帮我给内部后台先搭一套设计系统，先不要写业务页。」
2. 「现有 React 页面颜色和间距已经漂了，先别改 API，把 token 和 List/Detail pattern 收拢。」
3. 负例：「用 workbench-shell 把 Tasks 页做出来」→ 应移交 Apply，不在 Design 里画业务页。

### D7. skill 目录形态

```text
skills/ui-template-design/
├── SKILL.md
├── references/
│   ├── layers.md
│   ├── constitution-template.md
│   ├── executable-rules.md
│   ├── data-state.md
│   ├── inventory.md
│   ├── legacy-mapping.md
│   ├── gallery.md
│   ├── visual-loop.md
│   ├── greenfield.md
│   ├── existing-refactor.md
│   └── adapters.md
├── evals/cases.yaml
└── runtime/          # freeze digest、token 扫描；可执行则放 scripts/
```

消费项目：

```text
.ui-template-design/     # 状态、checkpoint、freeze.yaml、evidence
<output-root>/           # tokens、components/ui、components/patterns、Gallery、规则片段
```

### D8. 分发：同一仓库产物，两条安装面

`distribution-v1.yaml` 增加 `ui-template-design` include。`make bundle` 带上三个 public skill。成对 `npx`/`make install` 目标仍是 Author+Apply，不得删 Design。单独 `-s ui-template-design` 不要求 catalog。mirror allowlist 加入 Design。

### D9. Apply 只读 freeze 文件

Apply 检测 `.ui-template-design/freeze.yaml`。不 import Design references。无文件则现行工作流。manager 增加设计系统路由。

### D10. 视觉自愈上限 3 与 diff 阈值默认 0.5%

写进 visual-loop reference；项目可覆盖阈值，但不得用覆盖来跳过 3 次上限。

## Risks / Trade-offs

- [独立 skill 变成万能前端助手] → description 与 SKILL 路由硬排除「做成模板」「实现业务页」；eval 含负例。
- [无模板时视觉失控] → token 必须用户确认才 freeze；raw palette 扫描 fail closed。
- [Apply 与 Design 双头发明] → 有匹配 freeze 则投影；无 freeze 不强制先 Design。
- [bundle 变大、安装器误删] → 安装目标按 `-s` 选择；成对升级保留 Design。
- [Gallery 栈相关] → 契约只要求可运行橱窗；路由 vs Storybook 是 adapter。
- [skill-creator 定性 eval 与本仓 script eval 分叉] → CI 只认 script judge；定性 prompt 留在 tasks 供 apply 时人工看。

## Migration Plan

1. 实现 skill 正文与 freeze schema（不改模板 catalog）。
2. 更新 scope、distribution、mirror、README/AGENTS/FUNCTIONAL-LOOP/manager。
3. 接入 eval runner 的 Design cases（含无 Author/Apply 夹具）。
4. Apply 增加可选 freeze 投影（无文件零行为）。
5. 回滚：移除 `skills/ui-template-design/` 与 allowlist 条目，恢复双 skill 文档；已安装 Design 的消费项目需用户自行删除该 skill 目录，模板对不受影响。

旧用户未装 Design 时 Author/Apply 完全兼容。无需数据迁移。模板 schema 仍为 v2。

## Open Questions

无。Gallery 适配器、Golden Page 是否强制、规则文件位置、skill 名称已在 D1/D4/D5/D3 锁定，不再影响本 change 的 spec 与任务拆分。
