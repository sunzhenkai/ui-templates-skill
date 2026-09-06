## ADDED Requirements

### Requirement: 功能闭环文档受治理
仓库 SHALL 在 `governance/FUNCTIONAL-LOOP.md` 维护现行功能与目标。该文档 SHALL 属于 active/release，并与生产 skill、validator、eval 一致。`docs/functional-loop-review.md` SHALL 被标识为 superseded，不指导现行实现。

#### Scenario: 按功能文档安装与验证
- **WHEN** 维护者阅读 README 与 AGENTS
- **THEN** 能找到 FUNCTIONAL-LOOP、双 skill 入口、INDEX 状态和禁止改生成物的规约

### Requirement: 当前生成 web 治理排除
root governance SHALL 排除 `example/workbench-shell/web/**` 以及既有 `web-v1/**`、`web-v2/**`、`web-v3/**`。样例质量 SHALL 不决定发布通过。保真修复 SHALL NOT 以生成 web 源码为唯一交付。

#### Scenario: 治理验收
- **WHEN** 运行 validate/test/eval/bundle/mirror
- **THEN** 机器报告包含当前 `web/**` 排除，且不以该目录测试结果决定通过

### Requirement: 实例规格不得上升为产品契约
`workbench-shell-implementation` SHALL 只约束 `workbench-shell` 模板实例。通用 Authoring/Apply 契约 SHALL 不要求其他模板复制其 A–E、Shell 或业务页面集合。

#### Scenario: 新增非工作台模板
- **WHEN** Authoring 创建营销页或内容站模板
- **THEN** 不得因缺少 workbench A–E 模式而失败
