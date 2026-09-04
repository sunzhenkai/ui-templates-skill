# Template Apply Toolchain

工具是候选增强器，不是设计权威；不可用时采用等价回退但不降低 gate。模板 `spec.md`/`tokens.yaml` 与用户已确认范围始终优先。

## 能力路由

| 能力 | 默认工具 | 产物中的证据 |
| --- | --- | --- |
| 外部知识候选 | `ui-ux-pro-max` | query contract record、选择/abstain 理由 |
| 美学立场 | `frontend-design` | mood、anti-patterns、取舍 |
| 组件候选 | shadcn / 本地设计系统 | component source、适配与 a11y |
| 真实浏览器 | Playwright/chrome-devtools/browser-use/项目脚本 | current-build screenshot/console/AX/computed/URL |
| Review | design review 工具或独立复核 | rule-ID findings、severity、fix、re-check |

## `ui-ux-pro-max` Query Contract

每次查询都是独立记录并写入 `01-design-direction.md`（整体方向）、`04-components.yaml`（组件）或 `09-review.md`（复核）：

1. **one intent**：一次只问一个问题；不得把风格、表格交互、字体和某框架实现塞进同一 query。
2. **explicit mode**：整体设计方向使用 `design-system`；单一 UX/领域问题使用 `domain`；已知技术栈问题使用 `stack`。记录 mode，不靠工具自动猜。
3. **2–5 terms**：query 只含 2–5 个有效关键词，来自产品类型、用户目标、密度/情绪或单一问题；不堆同义词。
4. **top identity**：验证首条结果的 id/name、mode/domain、目标平台与来源 identity；只记录“看起来相关”不算验证。
5. **retry once**：首轮为空、错域或平台不符时，只允许收窄一次（移除歧义词或补单一限定）；不得反复查询直到得到想要答案。
6. **abstain**：重试仍无 verified match 时记录 `abstained: true`、原因和 fallback，回到模板规则/人工分析；不得用未验证结果。
7. **no persist by default**：默认禁止 `--persist`、MASTER、override、catalog 或外部 design-system 文件写入项目/模板。只有用户明确授权时可持久化为候选附件，且永不覆盖 `spec.md`/`tokens.yaml`，不进入模板 bundle。

建议记录结构：

```yaml
intent: dense-workbench-style
mode: design-system
terms: [workbench, dense, operational]
attempts: 1 # 最大 2
query: "workbench dense operational"
top_identity: {id: "...", name: "...", source: "...", platform: web}
verified: true
selected: false
reason: "与模板密度一致，但配色冲突，未采用"
persisted: false
fallback: null
```

工具输出仅是候选。采用前映射到已有 token/rule ID；需要新增/偏离 token 时按 Phase 1 记录理由与用户确认。

## `frontend-design`

在 Phase 1 明确 mood、首屏注意力、安静元素、禁止的默认 AI 风格和密度/装饰取舍。不可用时手写同字段的 taste commitment；不得以工具名替代设计决策。

## 组件工具

顺序为 use as-is → adapt → compose → custom。每项在 `04-components.yaml` 记录 semantic、states、keyboard/AT、source 和 template rule IDs。检索不可用时优先项目已有 accessible primitive，再按模板组件契约实现；custom 必须写理由。

## 真实浏览器

优先项目已有可重复浏览器脚本，再用可用 MCP/浏览器工具采集。所有 evidence 必须绑定当前 source/build/template identity。没有任何真实浏览器路径时停止，不用单测、静态 DOM 或截图 mock 替代 Phase 8。

## Review

自动 review 不可用时进行独立人工复核，仍生成 `09-review.md` 结构化 front matter。findings 必须引用 rule ID、route/viewport/theme/state、expected/actual、evidence、fix 和 re-check；P0/P1 不得只写 prose 接受。

## 冲突与隐私

工具建议冲突时按用户确认 → template spec/tokens → 已记录项目约束裁决。默认不向第三方发送项目源码、用户数据、凭据或私有截图；需要外发必须另行获得明确授权。
