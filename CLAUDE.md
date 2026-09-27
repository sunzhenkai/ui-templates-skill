# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

本仓库的权威指南是根目录 [`AGENTS.md`](AGENTS.md)（事实源分层、修改规则）与 [`governance/FUNCTIONAL-LOOP.md`](governance/FUNCTIONAL-LOOP.md)（四条不变量、功能闭环）。本文只做快速索引；与上述两者冲突时，以它们为准。

## 常用命令

固定 Python 环境在 `/tmp/ui-template-governance-venv`（先 `make bootstrap` 创建）：

```bash
make bootstrap    # 创建 venv 并安装 governance/requirements-governance.txt
make validate     # 根治理门禁（scope、active release、bundle checksum 等）
make test         # 全部 Python unittest
make eval         # Authoring/Apply/Design contract evals，输出到 governance-reports/
make bundle       # 可复现发布包到 dist/（含 SHA-256 sidecar 与 skills-manifest.yaml）
make promote      # candidate → templates → author catalog（PROMOTE_NAME=workbench-shell；含认证门禁）

# 运行单个测试文件 / 单个用例
/tmp/ui-template-governance-venv/bin/python -m unittest tests.test_validator -v
/tmp/ui-template-governance-venv/bin/python -m unittest tests.test_validator.类名.方法名 -v

# 验证单个模板 package / 消费项目 Active Instance
/tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate templates/workbench-shell --kind package --json
/tmp/ui-template-governance-venv/bin/python scripts/validate_design_system.py validate .ui-template-design --kind active --json

# OpenSpec 规格校验
openspec validate --all --strict
```

CI（`.github/workflows/governance.yml`）等价于 `make bootstrap` + `make validate`（Python 3.13.7，openspec CLI 1.8.0 固定版本），报告作为 artifact 上传，`if-no-files-found: error`。

## 架构大图

这是**治理密集型仓库**：产品正文是三个 skill 的 Markdown 指令，其余一切（schema、validator、eval、gate）都是为了约束这些指令的行为可验证。三条流水线围绕同一份 `design-system/v1` 契约：

```
Author（skills/ui-template-author）   从授权来源抽取 → published Template Package（templates/<name>/）
        ↓ catalog pin / 显式 seed 领养
Design（skills/ui-template-design）   领养 → Active Instance + Project Binding（消费项目 .ui-template-design/）
        ↓
Apply（skills/ui-template-apply）     source-blind 实现（bootstrap | increment，Phase 0–9）
```

读多个文件才能拼出来的关键机制：

- **契约三层落地，改一必须同步其余**：`schemas/design-system/v1/*.schema.json`（机器结构）→ `scripts/template_validation/` 与 `scripts/validate_design_system.py`（可执行校验）→ `skills/*/references/*.md`（给模型读的语义）。任何一层变更必须同步 fixtures、eval 与 active OpenSpec delta。
- **source-blind**：Apply 实现期只消费 Active Instance；原版 checkout、`meta.sources[]` 实现路径、历史生成物进入 checkpoint 即 `SOURCE_BLIND_VIOLATION` fail closed。
- **Template Certification Gate**：官方 package publish/upgrade 前跑 `scripts/run_template_certification.py`（固定 Visual Oracle revision + 干净 source-blind Apply + Pattern 级 Visual Equivalence）；candidate 停在 `governance/candidates/`，进生产 catalog 需用户单独确认。
- **模板生命周期**：`templates/INDEX.md` 是唯一可写目录，状态闭集 `published | retired`；draft 是未进 INDEX 的候选目录，不是第三状态。规则 ID 删除后永不复用。
- **事实源分层**：schema → `skills/ui-template-author/references/package-format.md` → active OpenSpec → validator → `governance/release/`；`FUNCTIONAL-LOOP.md` 与它们冲突时必须先修复漂移。

## 容易踩的线

- `skills/` 是唯一生产正文；`.agents/skills/` 只是 repository-only 路由封装，不得把改动写进去，也不是安装目标。
- `example/**`、`docs/**` 是治理排除项：root governance 不读取不运行，生成 web 不是修复面，样例质量不决定发布通过。
- `governance-reports/` 已 gitignore；验证产物写 `/tmp/` 或 `REPORT_DIR`，本地报告不当发布证据。
- 不自动 publish、tag、archive OpenSpec change、promote candidate——这些动作需用户单独点名授权。
- `openspec/changes/archive/**`、`skills/**/patches/**`、`skills/**/experience/**` 是 immutable history，只按档案策略检查，不做术语重写。
- `core/tokens.yaml` 是 token 精确值唯一权威；原生 theming 是 binding 声明的 Token Projection，不得双向同步。
- 对外安装入口是显式 `-s` 的 `npx skills`（Author/Apply 成对，Design 可单独）；根 Makefile 不提供 install 目标。
