# 包格式与发布

格式与 theme 契约的权威说明：`ui-template-design/references/instance-format.md`。要点：

- 目录 `<name>/`：`meta.yaml`、`theme.css`、`CHANGELOG.md`、可选 `extensions/<id>.{yaml,css}`
- `schema: ui-template/v4`，`name` = 目录名，semver
- theme.css：shadcn 核心变量 + 扩展（success, warning, warning-foreground, info, brand, brand-foreground,
  faint-foreground, app-shell），`:root` 与 `.dark` 都要有，`@theme inline` 映射，`--text-sm` 定义密度
- `defaults` 的键必须是 apply patterns 声明过的决策

## 扩展层（extensions/）

将项目实战演进与参照源基线物理隔离：`templates/<pkg>/theme.css` 只保留参照源提取/校准值；自有设计演进写在 `templates/<pkg>/extensions/<id>.{yaml,css}` 并在 `meta.yaml → extensions: [<id>]` 按序声明。

- `<id>.css`：在 `:root` / `.dark` / `@theme inline` / `@theme` 块中声明覆写或新增变量（`sync_catalog.py` 按 token 合并进唯一块）；用 `/* @unset --var */` 显式移除基线变量回退库默认；非 token 规则块追加到合成末尾。
- `<id>.yaml`：可选 `id`、`summary`、`defaults`（覆盖基线默认决策）、`density_claims`（同步更新合成 `meta.yaml` 密度声明）。
- `python3 scripts/sync_catalog.py --inspect <pkg>` 查看相对基线的覆写/新增/移除明细。

## 版本

| 改动 | 版本 |
|---|---|
| 调整变量数值、修对比度 | patch |
| 新增/修改 defaults、fits | minor |
| 删除/重命名变量、换基座（style/base） | major |

## 发布（在 skill 仓库内）

```bash
cp -r <dir>/<pkg> templates/<pkg>                  # 或更新已有目录
$EDITOR templates/<pkg>/CHANGELOG.md                # 新版本条目：改了什么、为什么、与来源的偏离
python3 scripts/sync_catalog.py                     # templates → ui-template-apply/catalog
python3 skills/ui-template-apply/scripts/validate_package.py package templates/<pkg>
python3 -m unittest discover -s tests
python3 scripts/check_no_project_names.py
```

已安装的项目通过 `install_registry.py --status / --upgrade` 获取新主题；本地改过的 theme.css 会显示为 conflict。
