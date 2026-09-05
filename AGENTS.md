# AGENTS.md

面向在本仓库工作的 AI 编码助手的指南。

## 语言与边界

- 默认使用简体中文；代码、命令、标识符和路径保留原文。
- 不提交凭据、私有数据或环境专属绝对路径；来源资产必须遵守许可、再分发和脱敏决定。
- `example/workbench-shell/web/**`、`example/workbench-shell/web-v1/**`、`example/workbench-shell/web-v2/**`、`example/workbench-shell/web-v3/**` 和 `docs/**` 是治理排除项。root governance 不读取或运行样例内容，也不以样例质量决定发布通过。生成 web 不是修复面。
- 现行功能闭环与目标见 [`governance/FUNCTIONAL-LOOP.md`](governance/FUNCTIONAL-LOOP.md)。`docs/functional-loop-review.md` 已 superseded。
- `openspec/changes/archive/**`、`skills/**/patches/**`、`skills/**/experience/**` 是 immutable history：只按档案策略分类/检查可读性，不做当前术语重写。

## 产品与事实源

本仓库发布两个必须配套安装的 public skills：

- `skills/ui-template-author/`：Template Authoring、schema v2 格式语义、分层抽取、迁移/验证/反馈消费和模板库生命周期（创建/更新/浏览/退役/删除）。
- `skills/ui-template-apply/`：消费已发布 published 模板的 Phase 0–9、checkpoint、current-build 浏览器证据、可选原版对照、review 与 feedback。

`.agents/skills/ui-template-manager/` 是 repository-only 路由薄封装；不得把它当作公开产品源码。生产正文唯一源码是 `skills/`，`.agents/skills/{ui-template-author,ui-template-apply}` 是 allowlist 生成镜像。

事实源按职责分层：

1. `schemas/template/v2/`：core 字段、类型和闭集枚举。
2. `schemas/template/fidelity/v1/`：可选 `fidelity.yaml` sidecar 的独立 profile schema。
3. `skills/ui-template-author/references/spec-format.md`：模板字段语义、所有权和 Authoring 行为。
4. active OpenSpec：对外可观察要求。`harden-template-lifecycle` 与 `close-functional-loops` 已 archive 并合入 `openspec/specs/`；当前无 pending overlay。
5. `scripts/template_validation/`：上述契约的可执行实现（含 portable profile 与 session-source replay）。
6. `governance/release/`：bundle 2.0.0、兼容、迁移、回滚与分发 allowlist。
7. `governance/FUNCTIONAL-LOOP.md`：现行功能闭环与目标；与 1–6 冲突必须先修复。
8. `README.md`、本文件和发布说明是派生入口；冲突必须修复，不能选择性忽略。

## 模板契约

schema v2 必备 `spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml`，可含拆分设计文档、可选 `fidelity.yaml` 和技术栈无关的 `apply/`。`tokens.yaml` 是精确值唯一载体；origin 只允许 `source | computed | estimated | default`。`fidelity.yaml` 使用独立 schema family `repo-structural-v1`，只引用 token path/rule ID/闭集 semantic，不复制精确值。模板禁止 `implementation/`、stack adapter、工程目录、依赖、API/mock/data 分层、状态库选型和 runnable starter。已发布无 sidecar 模板是 `legacy-baseline`，layout 不得为 high；未知 profile fail closed。structural 导入需要 chrome-complete literal graph。`--source-root` / `--require-source-replay` 只用于本会话 Generate-from-source，不得因 provenance 向用户索要历史路径。测试与治理资产不得放在 `example/**`。

`templates/workbench-shell/` 的来源是两项并列来源：固定 revision `879d0de9166261c26ec35b69f5cec9382191eda1` 的公开 `multica-ai/multica` 仓库源码，以及 revision `0aedb680ecdf61aa8eafdb5d80e6b58edba63df5` 的用户 Markdown 布局设计文档（出处已抹除、业务实体已泛化）。准确身份见 `templates/workbench-shell/meta.yaml`，token/default provenance 见 `evidence.yaml`；不得从被排除样例反推模板决定。`meta.sources[]` 只是出处身份，不是本地 checkout 绑定；无本会话 source 时保持 `legacy-baseline` 并做 portable 校验，禁止向用户索要这两条来源的本地绝对路径。

## 固定环境与精确命令

```bash
make bootstrap
make validate
make test
make eval
make bundle
make mirror-check
make mirror-write
```

默认固定环境为 `/tmp/ui-template-governance-venv`。等价的 canonical 命令：

```bash
python3 -m venv /tmp/ui-template-governance-venv
/tmp/ui-template-governance-venv/bin/python -m pip install -r governance/requirements-governance.txt
/tmp/ui-template-governance-venv/bin/python -m unittest discover -s tests -v
/tmp/ui-template-governance-venv/bin/python scripts/validate_templates.py templates --json
/tmp/ui-template-governance-venv/bin/python scripts/run_contract_evals.py --json-out governance-reports/eval.json --junit-out governance-reports/eval.xml
/tmp/ui-template-governance-venv/bin/python scripts/check_active_release.py --json-out governance-reports/active-release.json
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py build --output-dir dist
/tmp/ui-template-governance-venv/bin/python scripts/manage_skill_distribution.py mirror --check --target .agents/skills
openspec validate --all --strict
```

安装/升级必须通过双-skill installer，目标是 skills 父目录：

```bash
ARTIFACT=dist/ui-templates-skill-2.0.0.tar.gz \
INSTALL_TARGET=/path/to/project/.agents/skills \
make install
```

不得恢复旧 `cp -r skills/ui-template-author ...` 入口。installer 只替换两个 public skill，保留其他 skills 与独立历史档案。v1 迁移使用：

```bash
/tmp/ui-template-governance-venv/bin/python scripts/migrate_template.py SOURCE CANDIDATE
```

迁移器只写候选目录；未知 schema、未解决 migration 项或任何 validator/eval error 都不能进入索引或发布。

## 闭环规约

只认 [`governance/FUNCTIONAL-LOOP.md`](governance/FUNCTIONAL-LOOP.md) 的四条不变量：

- 生成物不是修复面。
- Apply 零原版、零历史 web。
- INDEX 是唯一目录（`published` 才可新消费）。
- 未声明的变更保持原字节。

## 修改规则

- 改模板 schema/Authoring：同步 `schemas/template/v2/`、`skills/ui-template-author/`、validator、fixtures、active OpenSpec delta 与派生文档。
- 改 Apply：同步 `skills/ui-template-apply/`、Apply state/schema、eval、active OpenSpec delta。
- 改公开生产 skill 后运行 `make mirror-write`，再以 `make mirror-check` 证明零漂移；生成器只管理 allowlist 文件。
- 改 `templates/` 后至少运行真实模板 validator；不得把样例测试当模板契约证据。
- 新增治理依赖必须精确固定版本，并更新 `governance/DEPENDENCIES.md` 与许可用途。
- `governance-reports/` 由 `.gitignore` 排除，不入库；命令仍通过 `REPORT_DIR` / `--json-out` 指定输出路径，不以本地报告当作发布证据。
- 不自动 publish、tag、archive OpenSpec change 或 promote 样例；这些动作需要单独请求。
