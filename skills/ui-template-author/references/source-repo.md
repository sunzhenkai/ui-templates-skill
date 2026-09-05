# 来源：代码仓库（repo）

代码仓库默认按 `repo-structural-v1` 采集结构保真；只有用户明确要求“仅视觉语言/style-only”时才降级，并记录理由。若来源实际只是 Markdown/PDF 设计文档，改走 `source-doc.md`。

## Session source 与 provenance（必须先分清）

两件不同的事，禁止混用：

1. **Session source**：本次 Generate / 从源更新时，用户明确给出的可读来源。可以是本地路径，或用户在**本会话**授权读取的 Git 地址。只有这次导入才需要它。
2. **Provenance**（`meta.sources[]` + evidence）：已经写进模板的出处身份（id / type / ref / revision / captured_at）。导入完成后模板自包含。它不是文件系统路径，也不是下次 Authoring 的必填输入。

禁止：

- 因为已发布模板的 `meta.sources[]` 存在，就向用户索要历史 checkout 的本地绝对路径；
- 扫描 sibling checkout、`/tmp`、任意临时目录、`example/**` 来「补齐」source root；
- 按 `meta.sources[].ref` 自行 clone / 联网补取（用户在本会话把 Git 地址当作导入输入除外：那是本次 session source，不是补取）；
- 用旧模板 snapshot locator 冒充上游 observed structural fact。

已发布模板没有 session source 时：只做 portable Validate；replay 报告 `not-run`；无 sidecar 则为 `legacy-baseline`。这是成功路径，不是 blocker，不得停下来要求用户提供路径。

## Intake：仅在本次从源生成时冻结会话来源

仅当用户要求**新建导入**或**从源更新**时，开始前必须固定并报告：

- 用户为本会话提供的可读 session source，以及将写入 `meta.sources[]` 的 source ID；
- 完整 Git commit 或等价不可变 content digest `revision`，不得用 branch/HEAD 字样代替；
- `platform`、included scenes、components、interaction contexts；
- **本次变更集合**（路径/组件，可用 L0–L6 标签），见 [extraction-layers.md](extraction-layers.md)；未声明文件保持原字节；
- conformance：默认 `structural`；`style-only` 仅接受用户明确选择及非空理由；
- 确定性 limits：graph bytes、definitions、imports、usages、facts。

structural Intake 未固定上述字段或变更集合时不得开始 **Generate-from-source**。对已发布模板做校验、改文档、消费反馈、退役或删除等不含从源采集的操作，跳过本节，不索取 source root。

多个 theme、entry 或 canonical definition 未能由既有规则/显式 decision 唯一裁决时保持 unresolved，不做多数表决或“常见默认”推断。

## 声明的安全采集子集

通用 repo/TSX/JS 静态分析在无受信 parser 和项目语义时不能安全且确定地完成。本 skill 因而只支持 [repo-capture-format.md](repo-capture-format.md) 的 closed JSON/YAML literal source graph。**仅在已有 session source 时**调用：

```bash
python3 runtime/capture_repo_fidelity.py capture-request.yaml \
  --source-root /session/source/checkout \
  --receipt-out staging/capture-receipt.json
```

`--source-root` 必须是本会话用户给出的路径，禁止从 provenance、sibling 或 `/tmp` 猜测。没有 session source 就不要运行 capture，也不要因此去问历史路径。

这不是 TSX parser：runtime 不用 regex 冒充 AST，不解释 class/source syntax，**不执行来源代码**（包括 package script、compiler、bundler、hook 或来源程序）。`.tsx`、`.jsx`、`.js`、任意 source tree 猜测及未知 graph schema/profile 一律 `unsupported`；调用方必须先由获授权的可信工具在 session source 内显式生成 literal graph，或收窄/改用 style-only，禁止静默抽样。禁止用散文、代表页面截图或抽样 TSX 代替 tracked literal graph。

可写入 required shell slot 占位的骨架 graph（不解析源码）：

```bash
python3 runtime/capture_repo_fidelity.py --init-source-graph ui-source-graph.yaml
```

骨架 `closure_complete` 为 false 且 facts 为空，capture 仍 incomplete；补齐通用 chrome facts（`shell_variant`、有序 `slot_role`/`slot_order`）之前不得 Index。`header-trigger`、`chat-fab` 等锚点仅当本次 graph 或变更集合声明了该 role 才 required。

Capture 从声明 scope 的 canonical theme/entry/definitions 出发，沿显式 imports 形成 usage closure，稳定输出：definitions、exports、imports、usages、exclusions、dynamic/unresolved、facts、计数、graph digest 与 closure digest。完成标准是 scope closure 完整，不再是“3–5 个代表组件”。shell usage 缺 chrome composition 时报告 `CHROME_COMPOSITION_INCOMPLETE`，closure 不得 complete。超限时 receipt 的 closure 为空并报告 `limit-exceeded`；动态表达式、歧义或同 context/slot 冲突进入 unresolved，structural Generate-from-source 必须停止。

## Context 与 negative facts

归一化 identity 包含 facet、subject、scene/component、slot、context、state 与 property。navigation-link、entity-row-link、button-link、inline-prose-link 必须分别闭合；单一 context 不得推广成全局 link 规则。

`none`、`zero`、`non-wrap`、`non-shrink`、无 root scroll、无 underline、无 shadow 等必须写成 `negative: true` 的 expected fact。只有完整 included closure 一致支持的 fact 才可发布；冲突需保留全部 fact IDs/locators 并进入 unresolved。默认值只能是有 basis/decision ID 的 core default，不得冒充 observed structural fact。

## provenance、资产与 replay

导入时把出处身份写入 `meta.sources[]`，把 token/default/asset 证据写入 `evidence.yaml`。locator 描述**当时**的来源位置，并记录 method、captured_at 与 confidence；写进模板后，这些记录是历史 provenance，不再要求原文件仍在磁盘上。

本会话 Generate-from-source 新写入的 structural observed record 使用 identity-based 相对路径和 selector，并由 validator 对该**同一 session source** 做 replay。session source/revision 不可用、symlink/traversal 越界、span/closure mismatch 时，**这次从源导入**不得完成；已发布模板缺 checkout 不得套用这条失败。portable validation 的 replay `not-run` 对已发布模板是合法结果，不能替代「本次从源导入」所需的 replay，也不得升级为路径索取。

已发布模板上 `v1-source-token-migration` 等 snapshot locator 是合法 legacy evidence，不是 laundering 借口，也不是要求用户再给上游路径的理由。只有**本会话新声称** observed/source-direct 的 record 才禁止把 locator 指回候选模板自身。

复制截图、字体、图标、插画前检查仓库许可证不等于资产许可证。每个入库资产记录具体 `license`、`redistribution` 与 `redaction`；未知许可、禁止分发、测试账号/内部数据/品牌敏感素材不得进入模板。无法从来源确定的值必须 default + `basis`，不得伪装为 source。

## Staging gate

仅 Generate-from-source 使用 `runtime/run_authoring_gate.py`（它要求 `--source-root`，因为这次本来就有 session source）。候选 `fidelity.yaml`、capture receipt、candidate INDEX 都先写 staging。gate 重复 capture 并比较完整 receipt，随后要求 validator portable checks + 对该 session source 的 structural replay、Authoring eval 的 `declared = parsed = executed` 全通过，才允许显式 promotion。

对已发布模板做 portable 校验时不要调用该 gate，也不要为了满足它的 `--source-root` 去找历史仓库。任何失败均保持 production `templates/INDEX.md` digest 不变。报告字段与降级措辞见 [authoring-report.md](authoring-report.md)。
