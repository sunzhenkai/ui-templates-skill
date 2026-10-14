# Context（术语）

**风格包（package）**：`meta.yaml` + `theme.css`。只承载风格：颜色角色、圆角、密度、默认决策。不含组件或页面代码。

**主题契约**：风格包必须定义的变量集合（shadcn 核心 + success / warning / warning-foreground / info / brand /
brand-foreground / faint-foreground / app-shell），浅深两套，oklch，满足对比度对。由 `validate_package.py` 定义。

**library**：随 apply 分发的代码：shadcn 组件（vendored）、blocks（通用组合件）、lint 规则。安装后归项目所有，lock 记录哈希。

**block**：跨项目通用、带默认行为的组合组件（DataTable、PageHeader、StateBoundary…）。页面规范优先落在 block 的默认行为里。

**pattern**：一类页面的实现规范：适用场景、使用的 blocks、决策（≤6，有默认值）、示例、自查（≤8）。

**决策（decision）**：pattern 中可选的实现取舍（如 `collection.paging`）。默认值来自风格包 `defaults`，项目覆盖写在 `ui-decisions.yaml`。

**vocab**：项目词表（状态→文案与色调、通用文案、locale）。页面不自行决定状态颜色或通用文案。

**分诊（triage）**：把一条用户反馈归到 theme / block / pattern / page 层，修在能覆盖所有同类问题的最低共享层。

**clean-room**：只读 skill 文档、在空项目中实现代表性页面，用来验证 skill 本身是否足够。
