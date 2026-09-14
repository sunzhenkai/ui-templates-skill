## ADDED Requirements

### Requirement: Scroll domain trace
Apply 的每条 included route SHALL 声明 `scroll_owner` 且该值 MUST 等于绑定 layout 记录中某个 scroll domain 的 owner region。绑定的 layout 记录声明多个 scroll domain 时，页面根 SHALL 实现 height-constrained、overflow-hidden 的非滚动容器，滚动只发生在各声明的窗格内；复用壳级或页面级单一滚动容器承载多窗格 layout SHALL 校验失败。layout 记录仅声明单一 scroll domain 时，页面可按单 owner 滚动，但 owner 仍 SHALL 与声明的 region 一致。

#### Scenario: 单窗格对账
- **WHEN** route 绑定的 layout 只声明 canvas 一个 scroll domain
- **THEN** route 的 scroll_owner 指向该 owner 即通过；指向未声明 region 失败

#### Scenario: 多窗格复用单滚动容器
- **WHEN** layout 声明导航列与内容区两个 scroll domain，而实现把整页放进一个滚动容器
- **THEN** Phase 2/8 校验失败，报告窗格滚动未按声明建立（如导航列不撑满、分割线不到底等可观察后果进入证据）

#### Scenario: 壳级滚动越权
- **WHEN** 多窗格页面的根随壳级 main 容器滚动
- **THEN** 校验失败；页面根必须自持 overflow-hidden 并在窗格内滚动
