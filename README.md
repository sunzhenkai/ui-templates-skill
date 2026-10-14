# ui-templates-skill

三个配合使用的 agent skills，用 **shadcn/ui + 通用 blocks + 页面 patterns + 可替换风格包** 构建 React 前端：

| skill | 用途 |
|---|---|
| [`ui-template-apply`](skills/ui-template-apply/SKILL.md) | 在项目里安装库与风格包，按 pattern 实现页面，验证（lint / 契约 / 渲染检查），处理反馈与升级 |
| [`ui-template-design`](skills/ui-template-design/SKILL.md) | 从品牌输入推导新的风格包（theme.css + meta.yaml） |
| [`ui-template-author`](skills/ui-template-author/SKILL.md) | 从现有仓库/网站/截图提炼风格包，并发布到 catalog |

## 结构

```
templates/<pkg>/                 风格包源（meta.yaml、theme.css、CHANGELOG.md）
skills/ui-template-apply/
  catalog/                       templates 的随 skill 分发副本（scripts/sync_catalog.py 生成）
  library/shadcn|blocks|lint     组件库、通用组合件、ESLint 规则；registry.json 由 build_registry.py 生成
  patterns/  steps/  scripts/
skills/ui-template-design/       derive_theme.py + 参考
skills/ui-template-author/       extract_theme.py + 参考
scripts/                         维护工具：build_registry、sync_catalog、check_no_project_names
tests/                           unittest
```

## 开发

```bash
make check                       # 项目名门禁 + registry/catalog 同步检查 + 全部测试
make sync                        # 改了 library/ 或 templates/ 之后
UI_TEMPLATE_ESLINT_DIR=<装有 eslint 与 typescript-eslint 的 node 项目> make test   # 额外跑 lint 规则测试
```

渲染检查测试需要 `playwright` 与 chromium；缺失时自动跳过。

验证 skill 改动的标准做法是 clean-room：在空 Vite 项目里只按 `ui-template-apply` 文档实现列表/详情/表单/设置页，
然后跑 tsc、eslint、`validate_package.py project`、`check_rendered.py`（见 `.agents/skills/ui-template-cleanroom`）。

`openspec/` 与 `docs/adr/` 保存 v3 及更早的决策记录，只读；v4 的变更见 [CHANGELOG](CHANGELOG.md)。
