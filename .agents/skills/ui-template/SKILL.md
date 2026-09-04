---
name: ui-template
description: 从运行中的 Web 站点(URL)、代码仓库(本地路径或 Git 地址)、图片(截图/设计稿)或设计文档(Markdown/PDF)中提取 UI 设计风格，创建/导入/更新 schema v2 可复用设计规范并维护 templates/ 模板库。用于“做成模板/导入 UI 模板/提取设计规范/更新模板”；按模板实现页面应移交 ui-template-apply。
---

# ui-template — Template Authoring

本 skill 只创建、迁移、更新和索引 UI 模板，不实现消费项目页面。公开格式由 [references/spec-format.md](references/spec-format.md) 唯一定义；Apply 通过该契约解耦消费。

## 路由

- URL → [source-web.md](references/source-web.md)
- 代码仓库 → [source-repo.md](references/source-repo.md)
- 图片/截图 → [source-image.md](references/source-image.md)
- Markdown/PDF 设计文档 → [source-doc.md](references/source-doc.md)
- “用模板实现页面/搭后台” → 停止 Authoring，移交 `ui-template-apply`。

## 不变量

- 只产出设计规范；模板不得包含 `implementation/`、stack adapter、工程目录、依赖、API/mock/data、状态库或具体项目业务结构。
- schema v2 必备 `spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml`；`tokens.yaml` 是精确值唯一载体。
- token leaf 统一含 `value`、适用 `unit`、`origin: source | computed | estimated | default`。缺口用有 basis 的 default，不留给 Apply 猜测。
- Non-negotiables 与跨文档规则使用稳定 rule ID；coverage 对声明项作 observed/defaulted/unsupported 完整互斥分类。
- 来源、locator、revision、confidence、asset license/redistribution/privacy 与 default basis 都进入 evidence。

## 强制工作流：Generate → Validate → Eval → Index → Report

顺序不可交换，任何 gate 失败即停止；失败后不得修改生产 `templates/INDEX.md`、不得把任务/模板标为完成、不得报告成功。

### 0. Intake 与 feedback discovery

确认来源、模板名、更新或新建、授权和范围。更新前按 [feedback-lifecycle.md](references/feedback-lifecycle.md) 扫描显式路径及已授权消费项目 `.ui-template-apply/feedback/`，按 UUID/fingerprint 幂等处置。未知 schema 或非法状态记录先修复，不跳过。

### 1. Generate

按来源指南生成/更新候选模板四个必备文件及可选设计文档、assets、`apply/`。为规则分配稳定 ID，补齐 coverage、证据、默认依据和资产决定。新模板同时生成**候选 INDEX**（临时文件或 staging），但此时不得改生产 INDEX。

### 2. Validate

运行下述发现协议找到 checker，对候选模板和候选 INDEX 执行 schema/语义/对比度/evidence/rule/link/禁入内容验证；必须获得可解析 JSON、零 error、每个声明主题非零 checked contrast。只运行 prose checklist 不算通过。

仓库内已知调用形态：

```bash
python3 scripts/validate_templates.py <candidate-template-or-templates-root> --index <candidate-index> --json
```

安装环境不得假设本仓 `AGENTS.md` 或固定当前目录。

### 3. Eval

运行与 Authoring/schema/反馈相关的 portable contract eval；要求 runner 报告 `declared = parsed = executed` 且所有阻断 script judge 通过。LLM judge 仅在发布策略要求且已授权时运行。Eval 不存在、不可执行、输出不可解析或 case 数不一致都视为失败。

bundle 与生产镜像在本 skill 根分发 `runtime/run_contract_evals.py`；普通离线执行 script judges 并校验固定 LLM assets，不调用模型或网络。runner 缺失、不可执行或输出不满足计数/身份契约时必须停在 Eval，保持生产 INDEX 不变并报告 blocker。

### 4. Index

只有 Validate 与 Eval 都成功后，才把候选 INDEX 变更原子应用到生产 `templates/INDEX.md`。应用后核对 INDEX 的 name/description/source.type/captured_at 与 meta 一致。若索引写入失败，回滚索引并不进入 Report 成功路径。

### 5. Report

报告模板路径、`schema_version`/`template_version`、来源与 coverage、default/estimated 摘要、资产许可/隐私决定、规则/feedback receipts、实际命令、checker/runner identity 和结果。仅在所有 gate 与 INDEX 更新成功后使用“完成”。失败报告必须说明停在哪个 gate，并确认 INDEX 未改。

## Portable checker/eval 发现协议

对 validator 和 eval runner 分别执行以下**有序且不模糊**的发现；第一个存在的候选必须通过调用/输出契约，否则失败，不继续尝试同名未知程序：

1. 用户或受控环境显式设置的绝对路径：`UI_TEMPLATE_VALIDATOR` / `UI_TEMPLATE_EVAL_RUNNER`；
2. 本 skill 根目录 `runtime/validate_templates.py` / `runtime/run_contract_evals.py`；
3. 仅当检测到仓库根同时含 `schemas/template/v2/` 时，使用该根的 `scripts/validate_templates.py` / `scripts/run_contract_evals.py`。

禁止从任意 `PATH`、网络下载或另一 checkout 猜测 runner。validator 必须接受候选路径、`--index`、`--json`，输出 schema version、findings、contrast counters 与失败退出码；eval runner 必须接受 skill/case scope 和 JSON 输出，提供 runner version、revision、fixture hash、declared/parsed/executed。候选缺失或能力不满足即 fail closed。bundle 与生产镜像必须把 runtime、schema 和固定 eval resources 一起分发。

## Feedback 状态

Apply 创建 proposed；Authoring 负责 accepted/known-gap/rejected，落盘后 applied，Validate+Eval 后 verified。重复 UUID 或 active fingerprint 合并证据，不重复生成规则；rejected/verified 返回终态 receipt。完整状态机见 [feedback-lifecycle.md](references/feedback-lifecycle.md)。
