# 品牌输入 → 主题参数

| 参数 | 含义 | 建议 |
|---|---|---|
| `--accent-hue` | 强调色色相（OKLCH H，0–360） | 蓝 255、青 200、绿 150、橙 50、红 25、紫 300 |
| `--accent-chroma` | 强调色彩度 | 0.12–0.18；> 0.2 只适合小面积 |
| `--neutral-hue` | 中性色偏向 | 冷灰 260–290；暖灰 60–90；与强调色同侧更协调 |
| `--neutral-chroma` | 中性色彩度 | 0（纯灰）–0.012；越大越“有色” |
| `--radius` | 基础圆角 rem | 0.375 利落 / 0.5 默认 / 0.75 柔和 |
| `--primary` | 主按钮用中性深色还是强调色 | neutral（默认）/ accent |

## 从品牌 HEX 取色

`--accent-hex "#2563eb"` 直接换算出色相与彩度（彩度上限 0.18，避免大面积刺眼）。
亮度不需要输入：脚本按角色设定 L，并把作文字用的强调色自动调整到满足对比度。

## 项目覆盖（不新建包）

只改项目 `src/styles/theme.css` 中这几类变量，并在 `ui-decisions.yaml → local_edits` 记录：
`--brand / --ring / --sidebar-primary / --chart-*`（换强调色）、`--radius`（换圆角）、`--primary`（主按钮）。
改完跑 `validate_package.py project .`。改动超过 10 个变量 → 应该新建包。
