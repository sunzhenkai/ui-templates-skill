# Phase 1 Design direction

## Taste commitment

- 主体：软件交付与运维事件协作中心，给值班工程师用的高密度工作台。
- 首屏注意力：侧栏当前工作区 + 收件箱未处理计数，而不是营销 Hero。
- 安静元素：1px 分区、四层表面、品牌蓝只出现在创建、未读、进度条。
- 禁止：紫渐变、居中 spinner、emoji 图标、第三级半透明正文（@NN-006）。
- 密度：紧凑 14px 正文（`typography.scale.body`），chrome 48px。
- 动效：仅路由进度与浮层进入；`prefers-reduced-motion: reduce` 降级（@NN-018）。

## ui-ux-pro-max Query Contract

```yaml
intent: dense-workbench-style
mode: design-system
terms: [workbench, dense, operational]
attempts: 1
query: "workbench dense operational"
top_identity:
  id: Minimalism & Swiss Style
  name: Minimalism & Swiss Style
  source: ui-ux-pro-max/design-system
  platform: web
verified: true
selected: false
reason: 密度与克制动效与模板一致，但推荐的运营绿/事故红配色与 Inter 以外的 Outfit/Work Sans 冲突 @TOKEN-001 @NN-008。颜色与字体按 tokens.yaml 消费。
persisted: false
fallback: 使用 workbench-shell tokens.yaml 的中性浅暗双主题与 Inter。
```

```yaml
intent: overlay-header-trigger
mode: domain
terms: [workbench, overlay, navigation]
attempts: 2
query: "workbench overlay navigation"
retry: "header overlay trigger"
top_identity:
  id: Sticky Navigation
  name: Sticky Navigation
  source: ui-ux-pro-max/ux
  platform: web
verified: false
selected: false
abstained: true
reason: 首轮命中 sticky nav/breadcrumb，重试命中 transform 动效，均与 PageHeader overlay trigger 无关。
persisted: false
fallback: 按 @RESP-001 与 platforms/web.md，overlay 触发器放在 PageHeader，不得画布角悬浮。
```

## 偏离

无 token 值偏离。项目自选 inset 画布净空映射 `spacing.allowed` 的 8px → `--shell-inset`，不新增模板 token。
