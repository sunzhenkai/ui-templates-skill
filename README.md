# ui-templates-skill

可共享 Agent Skill `ui-template` 的源码仓：从 Web 站点、代码仓库或图片中提取 UI 设计风格，沉淀为可复用的设计规范文档；也定义使用已有模板分阶段实现真实 UI 的 Template Apply 工作流。模板本身仍以规范文档和实施说明为主，不是 runnable starter。

## 目录结构

- `skills/ui-template/` — 通用 skill 源码（`SKILL.md` + `references/` 中的来源提取指南、模板格式、Template Apply 工作流、toolchain 与 quality gates）。
- `templates/` — 模板库，由 skill 维护，含 `INDEX.md` 索引；现有 `workbench-shell/` 等模板。
- `.agents/skills/ui-template-manager/` — 本仓库的项目级 skill（薄封装），管理 `templates/`。

## 模板消费

复杂模板可包含 `implementation/` playbook。例如 [`templates/workbench-shell/implementation/playbook.md`](templates/workbench-shell/implementation/playbook.md) 定义 App Shell、五种页面模式、组件 inventory、代码结构、默认 React + Vite + Tailwind + shadcn adapter 和浏览器验收矩阵。设计规则冲突时，模板的 `spec.md` 优先。

## 安装

把 `skills/ui-template/` 整个目录拷贝到目标项目的 skill 目录即可，例如：

```bash
cp -r skills/ui-template /path/to/project/.agents/skills/
```

## 许可证

MIT，见 [LICENSE](LICENSE)。
