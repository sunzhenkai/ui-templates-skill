# 功能与目标：模板闭环

本文是本仓库**现行**功能闭环与目标的人类可读权威。机器契约仍按 `AGENTS.md` 的事实源分层：schema → `spec-format.md` → active OpenSpec → validator。本文与它们冲突时必须先修复漂移，不得任选其一继续。

`docs/functional-loop-review.md`（2026-09-03）已 superseded，不得再指导实现。

## 1. 原始目标

1. **Skill 功能闭环**：创建、分层抽取、应用模板可独立完成，且互相移交。
2. **模板管理闭环**：创建、更新、浏览、退役、删除有门禁，INDEX 是唯一目录。
3. **项目规约**：迭代不得靠改生成物、读原版源码或绕过 gate 来“过关”。
4. **更新协议**：从 workbench-shell / multica 特例归纳出可复用的分层更新与重生对照，而不是一次性修页面。

## 2. 产品边界

公开产品只有两个必须配套安装的 skill：

| Skill | 职责 | 不职责 |
| --- | --- | --- |
| `ui-template-author` | 创建 / 抽取 / 更新 / 浏览 / 退役 / 删除模板；拥有格式契约 | 不实现消费项目页面 |
| `ui-template-apply` | 只消费已发布且 `published` 的模板，按 Phase 0–9 实现页面 | 不创建、迁移、索引模板；不读原版源码 |

`ui-template-manager` 只是本仓库路由薄封装，不进入公开 bundle。

模板是自包含设计规范：`spec.md`、`tokens.yaml`、`meta.yaml`、`evidence.yaml`，可含拆分文档、可选 `fidelity.yaml` 与技术栈无关的 `apply/`。禁止 `implementation/`、stack adapter、工程目录、依赖、API/mock/data、状态库、runnable starter。

## 3. 稳态总环

```text
原版 @ 固定 revision（仅 session source 或视觉 oracle）
        │ Author：按层/组件抽取
        ▼
自包含 published 模板
        │ Apply：只读模板 + 用户需求（prompts）
        │ MUST NOT 读原版源码 / 历史生成物
        ▼
干净生成物（一次性消费项目）
        │ 可选：对照可部署原版，分类 Δ
        ▼
只改 skill 或模板或 prompts
        │ 丢弃旧生成物，重生
        ▼
两次干净重生稳定，才算闭环完成
```

七条不变量：

1. **生成物不是修复面。** 视觉差回写 Authoring、Apply 或模板。
2. **Apply 零原版依赖。** 实现时禁止打开原版 checkout、历史 `web/`、`web-v*`。
3. **原版只出现在两个窗口：** Author 的 session source；保真对照的临时部署。
4. **重生才是完成证明。** 改完模板/skill 之后必须用新产物再验收。
5. **分层抽取。** chrome → tokens → scene → 原子组件 → 复合组件，禁止抽样冒充完整。
6. **模板自包含。** Apply 不看原版也能消费常用组件规格。
7. **历史生成物不是参考。** 对照物只有当前模板、当前 skill、本会话原版部署。

## 4. Skill 功能闭环

### 4.1 创建 / 抽取（Authoring）

强制顺序不变：Intake → Generate → Validate → Eval → Index → Report。任一 gate 失败不得改生产 `templates/INDEX.md`，不得宣称完成。

L0–L6 只是变更集合标签。Intake 必须冻结**本次改哪些路径/组件**；未声明文件保持原字节，不得标 observed。

`update-from-source` 必须声明变更集合。无 session source 只做 portable / feedback 更新，不得伪造 source-direct sidecar。

### 4.2 应用（Apply）

**模式 A — 干净实现（默认）**

- 输入：`published` 模板 + 用户需求。
- 禁止：原版 checkout、历史生成物。
- 完成：Phase 8/9 对**模板 expected** 通过。

**模式 B — 保真对照（仅“对齐原版”任务）**

- 额外输入：本会话可部署原版，只作视觉 oracle。
- 产物：`.ui-template-apply/source-compare.yaml`（不是第 10 个 phase）。
- Δ 分类只有三档：`spec` / `apply` / `prompt-or-accept`。
- 禁止把对照失败修进生成物。
- 回写后至少干净重生一次。

### 4.3 移交

- “做成模板 / 更新模板 / 退役模板” → Authoring。
- “用模板做页面” → Apply。
- 尚无模板 → 先 Author 声明变更集合过 gate，再 Apply。
- 没有模板、schema 不支持、origin 未知、`retired`、validation 失败 → Apply 停止。

## 5. 模板管理闭环

生命周期：

```text
draft（候选目录，不是 INDEX 状态，未进 INDEX）
  → published（INDEX 状态 published，Apply 可消费）
      → published'（同名更新，template_version 递增）
      → retired（INDEX 状态 retired，Apply 新 Intake 失败）
          → deleted（移除 INDEX 行与 templates/<name>/）
```

| 动词 | 门禁 |
| --- | --- |
| `create` | 冻结变更集合；Generate→Validate→Eval 后才能 Index 为 published |
| `update-from-source` | 需要 session source；声明路径/组件集合；未声明文件不重写 |
| `update-from-feedback` | 幂等处置；项目专属 rejected |
| `update-portable` | 无 session source；不得伪造 observed sidecar |
| `list` / `show` | 读 INDEX：name / description / source.type / captured_at / status |
| `validate` | portable 与 replay 分离 |
| `retire` | INDEX 标 retired；目录保留；Apply 拒绝新消费 |
| `delete` | 仅 draft 或已 retired；同时移除 INDEX 行与目录 |

规则 ID 删除后永不复用。重名必须询问更新还是另建。`split` 不是本版本交付。

INDEX 表头固定为：名称、风格描述、来源类型、采集日期、状态。状态闭集：`published` | `retired`。前四列必须与 `meta.yaml` 一致。

## 6. 从 workbench-shell 特例归纳的更新协议

特例要求（对任意“对齐原版”任务都成立）：

- 必须通过更新 Authoring / Apply / 模板来修差异，**MUST NOT** 特例化修复生成 web。
- 必须从 skill 与模板的生成稳定性出发。
- 最终确认必须基于**修改后的 skill + 模板重新生成**的页面。
- **MUST NOT** 参考历史 web 版本。
- Apply **MUST NOT** 依赖原版源文件。
- 可部署临时原版只作视觉对照。

执行顺序：

1. 冻结对照物：原版 revision、prompts、当前 published 模板。
2. 按 `spec` / `apply` / `prompt-or-accept` 分类差异，禁止先改生成物。
3. 只改归属面：壳/token/组件 → 模板或 Author skill；阶段/取证不稳定 → Apply skill；业务缺页或书面接受 → prompts。
4. 有 session source 才允许抬升 observed / 写 fidelity。
5. 空目录干净 Apply，对照原版，Δ 回写，再重生一次。

`openspec/specs/workbench-shell-implementation/` 是**该模板实例附录**，不是产品级契约。第二个模板不得继承其 A–E / Shell 假设。

## 7. 项目规约（四条不变量）

**I1 生成物不是修复面。** 保真修复只回写 skill / 模板 / prompts。`example/**/web*` 与历史 `web-v*` 是治理排除项，不得当发布证据。

**I2 Apply 零原版、零历史 web。** 实现不得打开原版 checkout、`meta.sources[]` 路径或已有生成物。对照物只有当前模板、当前 skill、本会话可部署原版。

**I3 INDEX 是唯一目录。** 状态只有 `published | retired`。Apply 新消费必须 `require-published`。draft 是未进 INDEX 的候选目录，不是第三状态。

**I4 未声明的变更保持原字节。** 从源更新必须给出路径/组件集合；未纳入文件不得重写。部分失败则整次不 Index。`confidence.components: high` 不得与大批 defaulted 并存。

## 8. 目录约定

```text
skills/                    生产 skill 正文
schemas/                   机器契约
templates/INDEX.md         唯一目录（含 status）
templates/<name>/          published 或 retired 模板
scripts/ tests/ governance 门禁
openspec/specs/            通用产品契约
example/<name>/prompts/    可入库的消费需求
example/<name>/web*/       生成物，治理排除
```

根目录杂项（`node_modules/`、截图、`.kiro/`）不是产品权威。

## 9. 验收

闭环成立当且仅当：

1. Authoring 能按变更集合创建/更新，失败不改生产 INDEX。
2. Apply 能只靠 published 模板完成 Phase 0–9；`require-published` 拒绝 retired。
3. retire / delete 有机器校验与 skill 手续。
4. 保真差异只能回写 skill/模板/prompts，且至少重生一次。
5. `example/workbench-shell/web/**` 不决定治理通过。
6. 相关 contract eval 与模板 validator 通过。

workbench-shell 相对 multica 的视觉对齐是**使用本闭环的一次任务**，不是本文的发布门禁。无 session source 时它保持 `legacy-baseline`。
