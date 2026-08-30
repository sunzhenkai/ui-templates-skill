# 来源:运行中的 Web 站点(web)

从可访问的 URL 提取设计规范。核心思路:**截图看整体,读 computed style 拿精确值**。

## 步骤

1. **打开页面并截图**
   - 使用可用的浏览器工具(如 Playwright MCP、browser-use)导航到目标 URL。
   - 截取首屏整页截图(及关键区域截图),保存到 `templates/<name>/assets/`。
   - 若有明显的深色/浅色切换、登录后页面,用户提到则一并采集;否则只处理用户给的页面。

2. **提取 CSS 变量与设计 token**
   - 在页面执行 JS,读取 `:root` / `html` 上的自定义属性:

     ```js
     const styles = getComputedStyle(document.documentElement);
     const vars = {};
     for (const name of styles) {
       if (name.startsWith('--')) vars[name] = styles.getPropertyValue(name).trim();
     }
     return vars;
     ```

   - 很多站点(Tailwind、Radix、自研 design system)的色板、间距都在这里,是最精确的入口。

3. **采样关键元素的 computed style**
   - 对 body、主要标题(h1/h2)、正文段落、主按钮、链接、卡片/容器、输入框,读取:
     `color`、`background-color`、`font-family`、`font-size`、`font-weight`、`line-height`、`padding`、`border`、`border-radius`、`box-shadow`。
   - 按钮注意区分 primary / secondary;有条件可看 hover 态。

4. **归纳,而非罗列**
   - 把采样到的字号归纳成阶梯,间距归纳成体系(常见为 4px 或 8px 基数)。
   - 出现频次最高的背景色/文字色才是"页面背景/主文字",别被个别组件带偏。

## 注意事项

- 值全部属于**精确提取**,`meta.yaml` 的 `confidence` 一般为 `high`。
- 页面可能是响应式的:默认按桌面宽度(1280~1440)提取,若用户关心移动端再补一轮窄屏。
- 需要登录的页面:若用户环境已有登录态(如通过其真实浏览器),可使用;否则向用户说明受限范围。
- 尊重站点:只做样式观察,不做批量抓取、不绕反爬。
