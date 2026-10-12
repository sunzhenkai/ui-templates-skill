# 任务类

Intake 用可观察信号判定 `bootstrap | refactor | iterate`，写入 `00-intake.md` 的 `task_class`。禁止凭用户口吻猜测。站点形态仍记 `greenfield | existing`，与任务类分开。

## 判定顺序

1. 用户明确「推倒重来」→ `bootstrap`（输出根空）或 `refactor`（输出根已有代码）；须用户确认。
2. `.ui-template-design/design-system.yaml` 为 `status: frozen`，且 `runtime/check_active_instance.py validate --kind active` 通过（digest 与当前本体一致）、用户未要求重建 → `iterate`。
3. `design-system.yaml` 存在但 digest 不匹配或校验失败 → 停止。用户选择重新冻结（转 `bootstrap`/`refactor`）或先修复后重跑校验；不得静默混用。
4. 只有旧 `.ui-template-design/freeze.yaml`、没有 `design-system.yaml` → `refactor` + `source_origin.kind: legacy-freeze-migration`（先迁移，见 active-instance.md）。旧 freeze 不是 iterate 判据。
5. 无 Active Instance，输出根空 → `bootstrap`。
6. 无 Active Instance，输出根已有依赖清单或实质源码 → `refactor`。
7. 「优化一下 UI」且范围未声明 → 停止询问，或只允许不改未声明层的更便宜路径。

## 必读 / 禁止预加载

三类都必须读：`decision-gates.md`、`layers.md`、`executable-rules.md`、`adapters.md`。扫描与禁止 raw token 不因任务类豁免。

| 任务类 | 再读 | 禁止预加载 |
| --- | --- | --- |
| `bootstrap`（初始化） | `greenfield.md`、`constitution-template.md`、`data-state.md`、`gallery.md`、`visual-loop.md` | `inventory.md`、`legacy-mapping.md`、`existing-refactor.md`、`iterate.md` |
| `refactor`（重构） | `existing-refactor.md`、`inventory.md`、`legacy-mapping.md`、`constitution-template.md`、`data-state.md`、`gallery.md`、`visual-loop.md` | `greenfield.md`（不重新选型）、`iterate.md` |
| `iterate`（迭代更新） | `iterate.md`；只再读被点名层（token / Primitive / Pattern / 规则 / Gallery）；视觉变更才读 `visual-loop.md` | 完整 `inventory.md`、从零 `constitution-template.md`、`greenfield.md`、`existing-refactor.md` |

未列入本次必读的 reference **不要读**。

写核心产物 YAML 时按需读取 [artifact-templates.md](artifact-templates.md) 中对应段落，不预加载全文。

## Source origin

`source_origin` 是正交字段，不改变任务类判定：

```yaml
source_origin:
  kind: blank | template-package | legacy-freeze-migration
  package: null | {name, version, digest}
  migration: null | {receipt, source_digest}
```

- `bootstrap + blank`：从零创建 core/binding。
- `bootstrap/refactor + template-package`：只领养 published package，复制 core；不改 package identity 或 stable IDs。
- `refactor + legacy-freeze-migration`：先生成无 unresolved/errors 的 migration receipt，再进入 refactor。
- `iterate` 只允许有效 Active Instance；不接受旧 freeze 直接迭代。

## 变更集合

`refactor` 与 `iterate` 必须在 Intake 声明路径/层集合；歧义时让用户在候选中选择。未声明路径保持原字节。一次只允许动 Token、Primitive、Pattern、规则或 Gallery 中用户点名的层。
