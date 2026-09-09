# Source-blind Apply 边界与原版对照移交

Apply 只有一种实现心智：消费 digest 一致 Active Instance，按 Phase 0–9 生成页面。Apply Mode 只有 `bootstrap | increment`；不存在、也永不执行 source oracle 对照模式。

## 实现期禁止输入

以下内容不得进入任何 Apply 阶段、checkpoint 或 artifact：

- 原版 checkout、原版源码路径或 `meta.sources[]` 中的实现路径；
- source oracle 身份（oracle revision/locator）、source-compare 记录或对照结论；
- 历史生成物：任何 `web/`、`web-v*` 或上一轮输出目录中的实现文件。

runtime 校验发现上述任一输入时 fail closed 并报告 `SOURCE_BLIND_VIOLATION`；不得继续实现或声称完成。

## 用户要求“对齐原版视觉”时

1. 继续按正常 Phase 0–9 只消费 Active Instance 实现；不得读取原版。
2. 向用户说明：原版对照属于模板治理链路，由 Template Certification Gate 执行——固定 oracle revision、candidate package 与固定 prompts，先 source-blind 干净 Apply，再产生 Pattern Equivalence Records。
3. 若用户认为模板本身缺组件或样式：按 Phase 9 生成 `design-system-feedback/v1` package feedback（引用 Stable Entity ID 语义），交回 `ui-template-author`。
4. 若用户需要的是项目级 Design System 调整：移交 `ui-template-design`。

Apply 从不保存 oracle 身份，也不为对照新增 phase、artifact 或模式；会话中用户主动提供的原版信息一律只作为 package feedback 的场景描述，不作为实现输入。

## 失败差异回写边界（治理链路）

认证失败的差异只能归类并回写 `package | apply-skill | certification-prompt` 三个归属面，随后丢弃旧生成物、干净重生；修补上一轮生成物再复跑对照永远无效。
