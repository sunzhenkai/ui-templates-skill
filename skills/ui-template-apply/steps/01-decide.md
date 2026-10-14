# 01 决定：风格包、页面清单、决策

1. 选风格包：`catalog/*/meta.yaml` 的 `fits / not_for`。只有一个合适就直接用；都不合适 → 先用 ui-template-design 生成一个。
2. 列出页面，每页标一个主 pattern（`patterns/index.md`）。超过 15 个页面时先按 pattern 分组。
3. 决策：pattern front matter 的 `decisions` 默认值来自风格包 `defaults`。只有当需求**明确**与默认冲突时才覆盖；
   需要问用户时一次最多问 3 个，带推荐值。
4. 写 `ui-decisions.yaml`（项目根，提交到仓库）：

```yaml
package: workbench-shell
decisions:            # 只写覆盖项；键必须是某个 pattern 声明过的
  collection.row_height: 44
pages:
  /jobs: collection
  /jobs/:id: detail
  /settings/*: settings
local_edits: {}       # 被修改过的已安装文件 → 原因（validate project 会核对）
feedback: []          # 06 的分诊记录
```

不要在这一步写任何组件代码。
