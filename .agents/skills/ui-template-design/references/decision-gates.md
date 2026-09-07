# Decision gates

用户选择权是 freeze 前置条件。凡是会进入 token、Primitive、Pattern、规则、Gallery、验证或 freeze 本体的决策，都必须先给出可见候选并等待用户选择或明确授权；不得把第一个可行方案、框架默认、依赖默认或 Agent 偏好当成已确认。

## 提问方式

- 把同类缺失信息聚合成一轮聚焦提问；每轮最多 3 个 blocking question。
- 每个问题至少给 2 个合法候选；只有唯一合法结果时可只确认该结果。候选必须说明适用场景与代价，必要时给出推荐及理由。
- 始终允许用户给出候选之外的答案；列表不是闭集，除非该层本身是 schema、runtime 或 Page Type 闭集。
- 用户可明确说「由你决定」。此时先声明拟用默认、影响面和可回退方式，把 `authority` 记为 `delegated`；不得事后静默补授权。
- 已记录的 selected / delegated 决策不重复询问；新事实使旧决策失效时才重开对应 gate。

`00-intake.md` 建立决策账本，后续产物只引用或细化它：

```yaml
decision_gates:
  - gate: tokens
    question: "视觉方向沿用 existing 还是走低对比中性系统？"
    options: ["existing-voice", "neutral-system"]
    selected: existing-voice
    authority: user
    consequence: "保留品牌暖色；新增色阶仍需用户确认"
```

## 必经 gate

| Gate | 必须让用户选择 | 不得静默决定 |
| --- | --- | --- |
| Intake | 任务类歧义、输出根、变更范围、existing 的“冻结业务 / 允许交互变化”边界 | 用口吻猜任务类或扩大路径 |
| Architecture | greenfield 每个闭集技术层的候选；existing 是否保持 observed stack | 预设语言、框架、样式或包管理器 |
| UX & Inventory | 输入源、优先用户/旅程、纳入路由或组件；refactor 可选全量或代表性 inventory | 把代表性抽样说成全站事实 |
| Tokens | 视觉方向、精确值来源、theme/density/motion 覆盖 | 先写品牌色再当作既定方向 |
| Primitives | 领养组件库、项目内实现或 hybrid；纳入控件与无障碍基线 | 只因库流行就安装 |
| Patterns | Page Type 归属、纳入 Pattern、断点与 Data-State 覆盖 | 为歧义路由挑选类型 |
| Rules | 可加载规则位置、是否写等价 Cursor 片段、扫描严格度 | 替换根 `AGENTS.md` |
| Gallery | dev-only 面、viewport/theme 矩阵、是否建立 Golden Page | 用固定 `/dev/design-system` 当唯一合法形态 |
| Verification | 浏览器/设备方式、截图 diff 阈值、失败后请求人类还是暂停 | 放宽 3 轮上限或放宽过期证据 |
| Freeze | 汇总关键选择、剩余未迁页、未解决问题和下一步 | 把未回答的 gate 解释为同意 |

每个 gate 的结果写入对应 Intake/阶段产物；用户拒绝、修改或悬置任一 blocking 选项时，阶段停在对应层，不得继续生成下层。
