# Prompt：干净模式重建 workbench-shell Template

> 用法：把本文件全文作为一次任务的输入粘贴给 agent；先把 `<...>` 占位符替换成真实值。
> 本文件位于 `docs/**`（治理排除项），不参与 `make validate`。

---

## 任务

在本仓库以**干净模式**重建 `templates/workbench-shell` 模板，并用重建后的模板重新生成 `example/workbench-shell/web`。

干净模式的含义（必须严格遵守）：

1. 先删除 `templates/workbench-shell/` 与 `example/workbench-shell/web/`；
2. 只依据**本次会话给出的 source**，按最新 `ui-template-author` 重建 template；
3. 再按最新 `ui-template-apply` 从该 template 重建 example web；
4. **全程不参考任何历史文件**：不得读取已删除的旧模板、旧 `web/`、`web-v1/`、`web-v2/`、`web-v3/`，也不得把它们当作对照物或"提示"。

编排入口使用本仓库的 `ui-template-test` skill（干净模式）；template 生产由 `ui-template-author` 负责，web 生成由 `ui-template-apply` 负责。写模板与写页面是两个 skill，不得互相代做。

## 冻结输入（缺失则停下来问，不要猜）

- **session source**：`<本地 checkout 绝对路径 或 本会话授权的 Git 地址>`
- **source revision**：`<完整 40 位 git commit>`（禁止用 branch/HEAD/"latest" 代替）
- **capture graph**：`<若图在独立 commit，给出完整 SHA；否则说明图在 checkout 内相对路径>`
- **capability**：`page-system`
- **scope**：included scenes / components / interaction contexts：`<逐项列出>`
- **coverage 待观察范围**：platforms / viewports / themes / page_modes / states：`<逐项列出>`
- **conformance**：`structural`（仅当用户明确要求"只取视觉语言"时才允许 `style-only`，并记录非空理由）
- **本次变更集合**：`<路径与/或组件名单；可用 L0–L6 标签分组>`
- **oracle（用于认证）**：`<可部署的固定 revision + install/serve 命令 + 可访问 URL；没有就明确写"暂无">`
- **oracle 访问前提**：`<登录态、测试账号、数据种子等；没有就写"无">`

## 必须遵守的契约（违反即失败，不得绕过）

### 出处与 provenance

- `meta.sources[]` 的每个 revision MUST 能在声明位置复现；若某个 revision 只是本会话的本地 commit（例如把 capture graph 提交进工作副本产生的 commit），MUST 在 `ref` 里显式标注为 session-local、未发布上游，不能让它看起来像公开可取的版本。
- `core/evidence.yaml` 每条记录的 `source_id` 与 `source_revision` MUST 解析到 `meta.sources[]` 中声明的对应项；不得出现未声明的 revision。
- 已发布的出处是**身份**，不是文件系统绑定：不得写入本机绝对路径，不得因 provenance 存在就去 clone、扫 sibling、翻 `/tmp`。

### coverage 与 confidence

- `meta.coverage.*` 是 `declared` 的**完备互斥分划**：每个 declared 项 MUST 恰属 `observed`、`defaulted`、`unsupported` 之一；三桶两两互斥；`observed` 项 MUST 出现在 `declared` 中。
- `confidence.overall` MUST NOT 高于必需维度（layout / visual / components）中的最弱值。
- 某维度存在 `defaulted` 项时，该维度 MUST NOT 为 `high`。
- 用了 default 值就必须写 basis；defaulted 不得抬升为 observed。

### package 形态

- 必填 `design-system.yaml`、`meta.yaml` 与七层 `core/`（tokens、primitives、patterns、page-types、layout、rules、evidence）；`core/tokens.yaml` 是精确值唯一权威。
- 禁止 `binding.yaml`、`implementation/`、stack adapter、工程目录、依赖、API/mock/data 分层、状态库选型、runnable starter。
- Primitive / Pattern / Page Type / Token / Rule 使用 Stable Entity ID；已发布 ID 不复用，替代时保留 retired/superseded 说明。

### 抽取纪律

- 只能使用 closed literal source graph 通道；runtime 不得用 regex 冒充 TSX/AST parser，不得执行来源代码，不得静默抽样。
- 命中必答事实矩阵的问题 MANDATORY 逐项作答；确实不知道时用带 reason 的显式 `exclusions`，"沉默"等价于 fail closed。
- 未纳入本次变更集合的文件保持原字节，不得借"整理"改写。

### 应用纪律（生成 example web 时）

- Apply 是 source-blind：只消费 digest 一致的 Active Instance 与本次 output root，不得读取原版源码、`meta.sources[]` 实现路径或任何历史生成物。
- 差异不得靠改生成物闭合；只能回写 package / apply-skill / prompts，然后丢弃旧产物、用新的 build identity 干净重生。

### 认证纪律（发布链路）

- 官方 package 的 publish/upgrade/catalog 切换前 MUST 通过 Template Certification Gate，且认证 MUST 是 **oracle 锚定**的：oracle 侧证据只能是真实截图或结构化 inline 测量，占位文本、复现说明文件、无 oracle 引用的自报数值一律 fail closed。
- oracle 证据 MUST 由 `scripts/oracle_capture.py` 从固定 `oracle-deployment.yaml`（固定 revision + install/serve + routes/viewports/themes/measurements）采集，不得手工写入。
- oracle 不可部署时，gate 只能输出 `self-consistency` 并阻断 promotion；此时 **不得**声称 Visual Equivalence，也不得把 `self-consistency` 当成通过。
- catalog promotion 需要用户单独确认；agent 不得自动 promote、tag、archive。

## 执行顺序

1. **Intake**：冻结并汇报上面全部输入；确认 capability 与变更集合。
2. **删除**：移除 `templates/workbench-shell/` 与 `example/workbench-shell/web/`（先确认它们已被 git 跟踪，便于回溯）。
3. **Capture**：按 scope 生成/补齐 literal source graph，跑 capture 与必答矩阵，产出 `capture-receipt`；unresolved 非空即停。
4. **Author（Generate）**：按层抽取为七层 `core/` + 可选 `apply/`；写 `fidelity.yaml`（structural）。
5. **Validate**：`validate --kind package --require-component-family` 必须 0 error。
6. **Eval**：Authoring/schema/feedback/repo-profile 合约 eval 全过，replay `declared = resolved = executed = passed > 0`。
7. **Index**：仅在 4–6 全过后更新 `templates/INDEX.md`，并核对 name/description/source.type/captured_at 与 `meta.yaml` 一致。
8. **Report**：输出 package identity/version/capability、contract digest、来源与 coverage、default/estimated 摘要、unresolved、实际命令。
9. **Apply**：按 `bootstrap` 在 `example/workbench-shell/web` 干净生成，走完 Phase 0–9，Phase 8 用真实浏览器证据；模板带 measured expectation set 时逐条比对，缺失则记 `fidelity-unverified`。
10. **Certification**：若提供了可用 oracle，运行 `scripts/oracle_capture.py capture` 产出 oracle 证据，再跑 `run_template_certification.py verify`；否则如实报告 `self-consistency` 并停在这里。
11. **Promotion**：等待用户显式确认后再切换 catalog。

## 验收命令

```bash
make bootstrap
python3 scripts/validate_design_system.py validate templates/workbench-shell --kind package --require-component-family --json
python3 scripts/validate_design_system.py validate example/workbench-shell/web/.ui-template-design --kind active --json
make test
make eval
make validate
openspec validate --all --strict
python3 scripts/run_template_certification.py verify \
  --report governance/candidates/workbench-shell/certification/report.yaml \
  --inventory governance/candidates/workbench-shell/certification/inventory.yaml \
  --package-root governance/candidates/workbench-shell \
  --evidence-root governance/candidates/workbench-shell/certification/output
```

## 明确禁止

- 不得读取或参考任何历史 `web/`、`web-v*`、旧模板快照；
- 不得把生成物当作修复面（改生成物再复跑对照永远无效）；
- 不得用占位文件、复现说明或自报数值充当 oracle 证据；
- 不得把 `self-consistency` 当认证通过，也不得绕过 promotion 阻断；
- 不得在 Apply 里落 source oracle 身份、source-compare 记录或历史生成物引用；
- 不得自动 publish / tag / archive / promote。
