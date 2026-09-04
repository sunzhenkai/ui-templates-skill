## ADDED Requirements

### Requirement: Structural profile schema 与跨文件语义验证
Validator SHALL 验证 `fidelity.yaml` 的独立 schema/profile version、conformance、稳定 IDs、rule/token/source refs、layout regions/scroll domains/overlay refs、component slots/geometry refs、context/state 闭集、negative facts、provenance 和 unresolved 互斥状态。一次运行 SHALL 聚合全部 findings，并输出稳定 code/path/details。

#### Scenario: Profile 正向实例
- **WHEN** profile 的 layout、geometry、state records 均完整且所有 refs 可解析
- **THEN** portable validation 通过并输出按 facet/record/status 的非零计数

#### Scenario: Dialog padding token ref 悬空
- **WHEN** component geometry 引用不存在的 spacing token path
- **THEN** validator 报告稳定悬空引用 finding，并使候选失败

#### Scenario: Scroll domain owner 不唯一
- **WHEN** 一个声明的 scroll domain 没有 owner 或有多个 owner
- **THEN** validator 报告 domain 与冲突 region IDs；其他独立 domain 不受影响

#### Scenario: Contextual state 冲突
- **WHEN**相同 subject/context/state/surface 同时声明 `text_decoration: none` 与 `underline`
- **THEN** validator 报告冲突记录并失败，不按文件顺序任选其一

### Requirement: Profile 工程边界验证
Structural profile normative data SHALL 只包含技术栈无关设计语义。Validator SHALL 拒绝依赖、框架 primitive、package/import、CSS class、hook、项目源码目录、API/mock/data/state 选型和 runnable command；provenance locator MAY 包含安全相对 source path、symbol、selector 或 pointer。

#### Scenario: Normative 字段包含 Tailwind class
- **WHEN** layout、geometry 或 state expected 中写入 source class string
- **THEN** validator 报告禁入工程内容并要求改为结构语义、闭集值或 token ref

#### Scenario: Locator 包含安全 source path
- **WHEN** provenance locator 使用固定 revision 下的安全相对路径与 symbol
- **THEN** portable validator 接受其形状，source replay 再验证目标与摘要

### Requirement: Authoring source replay 模式
Validator/runtime SHALL 提供显式 source replay 模式，将 profile source IDs 绑定到**本会话**用户提供的固定 checkout，并验证 revision、locator、source-span digest、usage closure receipt 和 published record。未提供 session source 的 portable 模式 SHALL 明确报告 replay not-run，且对已发布模板这是合法成功结果，SHALL NOT 据此向用户索要 `meta.sources[]` 对应的本地路径。仅当本会话正在 structural Generate-from-source 时，completion SHALL 要求对该 session source 的 required replay 全部 executed/passed。

#### Scenario: 固定 checkout 匹配
- **WHEN** caller 为本会话 required repo source 提供 revision 一致的 session source root
- **THEN** replay 报告 `declared = resolved = executed`，每条 observed record 有匹配 locator/span digest

#### Scenario: Evidence laundering
- **WHEN** 本会话 Generate 写入的 record 的 source revision 字段声称上游 repo，但 locator 实际指向候选模板或无关 checkout
- **THEN** replay 返回 source-boundary finding 并失败

#### Scenario: Portable validation 无来源
- **WHEN** Apply、发布检查或对已发布模板的校验只拥有模板目录
- **THEN** validator 仍执行全部内部 profile checks，并将 replay 标为 not-run 而非伪造 passed，也不得把 not-run 升级为「请提供本地绝对路径」

#### Scenario: Provenance 不是 checkout
- **WHEN** 已发布模板声明了 repo/doc source IDs 但调用方未传 `--source-root`
- **THEN** portable 模式完成内部检查；SHALL NOT 失败于缺失历史 source root

### Requirement: Structural fixtures 与机器回归
仓库 SHALL 提供不依赖 `example/**` 的正向、负向、mutation 和固定 repo fixtures，覆盖非换行横向 Board、嵌套 scroll domains、navigation/entity-row/button-link context、Dialog 逻辑方向 padding、overlay scope、source replay、unknown profile 和 semantic reproducibility。机器结果 SHALL 稳定排序且失败退出码与 findings 一致。

#### Scenario: Negative facts mutation
- **WHEN** fixture 将 navigation link 的 `text_decoration: none` 改为 underline 或删除 Dialog `padding_block_start`
- **THEN** 对应 context/geometry finding 稳定出现且命令非零退出

#### Scenario: Repo fixture 重复运行
- **WHEN** 相同 fixture revision、scope 和 decisions 被重复 capture/normalize
- **THEN** canonical structural digest 一致，任何 record identity/status/unresolved 漂移阻断 eval

#### Scenario: 测试发现 example 路径
- **WHEN** profile validator/eval 的发现域包含 `example/`
- **THEN** governance scope 检查失败，且该路径不得作为 source fixture 或通过证据
