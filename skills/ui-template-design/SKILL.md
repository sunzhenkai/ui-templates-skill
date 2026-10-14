---
name: ui-template-design
description: 为项目确定视觉风格并产出 ui-template 风格包（theme.css + meta.yaml）：从品牌色、密度、气质推导完整的浅/深色主题，或在现有包上做项目级覆盖。在“定一套 UI 风格/换主题色/现有模板都不合适/做深色模式”时使用；实现页面交给 ui-template-apply。
---

# ui-template-design

产出物只有一个风格包目录：`meta.yaml` + `theme.css`。组件、blocks、patterns 都是通用的，
风格差异只能体现在主题变量和默认决策上——这正是包可以替换的原因。

## 何时用

| 情况 | 做法 |
|---|---|
| catalog 里有合适的包 | 不用本 skill，直接 ui-template-apply |
| 合适但要换品牌色/圆角 | 项目覆盖：只改项目 `src/styles/theme.css` 的少数变量（见 brand.md「覆盖」） |
| 没有合适的 | 新建包：本 skill 全流程 |
| 要从现有网站/仓库/截图提炼 | ui-template-author |

## 流程

1. **问**（`references/questions.md`）：一次最多 3 个问题，每个带推荐答案；能从项目现状推断的不问。
2. **推导**：
   ```bash
   python3 scripts/derive_theme.py --name <pkg> --out <dir> --accent-hue 255 --neutral-hue 286 --neutral-chroma 0.005 --radius 0.5
   ```
   参数含义与取值建议见 `references/brand.md`。
3. **补 meta**：`summary / fits / not_for / defaults`（`references/instance-format.md`）。defaults 只写与通用默认不同的决策。
4. **校验**：`python3 <apply>/scripts/validate_package.py package <dir>/<pkg>` —— 契约、对比度。
5. **参考截图目检**：把 `<apply>/reference/src` 放进装了该包的临时 Vite 应用（见 reference/README.md），
   `review_visual.py capture-reference --base <url> --out /tmp/ref-shots`，逐张看：画布层次、边框强度、选中态、强调色用量；
   差异只通过数值修正。截图只落在 /tmp 目检，**不提交**——仓库不含二进制图片，apply 第 07 步用 `compose --reference-base` 现拍现比。
6. **调整**：只改数值（L/C/H、radius），不新增变量。新变量意味着 blocks 不认识它——那属于 skill 库的改动，不是风格。

## 原则

- 中性色承担 90% 的界面；强调色只用于焦点、链接、选中、数据图表和信息态。
- 深色模式不是反色：背景 L≈0.18、卡片略亮、边框用白色低透明度。
- 文字对比度 ≥ 4.5（正文）、强调色作文字时同样 ≥ 4.5；校验失败就调 L，不要降标准。
- 密度目前只有 compact（13px 正文 / 32px 控件 / 36px 行）。
