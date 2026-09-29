---
created_at: '2026-09-28T14:35:00Z'
template:
  name: workbench-shell
  version: '3.1.1'
  origin: project
  resolved_path: templates/workbench-shell
  digest:
    algorithm: sha256-canonical-json-v1
    value: 84f0c468e1b45c9dae23cc6d7d68b8b8dead7cc6aa1ccc2b4a3c2de3dea23665
mode: bootstrap
platform: web
output_root: example/workbench-shell/web
architecture_site: greenfield
architecture_confirmed: false
---

# Phase 0 Intake

## 结论

消费项目库中已发布的 `workbench-shell 3.1.1`，以 source-blind bootstrap 实现 `example/workbench-shell/prompts/README.md`。输出根 `example/workbench-shell/web` 检查时不存在，判定为 greenfield。

## 成功流程

1. 用户确认 11 项闭集技术栈。
2. 从 published package adopt-only 建立 `.ui-template-design` Active Instance。
3. 冻结 token、路由、结构与组件清单。
4. 实现七个工作区与全局系统。
5. 用当前构建采集真实浏览器证据。
6. Review、feedback 与会话收口。

## 范围

### included

- 收件箱。
- 事件列表、事件详情、事件看板。
- 服务目录与依赖关系。
- 值班安排与冲突校验。
- 交付分析。
- 工作区设置。
- 全局工作区切换、搜索、创建事件、反馈确认、快捷键、置顶与帮助。
- 本地 mock 数据、加载/成功/空/失败状态、键盘与 ARIA、路由恢复。
- 构建、lint、单元测试、E2E 与真实浏览器验收。

### deferred

- 无。当前需求范围内的功能不得静默降级。

### excluded

- 真实后端、真实通知、真实身份认证、真实附件上传和外部服务调用。
- 原版仓库、历史生成 web、现有兄弟应用和模板来源实现细节；这些不是实现输入。
- 模板 `coverage.themes.unsupported` 中的 dark 主题：提示词未要求，且模板未声明观察证据。

## Coverage 决定

| 对象 | 模板状态 | 决定 | 说明 |
| --- | --- | --- | --- |
| dark 主题 | unsupported | excluded | 提示词只要求可运行站点，未要求 dark。 |
| default / closed / disabled 状态 | defaulted | accepted | 用模板 token 与规则表达，并用可见状态名或辅助文本补充。 |
| invalid 状态 | unsupported | accepted for prompt behavior | 提示词明确要求表单校验；以模板可用 input/button 状态承载，状态文本与 ARIA 不只靠颜色。 |

## Fidelity

`templates/workbench-shell/fidelity.yaml` 存在；checkpoint 必须绑定 meta 与 fidelity 的 canonical digest。不得把 structural 证据升级为原版对照。

## Gate

模板解析、schema/origin 检查通过。范围记录完成。技术栈尚未确认，`confirmed_by_user: false`；未确认前不得创建或修改应用输出根。
