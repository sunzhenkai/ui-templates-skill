# AGENTS.md

面向在本仓库工作的 AI 编码助手的指南。

## 语言与边界

- 默认使用简体中文；代码、命令、标识符和路径保留原文。
- 不提交凭据、私有数据或环境专属绝对路径；来源资产必须遵守许可、再分发和脱敏决定。
- `example/workbench-shell/web/**`、`example/workbench-shell/web-v1/**`、`example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 和 `docs/**` 是治理排除项。root governance 不读取或运行样例内容，也不以样例质量决定发布通过。生成 web 不是修复面。
- 现行功能闭环与目标见 [`governance/FUNCTIONAL-LOOP.md`](governance/FUNCTIONAL-LOOP.md)。`docs/functional-loop-review.md` 已 superseded 并移除。
- `openspec/changes/archive/**`、`skills/**/patches/**`、`skills/**/experience/**` 是 immutable history：只按档案策略分类/检查可读性，不做当前术语重写。

## 产品与事实源

本仓库发布三个 public skills。`ui-template-author` 与 `ui-template-apply` 必须配套安装；`ui-template-design` 可单独安装，不要求模板或另外两个 skill：

- `skills/ui-template-author/`：Template Authoring、`design-system/v1` 格式语义、分层抽取、迁移/验证/反馈消费和模板库生命周期（创建/更新/浏览/退役/删除）。
- `skills/ui-template-apply/`：消费 digest 一致 Active Instance 的 `bootstrap | increment` Phase 0–9、checkpoint、current-build 浏览器证据、可选原版对照、review 与 feedback。
- `skills/ui-template-design/`：在消费项目创建、领养、重构、迭代并冻结 `design-system/v1` Active Instance（portable core、project binding、Token Projection、Primitive、Pattern、Page Type、Gallery）。

`.agents/skills/ui-template-manager/` 是 repository-only 路由薄封装；不得把它当作公开产品源码。生产正文唯一源码是 `skills/`；`.agents/skills` 不得存放公开 skill 镜像。

事实源按职责分层：

1. `schemas/design-system/v1/`：统一 Design System Contract 的 manifest、portable core、binding、migration、feedback、checkpoint 和 vendor 字段；`schemas/template/v2/` 只保留 schema v2 migration 语义。
2. `schemas/template/fidelity/v1/`：可选 `fidelity.yaml` sidecar 的独立 profile schema。
3. `skills/ui-template-author/references/package-format.md`：当前 package 字段语义、所有权和 Authoring 行为；`references/spec-format.md` 只服务 schema v2 migration。
4. active OpenSpec：对外可观察要求。`harden-template-lifecycle` 与 `close-functional-loops` 已 archive 并合入 `openspec/specs/`；当前无 pending overlay。
5. `scripts/template_validation/`：上述契约的可执行实现（含 portable profile 与 session-source replay）。
6. `governance/release/`：bundle 3.0.1、兼容、迁移、回滚与分发 allowlist。对外入口是成对 `npx skills add`（Author/Apply）以及单独 `-s ui-template-design`；`make bundle` 是可复现发布与 checksum 治理通道。官方模板副本在 `skills/ui-template-author/catalog/`。安装态三个 public skill 自带 `runtime/shared_validate_design_system.py`；`UI_DESIGN_SYSTEM_VALIDATOR` 不得指向 discovery wrapper。
7. `governance/FUNCTIONAL-LOOP.md`：现行功能闭环与目标；与 1–6 冲突必须先修复。
8. `README.md`、本文件和发布说明是派生入口；冲突必须修复，不能选择性忽略。

## 模板契约

当前发布契约是 `design-system/v1`。Template Package 必备 `design-system.yaml`、`meta.yaml` 与七层 `core/`（tokens、primitives、patterns、page-types、layout、rules、evidence），可含技术栈无关 `apply/`。Active Instance 另有 `binding.yaml`、Token Projection digest、checkpoint 与证据。schema v2 template 和 design-freeze v1 是 migration-only source。

`core/tokens.yaml` 是 token 精确值唯一权威；原生 theming 是 binding 声明的 Token Projection，不得双向同步。capability 只允许 `tokens-only | ui-kit | page-system`。Stable Entity ID 用于跨层引用、Gallery、verification 和 feedback。package 禁止 `binding.yaml`、`implementation/`、stack adapter、工程目录、依赖、API/mock/data 分层、状态库选型和 runnable starter。未知 contract family、digest 不匹配、partial migration 或 unresolved receipt fail closed。

### workbench-shell 出处

`workbench-shell` 3.0.0 的来源继承 schema v2 时期的两项并列 source：固定 revision `879d0de9166261c26ec35b69f5cec9382191eda1` 的原版仓库源码，以及 revision `0aedb680ecdf61aa8eafdb5d80e6b58edba63df5` 的用户 Markdown 布局设计文档（出处已抹除、业务实体已泛化）。上游仓库/产品名只允许出现在 `meta.sources[].ref`、本段出处说明和 immutable archive；不得把来源产品写成对齐目标、本机依赖或更新协议主语。

## 固定环境与精确命令

```bash
make bootstrap
make validate
make test
make eval
make bundle
```

默认固定环境为 `/tmp/ui-template-governance-venv`。等价的 canonical 命令：

```bash
python3 -m venv /tmp/ui-template-governance-venv
/tmp/ui-template-governance-venv/bin/python -m pip install -r governance/requirements-governance.txt
/tmp/ui-template-governance-venv/bin/python -m unittest discover -s tests -v
/tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate templates/workbench-shell --kind package --json
/tmp/ui-template-governance-venv/bin/python scripts/run_contract_evals.py --json-out governance-reports/eval.json --junit-out governance-reports/eval.xml
/tmp/ui-template-governance-venv/bin/python scripts/check_active_release.py --json-out governance-reports/active-release.json
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py build --output-dir dist
openspec validate --all --strict
```

对外安装入口是显式 `-s` 的 `npx skills`（不要用 `--all`）。模板产品成对安装：

```bash
npx skills add sunzhenkai/ui-templates-skill -s ui-template-author -s ui-template-apply
```

只装 Design System skill：

```bash
npx skills add sunzhenkai/ui-templates-skill -s ui-template-design
```

根 Makefile 不声明 install 或公开 skill mirror 目标，`.agents/skills` 不是安装目标。不得恢复旧 `cp -r skills/ui-template-author ...` 入口。官方 catalog 随 Author skill 分发；项目可写库是项目根 `templates/`。空项目 Apply 不创建 `templates/`；`seed` 是显式领养。旧格式迁移使用显式 candidate/receipt 流程；schema v2 与旧 freeze 不得直接发布或消费。迁移与验证见 `governance/release/MIGRATION-v2-to-design-system-v1.md` 和 `scripts/validate_design_system.py`。

迁移器只写候选目录；未知 schema、未解决 migration 项或任何 validator/eval error 都不能进入索引或发布。

## 闭环规约

只认 [`governance/FUNCTIONAL-LOOP.md`](governance/FUNCTIONAL-LOOP.md) 的四条不变量：

- 生成物不是修复面。
- Apply 零原版、零历史 web。
- 库宿主 INDEX 是唯一可写目录；消费仓可 catalog pin（`published` 才可新消费）。
- 未声明的变更保持原字节。

## 修改规则

- 改 Design System schema/Authoring：同步 `schemas/design-system/v1/`、`skills/ui-template-author/`、统一 validator、fixtures、active OpenSpec delta 与派生文档；schema v2 migration 行为变化也必须同步迁移器与文档。
- 改 Apply：同步 `skills/ui-template-apply/`、Active Instance/Apply checkpoint schema、vendor resolver、eval、active OpenSpec delta。
- 改公开生产 skill 后运行 `make test`、`make eval`、`make validate`；不得把变更写入 `.agents/skills`。
- 改 Design：同步 `skills/ui-template-design/`、`schemas/design-system/v1/` binding/checkpoint、Design runtime/eval 与 active OpenSpec delta。
- 改 `templates/` 后至少运行真实模板 validator；不得把样例测试当模板契约证据。
- 新增治理依赖必须精确固定版本，并更新 `governance/DEPENDENCIES.md` 与许可用途。
- `governance-reports/` 由 `.gitignore` 排除，不入库；命令仍通过 `REPORT_DIR` / `--json-out` 指定输出路径，不以本地报告当作发布证据。
- 不自动 publish、tag、archive OpenSpec change 或 promote 样例；这些动作需要单独请求。
- 现行文档不得把 `meta.sources[].ref` 中的上游产品名写成特例主语；`check_active_release.py` 从已发布模板 meta 提取名称并拒绝泄漏。archive 与出处段不重写。
