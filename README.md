# ui-templates-skill

可共享 Agent Skill `ui-template` 的源码仓：从 Web 站点、代码仓库或图片中提取 UI 设计风格，沉淀为可复用的设计规范文档（产物是文档，不是代码）。

## 目录结构

- `skills/ui-template/` — 通用 skill 源码（`SKILL.md` + `references/` 提取指南与格式定义）。
- `templates/` — 模板库，由 skill 维护，含 `INDEX.md` 索引；现有 `workbench-shell/` 等模板。
- `.agents/skills/ui-template-manager/` — 本仓库的项目级 skill（薄封装），管理 `templates/`。

## 安装

把 `skills/ui-template/` 整个目录拷贝到目标项目的 skill 目录即可，例如：

```bash
cp -r skills/ui-template /path/to/project/.agents/skills/
```

## 许可证

MIT，见 [LICENSE](LICENSE)。
