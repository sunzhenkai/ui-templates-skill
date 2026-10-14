# 从 CSS 变量来源提炼

适用：来源仓库/网页有 `:root { --background: …; }` 一类变量（shadcn v3/v4、Radix Themes、自研 tokens）。

1. 找变量文件：`globals.css / tokens.css / theme.css / index.css`；或在浏览器 DevTools 里
   `getComputedStyle(document.documentElement)` 导出全部 `--*`（存为 css 文件再喂给脚本）。
2. 多文件按优先级从低到高传多个 `--css`（后者覆盖前者）。
3. 深色块识别：`.dark`、`:root.dark`、`html.dark`、`[data-theme=dark]`。其他写法先手工改成 `.dark`。
4. 值格式：hex、rgb()、hsl()、shadcn v3 的裸 `H S% L%`、oklch() 都会被转换为 oklch。
   `color-mix()`、渐变、`calc()` 不转换（记为 skip），需人工给出近似值。
5. 名称映射：同名直接映射；常见别名（surface→card、danger→destructive、page-canvas→background…）内置；
   其余用 `--map`：

```bash
python3 scripts/extract_theme.py --css src/app/globals.css --css src/styles/brand.css \
  --name soft-console --out templates --map gray-1=background --map accent-9=brand \
  --source-ref "某开源仓库 packages/ui/styles (commit abc123)" --license MIT
```

6. 核对 `EXTRACTION.txt` 后删除它（不发布）。

常见偏差：
- 来源的 `--primary` 是品牌色，但它的主按钮其实是深色 → 以渲染结果为准，`--map` 调整。
- 来源只有浅色 → 深色由脚本填充，需目视调整，CHANGELOG 标注「深色为推导」。
- ring/success 等对比度不足 → 调 L（见 SKILL.md 步骤 3）。
