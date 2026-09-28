# CHANGELOG

## Apply 身份门禁与生产索引闭环 — Unreleased

补齐三段流水线里"文档已承诺、但没有可执行实现"的缺口。基线全绿（`make validate` 12/12、252 测试通过），因此以下每条都是现有门禁漏掉的洞。

- Phase 8 场景覆盖改为四源闭合：`validate_checkpoint` 同时消费 fidelity、layout、expectations、primitives（新增 `layout_value` / `expectations_value`，CLI 增 `--layout` / `--expectations`，`--active-instance` 自动带全）。此前只传两源，`workbench-shell` 上 182 条必需场景只强制 110 条，**25 条 measured expectations 全部形同虚设**；现覆盖 248/248。
- checkpoint 新增 `fidelity.expectation_digest` 绑定与 `CHECKPOINT_EXPECTATION_DRIFT`（phase 8），expectation set 变化使既有比对结论过期。
- Impact-based Resume 身份口径与校验器对齐（补 `primitives` 参与 digest），并把**缺失 `template.digest` 从"跳过检查"改为判 mismatch**；新增 `--source-identity`，源码变化至少重开 Phase 8。此前无 `template.digest` 的 checkpoint 可 `blocked=false`、exit 0 通过。
- `design-system-apply-checkpoint/v1` schema 此前从未被任何代码加载，`_schema_findings` 对该标记直接短路。现已接入，并补齐 schema 与 `build_checkpoint` 实际输出的差异（`template.digest` / `tokens_digest` / `scope` / `updated_at`，移除位置错误的顶层 `template_digest`）。
- `adopt_package.py` 复制清单补 `measured-expectations.yaml`（原先静默丢弃，Phase 8 因此无验收对象）；`scripts/adopt_package.py` 立为权威源，apply / design 两处 runtime 镜像同步。
- 新增 `scripts/check_template_index.py` 并接入 `make validate`：强制"每行必有同名目录 / 每个模板目录必有一行 / 前四列与 `meta.yaml` 一致"。此前把 INDEX 描述与日期改错、再放一个未登记目录，`catalog --check` 全部零 findings——catalog 本身由 INDEX 生成，看不见 INDEX 自己错。
- `binding` 归属此前无交接产物、且 Design 的 SKILL.md 从不提及 feedback，导致该归属类别无主（Author 正确地不认领，记录卡死）。新增 `design-system-binding-handoff/v1` 与 `validate_design_system.py validate-binding-handoff`（evidence 解析失败即 fail closed），并在 Apply Phase 9 与 Design `iterate` 两侧接线。`feedback/v1` 的 `ownership: package` 闭集保持不变——binding 缺口本就不该进 package feedback。
- `manage_template_index.py delete` 此前对 `templates/<name>/` 直接 `rmtree`，无任何"这确实是模板包吗"的检查；现要求目录含 `design-system.yaml`（v1）或 `meta.yaml`（legacy v2），否则拒绝删除且不动 INDEX。
- runtime 漂移门禁由 12 对扩到 27 对，补上此前漏网的 `shared_validate_design_system.py`（安装态真正被 discovery wrapper 调用的那份，未登记导致仓库侧新增子命令在 bundle 里根本不存在）、`adopt_package.py`、`check_template_index.py` 与新 schema；另加"bundle 包装必须是薄壳"检查，防止 wrapper 退化成过期拷贝。
- `governance/scope.yaml` 补登 `skills/ui-template-apply/runtime/**`。此前 author 与 design 都有 `runtime/**`，唯独 apply 漏了，于是整个 apply runtime（checkpoint 状态机、恢复规划器、领养脚本、共用 validator 与 schema 镜像）都不在 active release 治理域内——它照样随 bundle 分发、照样被改，却不受任何检查覆盖，40 个文件全部逃逸。

### 本轮证伪的评审结论

原评审清单中 6 条经实测为误报，未做改动，记录在此以免重复排查：P1-2 catalog 漂移已由 `catalog --check` 门禁；P1-5 的 index `before/after_digest`、`unchanged_during_gate`、`removal_set` 与 `SILENT_DECISION_REMOVAL` 均已实现在 `template_authoring/gate.py`；P2-3 `merge_feedback` 确实使用 `apply_root`；P2-2 author catalog `INDEX.md` 确有状态列；P2-4 source/build/expectation 三类过期检查均绑定 Phase 8；P2-6 `chat-fab` 本就是可选锚点，且 `scenarios` 子命令会显式披露缺失来源。

## Template Certification Gate — Unreleased

Source-blind Apply 边界硬化与模板保真认证闭环。

- Apply 公开流程移除 `Mode A / Mode B` 与 `source-compare.yaml`；Apply Mode 只保留 `bootstrap | increment`，实现期禁止 oracle identity、source-compare 输入与历史生成物，checkpoint 校验以 `SOURCE_BLIND_VIOLATION` fail closed。旧会话迁移：依赖 source-compare 的对照需求改走 Template Certification Gate。
- 新增 `design-system-fidelity-certification/v1`：gate run + Pattern Equivalence Records 绑定 package digest、build identity、oracle revision，fail closed 校验身份、evidence 与 verdict；共享 validator（repo-root 与安装态）行为一致。
- Component Family 为派生闭集：validator 沿 Stable Entity ID 推导 Page Type → Pattern → Primitive 并输出 `component_family`；`--require-component-family` 对缺证据/悬空 fail closed。
- 新增 Template Certification Gate runner（prepare / verify / validate-inventory）：clean output root、fresh build identity、source-blind 扫描与 `package | apply-skill | certification-prompt` 失败归属。
- 官方 package publish/upgrade 需当前 accepted certification report（promotion-request release check）；candidate 停留在 `governance/candidates/`，生产 promotion 单独确认。
- `workbench-shell` 1.2.0 candidate 升级为完整 Component Family（20 primitives、15 patterns、4 page types），停留在 candidate，未进入生产 catalog。

## workbench-shell 1.1.0 — Unreleased

保真补丁：把组件级几何/状态纳入 portable contract，并让 Apply 按 fidelity 派生场景 fail closed。

- `workbench-shell` 更新到 1.1.0：补齐 sidecar 尺寸、chart palette、主题 shadow、成对 line-height 与按钮/输入/侧栏/面板几何状态。
- Apply 领养时原样复制 `fidelity.yaml`；checkpoint `template.digest` 绑定 meta + fidelity canonical identity。
- Phase 8 records 必须声明 `scenario_ids[]`，且并集覆盖 fidelity profile 派生全集；缺失场景 fail closed。
- 旧 `workbench-shell` 1.0.0 checkpoint 与新模板 digest 不一致，必须从 Phase 0 干净重生。

## 3.0.1 — Unreleased

兼容补丁：安装态自带统一 design-system validator，并切断 discovery wrapper 自 exec。

- 三个 public skill 的 `runtime/` 分发 `shared_validate_design_system.py` 与 `schemas/design-system/v1/`；Design 单独安装即可 `validate --kind active`。
- `UI_DESIGN_SYSTEM_VALIDATOR` 只能指向共享实现。指向 discovery wrapper 立即以 `VALIDATOR_SELF_INVOCATION` 失败，不再繁殖进程。
- 缺共享实现或 schema 仍为 `DESIGN_SYSTEM_VALIDATOR_MISSING`。已安装 3.0.0 需升级；不要把 wrapper 路径写入该环境变量。

## 3.0.0 — Unreleased

破坏性版本：官方发布产物与三个 public skill 统一切换到 `design-system/v1`。

- 新增统一 Design System Contract：portable core、project binding、Token Projection、Stable Entity ID、canonical digest 与 capability。
- Author 新建/更新产出 portable package；schema v2 template 只保留显式迁移入口。
- Design 创建/领养/迭代 `.ui-template-design/` Active Instance；旧 design-freeze v1 必须迁移且 unresolved 清零后才能 freeze。
- Apply 显式区分 `bootstrap | increment`，只消费 digest 一致 Active Instance；checkpoint 按 Impact-based Resume 重开受影响 phase。
- Apply bundle 纳入 `frontend-design`、shadcn、两个 Tailwind reference 的 fixed-revision vendor 快照、LICENSE、UPSTREAM 与 allowlist manifest。
- 官方 `workbench-shell` 迁移为 `page-system` package 3.0.0；candidate 与 migration receipt 已验证。
- Author/Apply 仍成对安装；Design 保持可单独安装与独立升级。

# CHANGELOG

## 2.2.0 — 2026-09-06

兼容版本：Apply 默认只读 catalog pin，不再为消费播种项目库。

- 空项目 Apply Intake 只读 Author catalog 并把 name/version/digest/`origin` pin 到 `.ui-template-apply/`，不创建项目 `templates/`。
- `require-published` 默认等价 resolve / `--no-seed`；`seed` / `adopt` 是 Authoring 显式领养，已有同名行或目录不覆盖，retired 不救回。
- Phase 0 判定 `greenfield | existing`；greenfield 未确认不得写应用源码或依赖清单，不得把任何栈写成 Apply 默认。
- Phase 9 closed 且无 proposed feedback 时必须提示可删 `.ui-template-apply/`；未领养则本仓不应有 `templates/`。不自动删除。
- checkpoint 增加可选 `template.origin` / `resolved_path`；新增 Phase 0 `00-architecture.yaml`。
- `workbench-shell` 的 `template_version` 不因本版本上涨。

## Unreleased

- 新增通用 Design System placement closure：portable layout 可声明 region/slot topology、relation/order、scroll owner、responsive mode 与 Pattern/Page Type/evidence 闭包； quantitative geometry 仍以 token 为唯一权威。
- Generate-from-source 对 `design-system/v1` candidate 不再走 portable-only 旁路；source capture、reproducibility、structural closure、replay、package validation 与 eval 全部通过才可 promotion。
- `page-system` source import 必须有完整 placement closure，或显式降级 capability；Apply 的 route/component artifact 必须绑定 stable layout/Pattern closure，placement-sensitive component 不得凭全局存在自行放置。
- 结构化 fidelity unavailable 时，Apply 不得把 prose slots/breakpoints 升格为 shell variant、ordered chrome slots、scroll owner 或 topology 约束。
- 增加可单独安装的 public skill `ui-template-design`：消费项目 Design System freeze；bundle 含三个 skill，默认 `make install` 仍只装 Author/Apply 且不删除已有 Design。
- Design skill 按可观察信号分流任务类 `bootstrap | refactor | iterate`：有匹配 freeze 走迭代更新，不重开完整阶段 0–9；digest 不匹配或范围未声明则停止，不得凭口吻猜测。
- Phase 0 架构判定只看本次前端输出根：仓库已初始化但输出根仍是新应用时必须选型；`00-architecture.yaml` 必填 `output_root`，`site` 与探测不一致失败。兄弟应用或功能规格不得自动确认。
- 现行治理/规格不再把上游产品名写成对齐目标或本机依赖；`check_active_release.py` 从已发布模板 `meta.sources[].ref` 提取名称并拒绝泄漏。
- `workbench-shell` published 正文 portable 对齐至 2.0.1：壳形态映射 Authoring 四态闭集并拆开 Web 断点与 Desktop 用户开关，Phase 0 明确 `legacy-baseline` / structural fidelity unavailable；精确值仍只在 `tokens.yaml`。进行中的 Apply checkpoint 因 `template_version` 变化需从 Phase 0 重开。

## 2.1.0 — 2026-09-05

兼容版本：官方 published 模板随 Author skill 的只读 `catalog/` 分发。

- 对外安装入口改为成对 `npx skills add sunzhenkai/ui-templates-skill -s ui-template-author -s ui-template-apply`；禁止把 `--all` 写成官方步骤。
- `make bundle` / `make install` 仍是治理、checksum 与回滚通道。
- 空项目从 catalog 播种 `workbench-shell`；已有同名行/目录不覆盖，retired 不救回。
- `ui-template-manager` 与本仓 OpenSpec skill 标 `metadata.internal: true`。
- `workbench-shell` 的 `template_version` 不因搬家上涨。
- 增加现行功能闭环文档 `governance/FUNCTIONAL-LOOP.md`。
- Authoring 补齐分层抽取与模板库生命周期（published/retired、retire/delete）。
- Apply 区分干净实现与保真对照；拒绝 retired 模板；禁止读原版源码或历史生成 web。
- 生产 INDEX 增加状态列；治理排除当前 `example/workbench-shell/web/**`。
- 收束闭环规约为四条不变量；分层改为变更集合；模式 B 分类合并为 spec/apply/prompt-or-accept。
- `manage_template_index.py` 进入 Authoring runtime，并提供 `require-published` 与 `check-changeset`。
- workbench-shell `confidence.components` 降为 medium，与 defaulted 覆盖诚实对齐。
- chrome-complete 最小集改为 `shell_variant` + 有序 slots；`header-trigger`/`chat-fab` 仅当已声明才 required。Apply Phase 2/7/8 只投影本次 sidecar 已声明的 record。通用 skill 正文不再把 A–E、Board 或本仓 `web-v*` 写成完成条件。

## 2.0.0 — 2026-09-04

首个双 public skill 分发基线，属于破坏性版本：

- 分发单元由单一 Authoring skill 改为同时包含 `ui-template-author` 与 `ui-template-apply`。
- Authoring public skill 身份由 `ui-template` 更名为 `ui-template-author`，与 Apply 成对；升级时安装器移除已退役的 `ui-template` 生产目录，并保留其 `patches/`、`experience/`。
- 模板消费契约切换到 schema v2，只接受 `source | computed | estimated | default`。
- 可选独立 `fidelity.yaml` sidecar（`repo-structural-v1`）表达 layout/geometry/state 与 chrome composition；core v2 无 sidecar 仍按 `legacy-baseline` 消费，layout 不得为 high，未知 profile fail closed。
- Authoring session-source replay 与 portable validation 分离；`--source-root` 只用于本会话 Generate-from-source。
- bundle 内置 portable validator、source replay runtime、fidelity schema、contract eval runtime、schemas 与固定 non-example fixtures。
- 安装改为逐 public skill staging、校验、原子替换和失败回滚；双 skill 必须配套升级。
- `ui-template-manager`、OpenSpec project skills、patches、experience、仓库配置、`example/**` 和外部 UI 数据不进入 bundle。
