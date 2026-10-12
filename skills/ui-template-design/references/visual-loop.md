# Visual loop

空白 bootstrap，或 refactor 且变更集合含视觉方向或页面组合：先实现并修订一条主流程代表页，再把共享精确值写入 token 与 Pattern。截图用来对照并改这页。Gallery 覆盖抽出的 stable IDs，作回归。`template-package` 领养已有 core 时，视觉以 package 为准，页面实现交给 Apply。

编译通过不是完成。Gallery 或 Golden Page 必须用真实浏览器截图。

证据绑定 source identity、build identity、freeze digest、viewport、theme。旧截图文件存在但身份不匹配，不算通过。没有浏览器能力时停止并请求可运行方式；不得用静态 DOM 或假截图代替。

## 自愈（最多 3 轮）

1. 跑截图。
2. diff 超过阈值（默认 0.5%，项目可覆盖阈值，不得覆盖掉 3 次上限）：读 diff，定位 padding/margin/color/font-size/radius。代表页仍在定视觉时先改这页，再把要共享的值写入 token 或 Pattern；已经共享的值只改 token 或 Pattern。重跑。
3. 3 轮仍失败：停止，请求人类做 token/pattern 覆盖。不得放宽 baseline 或把失败标为通过。

Golden Page 是可选增强，不是独立完成的必要条件。若存在：截图基线只读；Pattern 才是可变层。迁其他页时不得改 Golden 样式迁就新页；Pattern 不够用时先升级再回填。
