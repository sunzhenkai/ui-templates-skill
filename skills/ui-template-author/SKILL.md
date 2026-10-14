---
name: ui-template-author
description: 从参考来源（使用 shadcn/CSS 变量的仓库、网站、设计稿截图）提炼 ui-template 风格包，并维护、发布到 catalog（版本、CHANGELOG、校验）。在“照着某个产品/网站的风格做一套模板”“把现有项目的主题沉淀成可复用包”“升级/发布风格包”时使用。
---

# ui-template-author

风格包 = `meta.yaml` + `theme.css`（格式见 `references/package-format.md`）。
本 skill 负责**从来源提炼**与**发布**；从零按品牌推导用 ui-template-design；落地到项目用 ui-template-apply。

提炼的是**风格**（颜色角色、圆角、密度、默认决策），不是组件代码或页面结构——那些由通用库与 patterns 提供，
所以不同来源的包可以互换。

## 流程

1. **定来源类型**，读对应参考：
   - 仓库或页面使用 CSS 自定义属性（shadcn、Radix Themes、自研 tokens）→ `references/extract-shadcn.md`
   - 只有渲染结果（网站、截图、设计稿）→ `references/extract-other.md`
2. **提炼**：
   ```bash
   python3 scripts/extract_theme.py --css <tokens.css> --name <pkg> --out <dir> --source-ref "<来源 + 路径>" --license <SPDX>
   ```
   看 `EXTRACTION.txt`：`mapped` 核对角色是否对；`filled` 的角色确认来源确实没有（否则用 `--map 源变量=角色` 重跑）。
3. **校正**：`validate_package.py package` 报的对比度问题按「调 L 不改角色」修。来源本身不达标时以可访问性为准，
   并在 CHANGELOG 写明偏离。删去仅对来源产品有意义的变量（不会被 blocks 使用）。
4. **默认决策**：对照来源的列表/详情/表单，写 `meta.yaml → defaults`（只写与通用默认不同的）；`fits / not_for` 各 2–4 条。
5. **参考截图**（发布必需）：把 `<apply>/reference/src` 放进装了该包的临时 Vite 应用（见 reference/README.md），
   `review_visual.py capture-reference --base <url> --out templates/<pkg>/reference`，逐张看：画布层次、边框强度、选中态、强调色用量、与来源是否一致；
   差异只通过数值修正。这些截图就是 apply 第 07 步对照的参考。
6. **发布**（`references/package-format.md`「发布」）：版本号、CHANGELOG、放入 `templates/<pkg>/`，同步 catalog、跑测试。

## 规则

- 不复制来源的组件代码、图标、插画、字体文件、文案。只取变量数值与可观察的风格决策。
- `sources[]` 每项写 `ref` 与 `license`；许可证不明时只可内部使用，不发布到共享 catalog。
- 包名描述风格（`workbench-shell`、`soft-console`），不用来源或客户的产品名。
- 一个包只支持当前契约中的变量；需要新角色 → 先改 skill 库（blocks + validate_package），再升 major。
