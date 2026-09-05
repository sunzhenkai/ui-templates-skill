# Authoring feedback 生命周期

本文件定义 `ui-template-author` 消费 Apply feedback 的规则；记录结构由 schema v2 `feedback.schema.json` 定义。

## 发现顺序

更新模板前必须扫描并去重：1）用户显式给出的 feedback 文件/目录；2）用户指定消费项目的 `.ui-template-apply/feedback/*.{yaml,yml}`；3）当前工作区中已明确属于该模板的 inbox。不得递归扫描未知目录或读取无授权项目。没有发现记录也要在 Report 说明扫描范围。

仅接受 `schema_version: 2` 且模板 name/version/source revision 可核对的记录；`<uuid>.yaml`/`<uuid>.yml` 的 filename stem 必须等于记录 `id`。每条记录的 `evidence_refs` 必须非空，并在消费项目上下文中作为相对 `.ui-template-apply/` 根的现存文件解析，禁止绝对路径、`..`、符号链接越界和缺失文件。非空 `targets` 必须在模板完整 `known_rule_ids` 上逐项校验；有 targets 却无法取得规则上下文时必须 fail closed。除初始 `null → proposed` 外，每个 `status_history` 迁移自身都必须带非空 `reason`，不能只靠顶层 reason 代替。未知 schema、非法 UUID、filename/ID 不一致、fingerprint 不匹配、空或悬空 evidence/rule ID、缺少迁移理由或非法状态历史一律 fail closed。

## UUID 与 fingerprint 幂等

`id` 是 UUID。`fingerprint` 使用 `sha256-canonical-json-v1` 计算，输入为：

```json
{"template":{"name":"...","version":"..."},"scenario":"<NFKC + casefold + whitespace-collapse>","rule_domain":"<sorted targets；无 target 时为 scope>"}
```

按 UUID 命中，或按非终态 active fingerprint 命中时，合并去重后的 `evidence_refs` 并保留原 ID/处置，不创建第二条规则。终态 fingerprint 再次出现时返回既有终态 receipt；若确为新问题，必须改变可审计的 scenario/rule domain，而不是绕过去重。inbox 中同一 UUID 或 active fingerprint 对应多条记录时拒绝猜测。无匹配记录的 UUID 目标路径已存在时视为 filename collision，必须拒绝且保持原文件字节不变。任何更新都先写同目录临时文件并原子替换，写后验证整个 inbox；验证失败时必须回滚：恢复原字节或删除新文件，不能留下半写或未经验证的 inbox。

## 状态机与所有权

- Apply 只能创建 `proposed`。
- Authoring 可执行 `proposed → accepted | known-gap | rejected`。
- `accepted → applied | known-gap | rejected`；模板变更落盘并指向稳定 rule ID 后才可 `applied`。
- `applied → verified | known-gap`；完整 Validate + Eval 通过后才可 `verified`。
- `known-gap → accepted | rejected`，用于条件成熟后的重新处置。
- `rejected` 与 `verified` 是终态，不得重开或改写历史。

每次迁移追加 `status_history`，其 `from` 必须等于前一状态。除初始 proposed 外，每个处置必须有 `reason`；accepted/applied/verified 必须有 `targets` rule ID。项目目录、API/mock、状态库或框架专属反馈应 rejected，理由明确为 project-only，且不修改模板。

## receipt

每次处置在 Report 返回机器可读 receipt：`id`、`fingerprint`、`status`、`terminal`、`reason`、`targets`、`updated_at`、`evidence_count`。`rejected`/`verified` 的 receipt 是终态回执；原 feedback 及完整 history 仍是事实源，不在 receipt 复制完整证据。若可写原 inbox，更新原 UUID 文件；否则输出待回写文件并报告路径，不能假称已回写。
