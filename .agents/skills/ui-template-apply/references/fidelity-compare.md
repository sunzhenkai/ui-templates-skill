# 干净实现与保真对照

Apply 有两种模式。checkpoint 仍是 Phase 0–9，不新增 phase。消费需求写在用户指定的 prompts；生成目录是本次约定的空目录或当前输出目录，不得把已有生成物当实现参考。

## 模式 A — 干净实现（默认）

输入：INDEX 状态为 `published` 的模板 + 用户指定的需求。

禁止：

- 打开原版 checkout、按 `meta.sources[]` 补路径或 clone；
- 参考工作区里已有的生成物或未跟踪 WIP；
- 在生成物里做视觉特例化修复。

完成：Phase 8/9 对**模板 expected** 通过。

Intake 必须先跑：

```bash
python3 ui-template-author/runtime/manage_template_index.py require-published <name>
```

未传 `--index` 时使用项目 `templates/INDEX.md`；默认从兄弟目录 `ui-template-author/catalog/` 播种缺失的 published 模板。项目 `retired` 行不救回。非 0 退出则停止，不得进入 Phase 1。

## 模式 B — 保真对照（仅用户明确要求对齐原版）

额外输入：本会话可部署的原版，只作视觉 oracle，不是实现输入。

将对照写入 `.ui-template-apply/source-compare.yaml`。分类只有三档：

- `spec`：壳/token/组件规格或采集不足，回写模板或 Authoring；
- `apply`：阶段、取证或重生不稳定，回写 Apply skill；
- `prompt-or-accept`：业务缺页走 prompts，或用户书面接受偏差。

**禁止**用改生成 CSS/组件来闭合对照失败。回写后必须丢弃本次生成物，只用更新后的 skill + 模板干净重生一次。

没有可运行浏览器或可部署 oracle 时停止，不得用静态检查或历史截图冒充模式 B。
