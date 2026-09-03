## 1. 新 skill 骨架与 reference 迁移

- [x] 1.1 创建 `skills/ui-template-apply/` 目录骨架（SKILL.md、references/、evals/、experience/）
- [x] 1.2 `git mv` `apply-workflow.md`、`toolchain.md`、`quality-gates.md` 到 `skills/ui-template-apply/references/`，本步不做内容修改
- [x] 1.3 编写 `references/template-contract.md`：`spec.md` 优先级、`tokens.yaml` 唯一性、`origin` 读取语义、coverage 驱动验收严格度、冲突处理，并声明格式权威来源是 `ui-template/references/spec-format.md`

## 2. `ui-template-apply` skill 正文

- [x] 2.1 编写 `skills/ui-template-apply/SKILL.md` frontmatter：name、只含 Apply 触发词的 description
- [x] 2.2 编写 body：触发边界、阶段列表（一行一阶段 + gate）、消费契约摘要、工具路由、反馈产出要求、汇报要求；阶段细节只保留在 reference
- [x] 2.3 迁移 `evals/cases.yaml` 与 `experience/` 中 Apply 专属条目；双职责条目按 case 拆分；保留各自 README 与目录结构

## 3. `ui-template` skill 收窄

- [x] 3.1 重写 `skills/ui-template/SKILL.md` frontmatter：description 移除“用模板实现页面”类触发词，只保留 Authoring/模板库管理触发词
- [x] 3.2 重写 body：Authoring 核心原则、来源选择表、格式契约唯一归属、反馈消费、检测到 Apply 意图时提示移交 `ui-template-apply`；删除 Apply 正文与阶段细节
- [x] 3.3 压缩 body 与 `spec-format.md` 重复的模板写作细节，改为条件加载导航
- [x] 3.4 确认 `references/spec-format.md` 与 4 个 `source-*.md` 留在原位；`patches/` 历史档案不迁移

## 4. 项目入口与文档同步

- [x] 4.1 更新 `.agents/skills/ui-template-manager/SKILL.md`：按意图路由到两个 skill，保留薄封装定位
- [x] 4.2 更新 `AGENTS.md`：仓库现状中的 skill 结构、双 skill 安装说明、修改约定（Authoring 改 `skills/ui-template/`，Apply 改 `skills/ui-template-apply/`）

## 5. 验证

- [x] 5.1 运行 `python3 scripts/validate_templates.py`，确认模板库与 validator 零影响
- [x] 5.2 检查两个 SKILL.md 的 description 无触发词重叠，且互指对方职责
- [x] 5.3 检查所有内部链接与文件路径有效（无指向已迁移文件的死链）
- [x] 5.4 运行 `openspec validate split-template-apply-skill --strict` 通过
