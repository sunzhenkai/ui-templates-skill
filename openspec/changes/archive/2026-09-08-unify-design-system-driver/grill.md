# Grill：unify-design-system

## 决策记录

| # | 决策 | 结论 | 理由 | 状态 |
|---|------|------|------|------|
| D1 | 统一契约核心形态 | 新建统一 Design System Contract；Author、Design 产出该 contract 的可复用包或项目实例，schema v2 template 与 design freeze 转为发布/绑定层 | 用户要求数个 skill 以同一 design system 为准；避免 template 与 freeze 长期双真相 | settled |
| D2 | 核心与项目绑定边界 | 分离 portable core 与 project binding | portable core 保持技术栈无关、可复用、可发布；project binding 承载输出根、技术栈、实现路径和构建身份 | settled |
| D3 | Apply 优先真相 | 项目 active Design System 优先；无 active 时只能显式从 `published` 模板或 catalog pin 领养；模板库更新不静默覆盖项目 | 保证项目演进可控，同时保留 Author 发布与领养入口 | settled |
| D4 | 外部 reference 引入方式 | 定点 vendor 进 Apply references，保留 UPSTREAM、固定 commit、LICENSE 与审计说明；`frontend-design` 必读，shadcn / Tailwind 按栈条件加载 | Apply 需要自包含且稳定的实施规则；条件加载避免无关栈上下文 | settled |
| D5 | 统一契约物理形态 | `design-system/v1` 采用 manifest + 分层文件：`design-system.yaml` 与 `core/`，项目实例另有 `binding.yaml` | 契约本体需要稳定；分层文件支持变更集合、digest、局部更新和跨 skill 消费 | settled |
| D6 | 旧格式兼容与迁移 | 新契约为主；schema v2 template 可显式领养/投影，旧 freeze 必须迁移校验；未知 schema、partial migration、digest 不匹配 fail closed；Author 只写 candidate | 统一必然破坏旧双真相，显式迁移可避免静默混用 | settled |
| D7 | Apply active truth 门禁 | 初始化与增量更新都强制有效 active Design System；greenfield 先显式建立，increment 缺失即停止，digest 不匹配即停止 | “以 design system 为准”必须是非可选门禁 | settled |
| D8 | vendor 精确范围 | vendor `frontend-design`、`shadcn`、`tailwind-css-patterns`、`tailwind-design-system`；按栈/场景条件加载；本次不 vendor `webapp-testing` | 覆盖审美方向、组件体系、Tailwind implementation pattern 与 v4 token 承接，同时控制 bundle 范围 | settled |
| D9 | 库宿主与消费项目目录边界 | `templates/<name>` 保存不含 binding 的 package；`.ui-template-design/` 保存含 `binding.yaml` 的 active instance；领养时复制 portable core 并生成 binding | 分离发布真相与项目实施真相，避免消费项目反向依赖库宿主路径 | settled |
| D10 | 发布与迁移策略 | 一次 breaking release 完成统一契约切换；旧 schema v2 可显式领养/迁移，旧 freeze 不静默消费 | 避免新旧格式长期并存造成组合爆炸和静默混用 | settled |
| D11 | Author 产出职责 | Author 只发布 portable-core package，不生成 binding、依赖、output root 或业务实现；Intake→Generate→Validate→Eval→Index→Report 主线保留 | 保持 Author 可复用抽取边界，项目落地归 Design/Apply | settled |
| D12 | Apply 场景建模 | Apply 保留 Phase 0–9，显式增加 `mode: bootstrap | increment`；checkpoint 记录 mode、change set、contract/binding digest、template identity 和浏览器证据 | 一条质量主线覆盖初始化与增量更新，同时保留场景化恢复门禁 | settled |
| D13 | Active Instance 写入权 | Design 拥有契约完整编辑权；Apply bootstrap 只能 adopt-only，increment 只消费并提出 proposed feedback；checkpoint 由 Apply 拥有 | 保留 Author+Apply 独立闭环，同时防止 Apply 私改统一契约 | settled |
| D14 | Token 唯一权威 | `core/tokens.yaml` 是唯一权威；原生 theming 是 binding 声明的 Token Projection，不得双向同步；不一致 fail closed | 消除 portable core 与项目主题文件的双载体漂移 | settled |
| D15 | Vendor 条件加载 | 加载依据只能是用户确认后的 binding；`frontend-design` 按视觉任务必读，shadcn / Tailwind 按栈触发，vendor manifest 固定 revision/license/digest，禁止运行时联网补抓 | 避免探测误判、无关栈注入和不可复现依赖 | settled |
| D16 | Design source origin | 保留 `bootstrap | refactor | iterate` 任务类，另设 `source_origin: blank | template-package | legacy-freeze-migration`；迁移不是任务类 | 项目状态与产物来源正交，避免复制门禁或割裂官方模板复用 | settled |
| D17 | Manifest / digest / freeze 状态 | `design-system/v1` 用 manifest + 每个 layer digest + `sha256-canonical-json-v1` contract digest；active instance 另有 binding digest；任一失配 fail closed | 跨 skill 消费、增量恢复和冻结验证需要稳定机器身份 | settled |
| D18 | Author metadata / provenance | 新建 `design-system-*` schema family；继承 schema v2 的 name/version、sources、confidence、coverage、token origin、source locator、asset license/redaction 语义 | 清晰区分新契约家族，同时保留成熟治理语义 | settled |
| D19 | Migration receipt | 迁移只写 candidate，并生成独立 `design-system-migration/v1` receipt；`unresolved/errors` 非空不得入 INDEX 或作为 active instance | 迁移必须可审计、可拒绝、可重放，且不污染运行时契约 | settled |
| D20 | Stable identity / 引用模型 | Primitive、Pattern、Page Type、Token、Rule 使用跨文件稳定 ID；引用不复制值；published ID 不复用 | 让 evidence、feedback、verification、gallery 和增量更新可精确落点 | settled |
| D21 | Core layer 闭包 | `core/` 固定七类文件：tokens、primitives、patterns、page-types、layout、rules、evidence；package 用 `tokens-only | ui-kit | page-system` capability 声明必填范围 | 统一语义闭包，同时避免 style-only 来源被迫编造组件或页面 | settled |
| D22 | Author L0–L6 映射 | 保留 L0–L6 变更集合标签，映射到 manifest/meta、layout、tokens/evidence、page-types、primitives、patterns 和 apply/ | 复用现有 Author 治理、eval 和 source replay 纪律，降低迁移成本 | settled |
| D23 | Design 0–9 映射 | 保留 Design Phase 0–9；Phase 1 建 binding，Phase 3–5 核对/冻结 core，Phase 7–9 用 gallery 与浏览器证据完成 freeze | Design 继续拥有 active instance 完整编辑权，领养 package 时不重写 core | settled |
| D24 | Apply checkpoint 失效粒度 | checkpoint 记录 mode、change set、contract/binding/projection digest、用到的 stable IDs、output root、build identity 和证据；按依赖面精确重开 phase | 增量更新需要精确失效，避免全量重做或绕过契约 | settled |
| D25 | Feedback 归属 | Apply 把缺口闭集分类为 `package | binding | apply-skill`；package 移交 Author，binding 可按显式 change set 修项目绑定，core/skill 缺口移交对应 owner，修复后重生 | 让缺口落到真正修复面，避免 Apply 私改契约或用生成物掩盖缺陷 | settled |
| D26 | Governance validator 边界 | 新增统一 `validate_design_system.py`，Author/Design/Apply runtime 复用；`make bootstrap/validate/test/eval/bundle` 与 `openspec validate --all --strict` 保留 | 统一契约需要单一机器事实源，避免三个 skill 各自解释格式 | settled |
| D27 | Vendor 分发治理 | vendor 目录 + `vendor.yaml` + `UPSTREAM.md`；记录 fixed revision、license、files、SHA-256、allowed triggers；bundle allowlist 与治理测试校验；不打包无关文件，不改第三方原文 | Vendor Reference 必须像发布资产一样可复现、可审计、可回滚 | settled |
| D28 | 子 change 拆分 | 拆为 schema、author、design、apply、release 五个子 change；schema 先冻结，skill 改造评审可并行但合入串行 | 公共 schema 是依赖根；分片可评审回滚，避免大 change 和三套解释 | settled |
| D29 | Breaking release / official catalog | bundle `3.0.0`；`workbench-shell` 迁移为 `design-system/v1`、`capability: page-system`、version `3.0.0`；catalog 只放迁移后官方副本，schema v2 不再作为当前发布格式 | 一次 breaking release 切干净；旧格式保留迁移路径，不保留旧发布路径 | settled |
| D30 | 安装边界 | 保留 Author+Apply 成对安装；Design 可单独安装；三者可同时安装；Apply 无 Design 时只能 adopt-only + 生成 binding；Design 不发布 package 或实现业务页 | 统一格式不改变现有公开产品边界和独立 Design System 场景 | settled |
| D31 | 发布验收 | 覆盖 `tokens-only`、`ui-kit`、`page-system`、active increment 四类 fixture；官方迁移 receipt 无 unresolved；统一 validator/eval 通过；bundle 双构建 checksum 稳定；bootstrap 与 increment 各完成一次干净重生；五条固定治理命令全通过 | 验收必须证明跨 skill 闭环、迁移、发布可复现和增量安全，而不是仅证明可解析 | settled |
| D32 | Grill 收口 | 用户确认 D1–D31 达成共识，frontier 清空；下一步是单独发起 `openspec-propose`，不自动执行 | 满足 grill 结束条件：无静默假设且用户确认 | settled |

## 术语表

| 术语 | 本任务语境下的定义 | 与既有用词的关系 |
|------|--------------------|------------------|
| Design System Contract | Author、Design、Apply 共同识别的统一语义契约，承载 token、Primitive、Pattern、Page Type、规则与证据 | 新造；消除 template 与 design freeze 的双真相 |
| portable core | 契约中技术栈无关的语义层，不包含工程依赖、stack adapter 或项目输出路径 | 继承 schema v2 模板的自包含设计规范边界 |
| project binding | 契约中项目落地层，记录 output root、已确认技术栈、组件体系、实现路径、构建身份与模板 pin | 继承 design freeze 的项目绑定语义 |
| active Design System | 消费项目 `.ui-template-design/` 中当前可实施、digest 一致的统一契约实例 | 修正既有“design freeze 只是可选投影”的关系 |
| Vendor Reference | 固定 revision、带 license 与来源说明、随 Apply 分发的第三方规则快照；只能按 project binding 声明的栈条件加载 | 新造；区别于运行时依赖或可选外部 skill |
| Template Package | 库宿主 `templates/<name>` 中可发布、可退役、不含 project binding 的 portable-core 分发单元 | 沿用模板生命周期，但格式切换为 Design System Contract |
| Active Instance | 消费项目 `.ui-template-design/` 中含 `binding.yaml`、checkpoint 与证据的可实施 Design System Contract 副本 | 细化 active Design System 的物理边界 |
| Apply Mode | Apply 会话的显式场景标签：`bootstrap` 建立并实施，`increment` 在既有 active instance 上更新 | 新造；避免靠输出根状态隐式判断 |
| Token Projection | 由 `core/tokens.yaml` 派生到原生主题机制的落地文件；binding 记录目标、映射和 digest | 修正既有“原生 theming 文件即 token 唯一载体”的说法 |
| Migration Receipt | 随候选产物生成的独立迁移审计记录，记录 source/target digest、映射、defaulted/dropped、unresolved 与 errors | 新造；不属于 contract runtime 本体 |
| Stable Entity ID | 跨文件引用 Primitive / Pattern / Page Type / Token / Rule 的稳定身份；展示名不是身份 | 新造；扩展既有稳定 rule ID 模型 |
| Package Capability | Template Package 的显式能力等级：`tokens-only | ui-kit | page-system`，决定消费时哪些 core 层必填 | 新造；替代“常用组件已有规格”这类模糊覆盖说法 |
| Impact-based Resume | 按契约、binding、projection、stable ID、output root、build identity 与证据的依赖面重开 Apply phase 的恢复策略 | 新造；区别于全量重开或只跑浏览器 |
| Feedback Ownership | Apply 缺口的闭集归属：`package`、`binding` 或 `apply-skill`；决定移交 Author、修项目绑定或改 skill | 新造；区分模板缺口、项目适配与流程缺陷 |

## ADR 候选

- [ ] adr-unified-design-system-contract: 统一 Design System Contract 是三个 skill 的唯一语义真相，template 与 freeze 只保留发布/项目绑定职责（出处：D1）
- [ ] adr-core-binding-separation: portable core 与 project binding 分离，使可复用设计与项目技术落地各自演进（出处：D2）
- [ ] adr-active-design-system-authority: Apply 以项目 active Design System 为实施真相，模板库只是显式领养来源（出处：D3）
- [ ] adr-core-token-authority: portable core 是 token 精确值唯一权威，原生 theming 只是派生 projection（出处：D14）
- [ ] adr-stable-entity-ids: Primitive / Pattern / Page Type / Token / Rule 使用跨文件稳定 ID，展示名不是身份（出处：D20）
- [ ] adr-breaking-design-system-release: 以一次 bundle `3.0.0` 切换到 Design System Contract，并只保留旧格式迁移路径（出处：D29）

## 未决问题

无。
