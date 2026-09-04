## Why

仓库已经形成 Authoring、模板契约和 Apply 三段主流程，但 active OpenSpec、生产 skill、validator、README 与安装入口对同一契约存在冲突，现有校验还会在未检查 OKLCH 对比度时返回成功。若不先统一事实源并补齐验证、恢复、反馈、回归和分发闭环，后续模板与 skill 演进会继续产生不可检测的漂移。

## What Changes

- **BREAKING**：统一模板格式为 `spec.md` + `tokens.yaml` + `meta.yaml` + optional `apply/`；移除 active specs 对 `implementation/`、模板内 stack adapter 和工程目录契约的支持。
- **BREAKING**：引入版本化模板 schema v2，统一 token leaf、单位、`source | computed | estimated | default` origin、page-mode coverage 与 token evidence；提供显式 v1→v2 迁移和不兼容失败语义。
- 将 Authoring 完成条件改为 Validate → Eval → Index → Report；校验失败时不得更新索引或宣称模板完成。
- 将 validator 升级为 fail-closed 的 schema/语义校验器，支持 OKLCH、alpha 合成、required contrast pairs、跨文件引用、coverage、INDEX、相对链接和 JSON 输出，并以正反 fixtures 证明错误可被拒绝。
- 为 Apply 定义稳定的阶段产物、token digest、checkpoint、浏览器证据和恢复规则；对 `ui-ux-pro-max` 增加 one-intent、显式 mode、retry-once、abstain、no-persist 的 Query Contract。
- 建立 feedback inbox 与幂等状态机，使每条反馈都有 ID、目标模板、处置理由和 `accepted | known-gap | rejected | applied | verified` 生命周期。
- 对齐 `workbench-shell` active spec 与现有 A–E 页面模式、`apply/` 边界、断点和设计层组件契约，删除默认技术栈与代码目录要求。
- 新增双-skill bundle、manifest、原子安装、生产镜像漂移检查、可执行 contract eval、最小 CI、版本/发布和样例 promotion gate。
- 修复根 README、AGENTS、OpenSpec 与模板文档中的契约和来源描述；本 change 不修改历史 patch 的不可变内容。
- 明确非目标：不修改 `example/workbench-shell/web-v2/**`，不修复其 UI、路由、断点、测试、反馈链接或 Phase 8/9 证据，也不以 web-v2 通过作为本 change 的验收条件。

## Capabilities

### New Capabilities

- `template-contract-validation`: 定义版本化模板 schema、token evidence、fail-closed 校验、迁移、机器输出和跨文件一致性门禁。
- `skill-lifecycle-governance`: 定义双-skill bundle、安装/镜像、可执行 eval、CI、版本发布、文档和样例 promotion 的仓库治理闭环。

### Modified Capabilities

- `ui-template-workflow`: Authoring 改用统一 `apply/` 契约、schema v2、强制验证 gate 和可结案反馈消费。
- `ui-template-apply-workflow`: Apply 统一 origin 消费语义，并增加标准产物、checkpoint、证据、恢复、反馈与外部知识查询契约。
- `workbench-shell-implementation`: 将过期的 `implementation/`、stack adapter 和代码目录要求改为技术栈无关的设计规则与 `apply/` 验收指南，并对齐当前 A–E 页面模式和断点。

## Impact

- 受影响：`openspec/specs/`、`skills/ui-template/`、`skills/ui-template-apply/`、项目级 manager、`scripts/`、模板 schema/fixtures、`templates/workbench-shell/`、README/AGENTS、Makefile/安装工具、CI 与发布元数据。
- 模板消费者需要识别 schema version；现有 v1 模板必须通过迁移器或被明确拒绝，不能被静默猜测。
- 外部分发单元从单个 `ui-template` 改为包含 Authoring 与 Apply 的双-skill bundle；项目级 manager 不进入外部 bundle。
- 可能新增固定版本的校验依赖和 CI 工具；具体选择、锁定策略与回滚方式在 design 中定义。
- 不影响：`example/workbench-shell/web-v2/**`、其运行时依赖与现有业务实现；不引入 `ui-ux-pro-max` 数据集或第二套设计权威。
