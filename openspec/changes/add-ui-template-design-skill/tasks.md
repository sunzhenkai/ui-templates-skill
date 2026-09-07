## 1. skill-creator：skill 正文骨架

- [x] 1.1 按 skill-creator 写 `skills/ui-template-design/SKILL.md`：frontmatter `name: ui-template-design`，description 采用 design.md D6 草案（独立可用、负向移交 Author/Apply），body <500 行，祈使句，只含路由、不变量、阶段 0–9 表、完成定义与 reference 指针
- [x] 1.2 建空 `references/` 文件并在 SKILL.md 写清何时读取：`layers`、`constitution-template`、`executable-rules`、`data-state`、`inventory`、`legacy-mapping`、`gallery`、`visual-loop`、`greenfield`、`existing-refactor`、`adapters`
- [x] 1.3 记录 3 条定性 prompt（空仓建系统 / existing 收拢 / 负例移交 Apply）到 Design eval 说明，不把 skill-creator `evals/evals.json` 或 eval-viewer 接入 CI

## 2. Freeze 契约与状态目录

- [x] 2.1 新增 `design-freeze/v1` schema（freeze.yaml / checkpoint 最小字段：schema、status、digest、mode、可选 template 身份、gallery 身份）
- [x] 2.2 约定 `.ui-template-design/` 产物文件名与 digest 算法，与 Apply 的 canonical JSON SHA-256 对齐或明确差异
- [x] 2.3 runtime：校验 freeze schema、拒绝越界路径、无模板时禁止写 `templates/INDEX.md`

## 3. 分层与可执行约束 references

- [x] 3.1 写 `layers.md`：Token → Primitive → Pattern → Page Type 闭集、禁止逆向发明
- [x] 3.2 写 `constitution-template.md` 与 `executable-rules.md`：独立规则文件路径（`AGENTS.design.md` / `.cursor/rules`），禁止默默覆盖根 `AGENTS.md`
- [x] 3.3 写 `data-state.md`、`gallery.md`、`visual-loop.md`：Pattern 五态、应用内 Gallery 路由、截图身份、自愈最多 3 轮
- [x] 3.4 写 `greenfield.md` 与 `existing-refactor.md`：闭集层确认、冻结业务、inventory → mapping → token
- [x] 3.5 写 `inventory.md`、`legacy-mapping.md`、`adapters.md`：fail-open 模板映射与 Apply/Author 移交

## 4. 确定性扫描

- [x] 4.1 token/import 扫描：raw palette、未映射 hex、跨层 Button import、裸页面容器（脚本或等效 checker）
- [x] 4.2 将扫描接到 Design Validate/Freeze gate：仅有 Constitution、规则未落地或扫描失败不得 freeze

## 5. Contract eval

- [x] 5.1 `skills/ui-template-design/evals/cases.yaml`：独立完成（无 Author/Apply/模板）、停在 Primitive 不算完成、raw token 失败、无 freeze 不要求 Apply
- [x] 5.2 负例：做成模板 → Author；按模板写页 → Apply
- [x] 5.3 把 Design cases 接入统一 eval runner；无依赖夹具目录不含另外两个 skill
- [x] 5.4 Author/Apply 现有 eval 在无 freeze 时保持绿

## 6. Apply / Author 适配

- [x] 6.1 Apply：读取可选 freeze；匹配则投影结构层；缺失则现行 Phase 0–9；digest 不匹配则停止或经确认忽略
- [x] 6.2 Author SKILL/路由：设计系统请求移交 Design；仅用户要求发布时才消费 freeze
- [x] 6.3 `ui-template-manager`：建立/重构设计系统 → Design

## 7. 分发与派生文档

- [x] 7.1 `governance/scope.yaml`、`distribution-v1.yaml`、compatibility：加入 `ui-template-design`，模板对约束不变
- [x] 7.2 安装器/文档：成对安装不删 Design；单独安装 Design 不要求 catalog
- [x] 7.3 README、AGENTS.md、FUNCTIONAL-LOOP、Author/Apply 安装段：两个 `npx` 入口；`docs/ui-template-design.md` 标明草案非发布证据
- [x] 7.4 `make mirror-write` 后 `make mirror-check` 零漂移

## 8. 治理门禁

- [x] 8.1 更新 OpenSpec base（archive 前不手改 `openspec/specs/` 除非 apply 流程要求）；本 change specs 保持与实现一致
- [x] 8.2 `make test` / `make eval` / `make validate` / `make bundle` 通过；缺 Design 的 bundle 失败；只装 Design 的夹具通过
- [x] 8.3 不改官方 catalog 内容、不 promote `example/**`、不 publish/tag/archive（除非用户另请）

## 9. 任务类分流

- [x] 9.1 SKILL + `task-classes.md` + `iterate.md`：用可观察信号判定 `bootstrap | refactor | iterate`，禁止凭口吻猜测；三类必读 layers/rules/adapters，iterate 禁止完整 inventory
- [x] 9.2 runtime `classify_task_class` 与 checkpoint 可选 `task_class`；digest 不匹配或范围未声明 fail closed
- [x] 9.3 eval `design-task-classes`、定性 prompt、OpenSpec delta、baseline 同步
- [x] 9.4 `make mirror-write` 后 `make mirror-check`；`make test` / `eval` / `validate` / `bundle` 通过
