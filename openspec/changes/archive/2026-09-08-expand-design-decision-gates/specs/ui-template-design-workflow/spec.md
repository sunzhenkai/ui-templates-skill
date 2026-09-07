## ADDED Requirements

### Requirement: Decision gates 保留用户选择权
skill SHALL 把会影响 token、Primitive、Pattern、可执行规则、Gallery、视觉验证或 freeze 本体的决策作为 decision gate。每个 blocking gate SHALL 展示至少 2 个合法候选及其适用场景与代价；只有唯一合法结果时 SHALL 改为确认该结果。候选列表 SHALL NOT 阻止用户给出其他答案。skill SHALL NOT 把第一个可行方案、框架默认、依赖默认或 Agent 偏好当作用户确认。用户可明确授权 Agent 决定，但授权前 SHALL 展示拟用默认、影响面和可回退方式，并把授权来源记录为 `delegated`。

每个 decision gate SHALL 记录 question、options、selected、authority 和 consequence；Intake SHALL 建立该账本，后续阶段 SHALL 引用或细化对应记录。用户拒绝、修改或悬置任一 blocking gate 时，skill SHALL 停在对应层，SHALL NOT 继续生成下层，也 SHALL NOT freeze。已记录且未失效的选择 SHALL NOT 重复询问。

#### Scenario: Greenfield 技术层候选
- **WHEN** 输出根为空且用户未声明 language、UI framework、styling 或其他闭集技术层
- **THEN** skill 为每层展示至少 2 个相容候选与代价，等待选择或明确授权；不得创建依赖清单或应用源码

#### Scenario: Token 方向不得静默默认
- **WHEN** 用户要求建立 Design System 但未声明视觉方向、精确值来源或 theme/density/motion 覆盖
- **THEN** skill 停在 Token gate 并提供候选；不得先选定默认品牌色再要求用户追认

#### Scenario: 用户委托决策
- **WHEN** 用户明确说由 Agent 决定
- **THEN** skill 先声明拟用默认、影响和回退方式，记录 `authority: delegated`，并在 freeze 汇总中再次列出该选择

#### Scenario: Iterate 范围歧义
- **WHEN** 已有有效 freeze，用户只描述症状且未声明可改层或路径
- **THEN** skill 提供最小局部修复、回写对应层和扩展范围等候选与代价；确认前不得整层重写

#### Scenario: 未回答 gate 不得完成
- **WHEN** 任一 blocking decision gate 未选择、未授权或被悬置
- **THEN** 对应阶段不得完成，freeze 不得标记为 `frozen`
