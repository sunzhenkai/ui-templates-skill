# ui-templates-skill

`ui-templates-skill` 发布三个 public skill：

- **`ui-template-author`**：从获授权的 Web、代码仓库、图片或设计文档提取设计规则，创建、迁移、更新 `design-system/v1` portable package 并维护索引。
- **`ui-template-apply`**：消费 digest 一致的 Active Design System，按 `bootstrap | increment` 与 Phase 0–9 在目标项目实现 UI，维护 checkpoint、current-build 浏览器证据、review 与 feedback。
- **`ui-template-design`**：在消费项目创建、领养、重构、迭代并冻结 `design-system/v1` Active Instance（portable core、project binding、Token Projection、Primitive、Pattern、Page Type、Gallery）。可单独安装，不要求 Author/Apply、catalog 或项目 `templates/`。

模板产品必须同时安装 Author 与 Apply。Design 是可选第三条 skill，不加入「必须与模板对同时安装」约束。仓库内 `.agents/skills/ui-template-manager/` 是唯一的 repository-only 路由薄封装，不进入公开 bundle，也不用于存放公开 skill 镜像。Apply 是 source-blind 的：实现期只消费 Active Instance，不读取原版 checkout、`meta.sources[]` 实现路径或历史生成物；对齐原版视觉的对照由模板发布侧的 Template Certification Gate 执行（固定 Visual Oracle revision、candidate package 与固定 prompts，Pattern 级 Visual Equivalence 验收），candidate 停留在 `governance/candidates/`，生产 catalog promotion 需用户单独确认。现行功能闭环、模板生命周期与防回退规约见 [`governance/FUNCTIONAL-LOOP.md`](governance/FUNCTIONAL-LOOP.md)，认证门禁见 [`governance/release/CERTIFICATION-v1.md`](governance/release/CERTIFICATION-v1.md)。`docs/ui-template-design.md` 是规划草案，不是发布能力证据。

## 模板契约

现行发布契约是 `design-system/v1`。Template Package 只包含 portable core：`design-system.yaml` 与 `core/` 下的 tokens、primitives、patterns、page-types、layout、rules、evidence，另加 `meta.yaml`、可选 `apply/`。Project Binding 只存在于消费项目 `.ui-template-design/`，记录 output root、技术栈、实现路径、Token Projection 和构建身份。schema v2 template 与 design-freeze v1 是显式迁移 source，不再是当前发布格式。

`core/tokens.yaml` 是 token 精确值唯一权威；原生 theming 是 Token Projection。Primitive、Pattern、Page Type、Token 和 Rule 使用 Stable Entity ID。package capability 为 `tokens-only | ui-kit | page-system`；缺层必须声明为能力边界。format 语义见 [`skills/ui-template-author/references/package-format.md`](skills/ui-template-author/references/package-format.md)，机器结构见 [`schemas/design-system/v1/`](schemas/design-system/v1/)。当前模板库见 [`templates/INDEX.md`](templates/INDEX.md)；`workbench-shell` 已迁移为 `page-system` package 3.0.0。双 skill 必须配套升级；未知 contract family fail closed。`example/**` 是治理排除项。

## 安装与升级 3.0.1

普通项目成对安装模板产品（不要用 `--all`）：

```bash
npx skills add sunzhenkai/ui-templates-skill -s ui-template-author -s ui-template-apply
```

只建立项目级 Design System 时单独安装，不要求 Author/Apply 或 catalog：

```bash
npx skills add sunzhenkai/ui-templates-skill -s ui-template-design
```

官方 published 模板随 `ui-template-author/catalog/` 安装。空项目 Apply 只读 catalog pin，不创建项目 `templates/`。`seed` / 领养是 Authoring 显式动词：第一次要改模板、接受 feedback 落库或用户明确「把官方模板接到本仓」时才写入项目库；已有同名行或目录不覆盖。

本仓根 Makefile 不提供安装目标，也不把本仓 `.agents/skills` 作为安装目标。治理、checksum 与可复现发布只构建 bundle：

```bash
make bootstrap
make bundle
```

产物为 `dist/ui-templates-skill-3.0.1.tar.gz`、SHA-256 sidecar 和 bundle 内 `skills-manifest.yaml`。升级通过显式 `-s` 的 `npx skills add` 重新选择对应 public skill；不要用旧的单目录 `cp -r` 安装。已安装 3.0.0 需升级后才带共享 design-system validator；不要把 `UI_DESIGN_SYSTEM_VALIDATOR` 指到 discovery wrapper。

## 验证与评估

```bash
make validate       # root governance gate；显式排除 web-v2/web-v3 样例路径
make test           # 全部 Python unittest
make eval           # Authoring/Apply/Design contract eval，输出 JSON/JUnit
```

单独验证 package：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate templates/workbench-shell --kind package --json
```

单独验证 Active Instance：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate .ui-template-design --kind active --json
```

`make validate` 不运行任何样例项目，也不把样例质量作为治理通过条件；排除项会写入机器报告。

## 旧格式迁移与回滚

schema v2 template 和 design-freeze v1 只能作为 migration source。迁移先生成 candidate 和 receipt；`unresolved` 或 `errors` 非空时不得入 INDEX 或作为 Active Instance。按 [`governance/release/MIGRATION-v2-to-design-system-v1.md`](governance/release/MIGRATION-v2-to-design-system-v1.md) 执行。主动回滚使用先前已验证 bundle 并按 [`governance/release/ROLLBACK.md`](governance/release/ROLLBACK.md) 处理；回滚不自动改写项目 Active Instance。版本兼容矩阵见 [`governance/release/compatibility.yaml`](governance/release/compatibility.yaml)，变更记录见 [`governance/release/CHANGELOG.md`](governance/release/CHANGELOG.md)。

## 样例 promotion

样例默认是 WIP，不进入发布能力声明。独立 promotion CLI 只校验 tracked revision、声明的 frozen install/build/static/test/multi-viewport/feedback/localization gates 及证据；它默认不执行样例命令，也不改 README、bundle 或样例目录。被 [`governance/scope.yaml`](governance/scope.yaml) 排除的样例不能 promotion。

## 许可证

MIT，见 [LICENSE](LICENSE)。
