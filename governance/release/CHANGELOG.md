# CHANGELOG

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
