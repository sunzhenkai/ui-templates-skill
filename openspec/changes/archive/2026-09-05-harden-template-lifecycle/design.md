## Context

见 `proposal.md` 的动机。当前仓库同时存在三类事实：生产 skill/模板已经采用 `apply/` 与四值 origin；active OpenSpec/README 仍保留 `implementation/` 与单-skill 安装；validator 只验证部分结构并静默跳过当前 OKLCH 对比度。仓库还跟踪或生成多份 skill 镜像，eval 是自然语言 checklist，Apply 的阶段产物、checkpoint 和反馈没有统一机器契约。

本 change 是跨 `openspec/`、`skills/`、`templates/`、`scripts/`、文档、安装和 CI 的破坏性治理升级。设计必须满足：模板与消费项目工程决策继续解耦；Authoring 和 Apply 使用同一 schema；无外部网络也能运行确定性门禁；历史 patch 保持不可变；`example/workbench-shell/web-v2/**` 完全不在编辑和验收范围内。

## Goals / Non-Goals

**Goals:**

- 建立一套机器 schema、权威 prose、active OpenSpec 和 validator 一致的事实模型。
- 将模板 v1 确定性迁移到 v2，并让未知版本、未知 origin 和不可检查对比度 fail closed。
- 让 Authoring、Apply、feedback、eval、bundle 和 release 的每个完成状态都有机器可读证据。
- 以 `skills/` 为生产正文唯一源码，生成可复现、可原子安装的双-skill bundle。
- 迁移 `workbench-shell` 本身及其 active spec，使其成为第一份 v2 正向实例。
- 用不依赖 web-v2 的 governance CI 验证本 change。

**Non-Goals:**

- 不编辑、格式化、迁移或修复 `example/workbench-shell/web-v2/**`，也不运行其测试作为验收 gate。
- 不实现或 promote `web-v3`；本 change 只定义通用 promotion 规则。
- 不把 `ui-ux-pro-max` 数据、MASTER 设计系统或 stack catalog 复制进仓库。
- 不为模板加入框架默认值、项目目录、API/mock、状态管理或 runnable starter。
- 不重写 archive changes、历史 patch/result 或 experience 事件以匹配新术语。

## Decisions

### 1. 事实源按职责分层，而不是让 validator 反向定义规范

采用以下分工：

1. `schemas/` 定义字段、类型、闭集枚举和引用形状。
2. `skills/ui-template/references/spec-format.md` 定义字段语义、归属与 Authoring 行为。
3. active OpenSpec 定义对外可观察要求，并必须与前两者同步。
4. validator 是上述契约的可执行实现，由正反 fixtures 证明一致。
5. README/AGENTS/发布说明是派生入口；archives/patches 是不可变历史。

schema 与 prose 冲突时，repository validation 失败，不使用“实现优先”或“文档优先”掩盖冲突。

**替代方案：**继续以 `spec-format.md` 纯 prose 为唯一权威。拒绝，因为无法确定性约束 token leaf、feedback/checkpoint 和 manifest，也无法生成兼容性诊断。

### 2. schema v2 使用独立 schema 文件和统一 envelope

新增 `schemas/template/v2/`，至少包含：

- `meta.schema.json`
- `tokens.schema.json`
- `evidence.schema.json`
- `feedback.schema.json`
- `checkpoint.schema.json`
- `verification.schema.json`
- `skills-manifest.schema.json`

YAML/JSON 记录都声明 `schema_version: 2`；`meta.yaml` 另有 `template_version`。`tokens.yaml` 的每个可消费 leaf 统一为：

```yaml
value: <scalar | list | mapping>
unit: <unit>        # 仅有量纲数值必需
origin: source | computed | estimated | default
```

复合值放入 `value`，不允许裸 list/map 绕过 origin。`meta.yaml` 使用 `sources[]`、分维度 confidence，以及 platforms/viewports/themes/page_modes/components/states 的 observed/defaulted/unsupported 集合；集合必须互斥且覆盖声明范围。

`evidence.yaml` 以 token path 为主键语义，记录 method、source ref/revision、locator/artifact、captured_at、confidence、status、supersedes；default 记录 basis/decision ID。资产 evidence 额外记录 license、redistribution 和 redaction。

**替代方案：**把 evidence 嵌入每个 token。拒绝，因为会使 tokens 难以消费、重复来源字段，并让审计历史污染精确值载体。

### 3. 使用 JSON Schema 做结构校验，Python 语义层做跨文件与颜色检查

YAML 先安全解析为普通数据，再用 JSON Schema Draft 2020-12 校验结构。实现时新增的 schema validator 依赖必须写入精确版本的根治理依赖清单；PyYAML 也一并固定。业务语义继续由 Python 执行：

- token path 与 evidence path 解析；
- coverage 互斥/完整性；
- 主题角色一致性；
- rule ID 唯一与跨 Markdown 引用；
- INDEX/meta 一致性；
- active 文档本地链接；
- `apply/` 只含阶段/取证且不复制精确值；
- 递归禁入 `implementation/`、stack/目录/API/data/业务内容；
- bundle/manifest/mirror 一致性。

validator 收集全部 findings 后统一输出，不在首错停止。finding 使用稳定 code、severity、path、message、details；`--json` 输出稳定排序，human mode 保留简洁摘要。

**替代方案：**完全手写结构验证。拒绝，因为 v2 数据模型扩大后容易再次出现“文档要求但代码漏检”的情况。

### 4. 颜色解析只支持契约明确子集，任何无法检查的 required pair 都失败

不引入完整 CSS 引擎；自包含解析器支持：

- `#RRGGBB`、`#RRGGBBAA`；
- `oklch(L C H)`；
- `oklch(L C H / A)`。

解析器将颜色转成线性 sRGB；alpha 必须沿显式背景 token path 合成。schema/语义层定义 canonical foreground/background pairs，并允许模板声明 contextual pairs：如没有 `destructive-foreground`，`destructive` 作为文本/状态色与其真实 background/card/popover 配对；focus ring 与实际相邻背景做非文本 3:1。

每主题输出 checked/failed/skipped/waived。required pair 缺值、超出支持色法或背景不明确即失败。waiver 必须引用稳定 rule ID、理由和到期 template version，不能作为静默跳过。

**替代方案：**引入第三方 CSS color 包。暂不采用，以保持 portable checker 小型、可分发；fixtures 将覆盖标准公式和边界。若后续扩展更多 CSS Color 4 语法，再单独提案。

### 5. v1→v2 迁移采用“候选目录 + 报告 + 显式替换”

新增 migrator，默认从 v1 读取并写到独立 staging/candidate，不原地覆盖。迁移步骤：

1. 将裸 token leaf 包装为 v2 record，并尽可能保留已有 origin。
2. 将旧单一 source 转为 `sources[]`。
3. 生成 evidence skeleton；可由现有 meta/spec 确定的内容自动填充，不能确定的内容进入 `needs_confirmation`。
4. 生成 page mode/platform coverage skeleton。
5. 为 Non-negotiables 与被引用规则分配稳定 ID。
6. 生成 migration report：converted、inferred、unresolved、breaking。
7. 只有 report 无 unresolved 或用户明确确认后，才原子替换模板文件。

migrator 对相同输入和决定幂等。正常 validator 只接受 v2；v1 仅能通过显式 `--migrate`/迁移命令处理，避免永久双语义。

`workbench-shell` 作为首个真实迁移对象，但不从 web-v2 反推或消费任何实现决定。

### 6. 规则 ID 是 Markdown 与机器证据之间的稳定连接

Non-negotiables 使用 `NN-###`；其他命名空间至少包括 `TOKEN-###`、`LAYOUT-###`、`ROUTE-###`、`AX-###`、`RESP-###`、`QUALITY-###`。格式文档定义 ID 语法、唯一范围和 supersedes 规则。

`apply/`、quality matrix、verification 和 feedback 引用 ID，不复制数值。迁移时已存在的规则按文档顺序获得初始 ID；后续删除不复用旧 ID。validator 检查重复、悬空和关键规则无证据。

**替代方案：**继续用“spec §2/Non-negotiables #6”。拒绝，因为章节和列表重排会破坏 checkpoint、feedback 和历史证据。

### 7. Apply 产物固定到 `.ui-template-apply/`，checkpoint 用规范化 digest 判定失效

标准目录：

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
├── 09-review.md
└── feedback/
```

`tokens_digest` 不是原始 YAML bytes hash，而是安全解析后按 sorted-key canonical JSON 生成 SHA-256，算法标识为 `sha256-canonical-json-v1`；格式化变化不使证据过期，语义变化会。checkpoint 同时记录 template identity/version、范围、phase status、artifact digest、source revision 和 build identity。

有 Git 时 source revision 使用 commit + dirty diff digest；无 Git 时使用目标源码快照 digest。build identity 由目标项目命令或构建产物提供。恢复器从 Phase 0 开始检查依赖：范围变化回到最早受影响阶段，token digest 变化至少回到 Phase 1，缺 Phase 8 evidence 不允许完成。

### 8. feedback 使用 UUID + 内容 fingerprint 双重幂等

feedback 文件位于消费项目 `.ui-template-apply/feedback/*.yaml`，也允许用户提供显式路径。记录包含 UUID、基于 template identity + normalized scenario + rule domain 的 fingerprint、template/source revision、scenario/evidence/suggestion/scope、status、reason、targets 和 timestamps。

Apply 创建 `proposed`；Authoring 负责 `accepted | known-gap | rejected`，接受后推进 `applied → verified`。按 UUID 或 active fingerprint 命中时合并证据，不新建重复规则。状态迁移和必填字段由 schema 验证。

**替代方案：**只靠文件名或自然语言标题去重。拒绝，因为跨项目同名和标题改写无法保证幂等。

### 9. `ui-ux-pro-max` 只通过 Query Contract 提供候选

不增加源码依赖。Apply 文档规定：design-system/domain/stack 三种显式 mode；一次一个意图、2–5 个关键词、验证 top identity、最多收窄一次、失败后 abstain。调用记录写入 Design Direction 或 component/review artifact。

默认禁止 `--persist`；即使用户授权持久化，外部文件也不能覆盖模板 spec/tokens。bundle validation 拒绝复制该 skill 的数据目录、catalog 或 MASTER 文件。

### 10. 双-skill bundle 采用 allowlist、可复现 tar 和逐目录原子替换

bundle allowlist 仅包含两个 skill 的生产 `SKILL.md`、references、运行 contract eval 必需的 fixtures/runner 资源、manifest 和 LICENSE。默认排除 manager、OpenSpec 项目 skills、patches、experience 和仓库配置。

生成 `dist/ui-templates-skill-<version>.tar.gz`：文件按路径排序，mtime 归一为 source revision time，uid/gid 归零，manifest 记录每个文件 SHA-256、bundle/skill/schema 版本、工具版本和许可。两次同 revision 构建比较 manifest 与 artifact digest。

安装器先在目标父目录创建 staging，验证所有文件后分别替换 `ui-template` 与 `ui-template-apply` 两个受管目录；替换前保留临时 backup，任一替换失败则回滚。不会替换整个 `.agents/skills/`，因此不影响其他 skill。

### 11. `skills/` 是生产正文唯一源码，镜像比较使用生产 allowlist

新增 sync/check 工具：

- `sync --check`：对 allowlist 生产文件做内容 diff；
- `sync --write`：在 staging 重建受管生产文件后替换；
- patches/experience 交给独立 archive policy，不纳入正文等价；
- `.kiro` 若继续被忽略，只作为本地安装目标，不作为发布源码。

该设计避免用历史 patch 差异证明生产漂移，也避免叠加 `cp -r` 保留已删除生产文件。

### 12. eval 分 script/LLM，两者都机器化但只有可重复 gate 阻断普通 CI

扩展 case schema，要求 id、skill、category、fixture、judge、expect。现有 Authoring 9 条与 Apply 8 条逐条迁移：路径、schema、路由、反馈、checkpoint 等确定项使用 script judge；确需自然语言判断的 case 使用固定 rubric 和结果 schema。

runner 输出 JSON/JUnit、declared/parsed/executed、revision、fixture hash、runner version；任一数量不一致即失败。普通 CI 阻断 script judges，并验证 LLM fixtures/rubric/schema；release candidate 可在配置了模型的受控环境运行 LLM judge，记录 model/runtime fingerprint。CI 不向第三方发送项目代码或用户数据。

**替代方案：**把所有 case 交给 LLM。拒绝，因为确定性契约不应受模型波动影响，也不适合作为离线 CI 门禁。

### 13. governance CI 不读取 web-v2，样例 promotion 单独执行

新增单一 root validation entry（例如 `make validate`），依次运行 schema/semantic validator、fixtures、OpenSpec strict、active/release link check、eval、bundle smoke/reproducibility、mirror check。CI path/config 显式排除 `example/workbench-shell/web-v2/**`，tasks 也不包含该目录。

样例 promotion 是独立命令：只有 maintainer 主动选择样例时才运行其声明命令并生成 report。`web-v3` 是否 promote 不在本 change 内。根 README 只陈述已经有 promotion report 的样例。

### 14. active 文档和不可变历史使用不同检查域

active/release domain 包含根 README、AGENTS、active OpenSpec、`skills/` 生产文档、`templates/` 和 release metadata；必须通过链接与术语一致性。Archive changes、patches/results 和历史 experience 不做术语改写，仅检查文件可读性与自身档案结构。

`example/workbench-shell/web-v2/**` 作为本 change 显式 exclusion：既不修断链，也不把断链计入本 change gate。该 exclusion 在 validator 配置、CI 和任务清单中使用同一个稳定路径，防止“文档说排除、脚本仍读取”。

## Risks / Trade-offs

- **[Risk] schema v2 一次引入字段较多，迁移负担集中。** → 以 workbench-shell + good/bad fixtures 先锁定 schema；migrator 生成候选和 unresolved 报告，未确认不替换。
- **[Risk] fail-closed 会使当前假绿模板立即失败。** → 先完成 parser/fixtures，再迁移 workbench-shell；只有 v2 正向实例通过后才切换默认 validator。
- **[Risk] 自实现 OKLCH 公式可能产生边界误差。** → 使用标准测试向量、固定误差容限和与独立计算结果的 fixture 对照；暂不扩展未声明 CSS 语法。
- **[Risk] rule ID 增加 Markdown 维护成本。** → 只要求可跨文档引用的规则有 ID，提供 linter 和迁移分配器，不给所有 prose 编号。
- **[Risk] evidence 文件体积增长。** → 使用 sidecar、superseded 引用和相对 artifact path；不在 token 内复制完整 provenance。
- **[Risk] LLM eval 仍不可完全重复。** → 普通 CI 仅阻断 deterministic judge；LLM 结果绑定 fingerprint，并与确定性 gate 分开报告。
- **[Risk] 原子安装在不同文件系统上无法单次 rename。** → staging 必须位于目标父目录；若环境不支持原子替换，则安装器 fail closed 并保留原版本。
- **[Risk] 排除 web-v2 会留下已知断链和实现问题。** → 在 change、CI 报告和最终汇报中列为 accepted non-goal；不得通过修改该目录偷渡修复。
- **[Trade-off] 不 vendoring 外部 UI 数据降低离线建议丰富度。** → 保持模板权威与维护边界；工具不可用时按模板和人工 fallback 完成同等 gate。
- **[Trade-off] release/CI 机制增加仓库文件数量。** → 只引入一个 root validation entry 和少量分层脚本，避免多套重复命令。

## Migration Plan

1. **冻结边界与基线**：为本 change 添加路径保护，记录 `example/workbench-shell/web-v2/**` 不得修改；保存当前 validator/OpenSpec 输出作为非验收基线。
2. **建立 schema 与 fixtures**：先提交 v2 schemas、finding codes、good/bad/mutation fixtures和 schema tests，不切换生产模板。
3. **实现 validator 核心**：完成 JSON Schema、OKLCH/alpha、contrast pairs、rule/evidence/link/INDEX 检查和 JSON 输出；对 fixtures 运行。
4. **实现 migrator 并迁移 workbench-shell**：生成 candidate/report，补 evidence、coverage、rule IDs 和 meta version；人工解决 unresolved 后替换模板。
5. **切换 Authoring/Apply 契约**：更新两份生产 skill、manager 和 references，统一 origin、完成 gate、Query Contract、标准产物、checkpoint 和 feedback。
6. **对齐 workbench-shell 文档**：移除 active `implementation/` 语义，更新 A–E、断点、组件/quality 引用；不读取 web-v2 决策。
7. **落地 eval 与治理工具**：迁移 17 个当前 case，增加 runner、bundle、manifest、atomic installer、mirror sync/check 和 root validation entry。
8. **更新 active 文档与 CI**：同步 active OpenSpec、README、AGENTS、Makefile/命令和 CI；路径检查显式排除 web-v2 与 immutable history。
9. **发布前验证**：运行 v2 validator 正反 fixtures、真实 workbench-shell、OpenSpec strict、contract eval、active links、bundle smoke/rebuild、mirror drift，并确认 web-v2 git diff 为空。
10. **发布与回滚**：以破坏性版本发布双-skill bundle、checksum、CHANGELOG 和 v1→v2 指南。回滚时恢复上一 bundle/manifest 和 validator 默认版本；迁移候选与报告保留，原 v1 可从 Git 恢复。已发布 v2 模板不得被旧消费者静默读取。
