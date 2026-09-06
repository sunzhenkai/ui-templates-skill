# 来源：运行中的 Web 站点（web）

核心：截图看整体，computed style 取精确值；只做获授权页面的样式观察，不批量抓取、不绕认证或反爬。

## 提取步骤

1. 记录 `meta.sources[]`：稳定 `source-###`、URL、响应 ETag/Last-Modified/内容 digest 等 revision、带时区 `captured_at`。登录态只在用户已授权环境使用，不记录 cookie/token。
2. 用真实浏览器采集首页与代表性内页、用户要求的视口/主题；coverage 对未采页面、主题、状态明确标为 defaulted 或 unsupported。对已授权视口，观察壳实际出现的宽度变化：导航是展开、收成窄轨、离开布局，还是页头 trigger 的 overlay。只采一档时，未采视口和未见形态标 `unsupported`，不得写成 observed。清单见 [extraction-layers.md](extraction-layers.md)。
3. 读取 `:root`/`html` CSS variables；对 body、标题、正文、按钮、链接、容器、输入框读取 color/background/font/line-height/padding/border/radius/shadow。
4. 采集 hover、focus-visible，并尽量补 disabled/selected。每个样本保存稳定 locator（URL + selector/role + state + viewport/theme）；computed style 用 `origin: computed`。
5. 归纳角色与阶梯而非罗列：近义色合并、字号/间距收敛，但保留计算方法。归纳值为 `computed`，不能冒充 `source`。

## evidence

每个 token 在 `evidence.yaml` 记录 source ID/revision、locator、method（如 `css-variable`、`computed-style`、`frequency-normalization`）、artifact、captured_at、confidence。直接响应/CSS 声明可标 source，浏览器计算结果标 computed，视觉反推标 estimated。默认补全必须标 default，并写明来源缺失事实与可检查 basis/decision ID。

截图、字体、图标等资产入库前逐项记录 license、redistribution 和 redaction。页面含账号、邮箱、头像、内部 URL、业务数据或会话标识时先脱敏；许可未知/禁止再分发或 `redaction: required` 时不得把原件放进模板，可只保存不含敏感内容的派生证据描述。

## 置信度

不要笼统写 high：layout/visual/components 分维度评估；computed style 定位稳定通常 high，动态/跨域样式或状态注入通常 medium。overall 不高于最弱必需维度。需要登录但无授权、关键页面不可达或响应式只采一档时，明确降低 coverage/confidence。
