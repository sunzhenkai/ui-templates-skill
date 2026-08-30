# 来源:代码仓库(repo)

从代码仓库提取设计规范。核心思路:**先找 token 定义(theme/config/CSS 变量),再读组件实现补全用法**。token 定义是精确的;用法归纳来自组件代码。

## 步骤

1. **定位 token 来源**(按优先级)
   - `tailwind.config.*`:`theme.colors`、`fontFamily`、`fontSize`、`spacing`、`borderRadius`、`boxShadow`。
   - CSS 变量:`:root`、`[data-theme]` 下的自定义属性(全局 CSS、`variables.css`、`theme.css` 等)。
   - 设计系统文件:`theme.ts`、`tokens.json`、`design-tokens/`、CSS-in-JS 的 theme 对象。
   - 组件库的变体定义:如 `button.tsx` 里的 variant 样式、`cva` 配置。

2. **通读 token,直接转写为规范**
   - 色板、字号阶梯、间距体系、圆角、阴影通常能在这里拿全,属于精确值。
   - 明暗双主题都定义了的话,两个都记录,在 spec.md 注明是双主题。

3. **读代表性组件,归纳"用法规则"**
   - 挑 3~5 个代表性组件(按钮、卡片、输入框、导航、表格之类),回答:哪个色用在哪个角色上、圆角和边框怎么用、hover/disabled 怎么表现。
   - token 只告诉你"有哪些值",组件代码才告诉你"哪个角色用哪个值"——规范文档的价值主要在这一层。

4. **(可选)跑起来看一眼**
   - 若仓库可运行且环境允许,启动后按 `source-web.md` 截图佐证;跑不起来不阻塞,以代码为准。

## 注意事项

- 值属于**精确提取**,`confidence` 一般为 `high`;如果 token 与组件实际用法矛盾,以组件用法为准并在 spec.md 注明矛盾点。
- 大仓库不要全读:先 Glob/Grep 找 theme/config,再沿 import 追到组件。
- 私有仓库注意用户授权;只读,不修改来源仓库。
