# AGENTS.md

在本仓库工作的 AI 编码助手指南。

## 语言与边界

- 默认简体中文；代码、命令、标识符、路径保留原文。
- skills、tests、scripts、templates 中不得出现具体项目/客户名（`.project-denylist`，`make names`）。
  上游来源名只允许出现在 `meta.yaml → sources[].ref`；确需提及的行加 `project-name-allow`。
- `openspec/**`、`docs/adr/**` 是历史记录：不改写。

## 事实源

| 内容 | 唯一源 | 派生物 |
|---|---|---|
| 风格包 | `templates/<pkg>/` | `skills/ui-template-apply/catalog/`（`scripts/sync_catalog.py`） |
| 组件与 blocks | `skills/ui-template-apply/library/**` | `library/registry.json`（`scripts/build_registry.py`） |
| 主题契约（变量清单、对比度对） | `skills/ui-template-apply/scripts/validate_package.py` | design `instance-format.md` 的文字说明 |
| pattern 决策键 | `skills/ui-template-apply/patterns/*.md` front matter | 包的 `defaults`、项目 `ui-decisions.yaml` |

改了源就跑 `make sync`，再 `make check`。

## 修改规则

- **skills 是通用产品**：任何改动都不能针对某个消费项目定制。来自具体项目的问题，先按 apply `steps/06-iterate.md`
  分诊到 theme / block / pattern 层，用通用方式修，再在 clean-room 验证。
- shadcn 文件（`library/shadcn/ui/*`）原样 vendored；本地补丁必须登记在 `library/SOURCE.md`。
- blocks 只依赖 shadcn/ui、`@/lib/vocab` 与 registry 中列出的 npm 包；新增 block 后必须在 clean-room 中 typecheck。
- 文档预算：SKILL.md apply ≤ 70 行、design ≤ 60、author ≤ 80；每个 pattern / step / reference ≤ 150 行（测试强制）。
- 规则优先放在**写代码时**生效的位置（pattern 示例、block 默认行为、lint），其次才是事后检查（check_rendered）。

## 命令

```bash
make check     # 门禁 + 测试
make sync      # 重新生成 registry 与 catalog
```
