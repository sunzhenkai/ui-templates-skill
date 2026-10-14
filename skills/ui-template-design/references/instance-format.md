# 风格包格式（ui-template/v4）

```
<name>/
  meta.yaml      # 身份、适用范围、基座、默认决策、来源
  theme.css      # @theme inline 映射 + 密度 + :root / .dark 变量
  CHANGELOG.md   # 发布到 catalog 时必需
```

## meta.yaml

```yaml
schema: ui-template/v4
name: my-package            # = 目录名
version: 0.1.0              # semver；变量改值 = patch，新增默认决策 = minor，删变量/改名 = major
summary: 一句话风格描述
fits: [内部工具, 运维控制台]
not_for: [营销页]
base: { registry: shadcn, cli: shadcn@4.21.4, base: radix, style: nova }
density: compact
theme: theme.css
defaults:                   # 键必须是 apply patterns 声明的决策
  collection.row_height: 36
sources:                    # 每项 ref + license
  - { kind: derived, ref: "derive_theme.py …", license: project }
```

## theme.css 契约

必须在 `:root` 与 `.dark` 都定义、并在 `@theme inline` 映射为 `--color-*`：

- shadcn 核心：background, foreground, card(+fg), popover(+fg), primary(+fg), secondary(+fg), muted(+fg),
  accent(+fg), destructive, border, input, ring, chart-1..5, sidebar 系列 8 个
- 扩展：success, warning, warning-foreground, info, brand, brand-foreground, faint-foreground, app-shell

另需 `--radius`（:root）与 `@theme { --text-sm … }`（密度）。颜色一律 `oklch()`。
可选：`--surface-shadow / --floating-shadow`。不允许包内定义其他变量供页面使用。
