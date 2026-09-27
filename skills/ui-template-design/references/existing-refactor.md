# Existing refactor

输出根已有依赖清单或实质源码，且没有可用 freeze。只记录 observed stack，禁止静默换栈。仅任务类 `refactor` 预加载本文；`iterate` 不要读。

## 前置 — 冻结业务

禁止改 API、数据模型、权限、路由语义、业务状态、交互语义。允许改 layout、typography、spacing、components、visual hierarchy。一次任务不得同时做 architecture + UX + visual + business。重构改了 API 则停止并拆分任务。

## 顺序

1. Inventory（[inventory.md](inventory.md)）
2. Legacy mapping（[legacy-mapping.md](legacy-mapping.md)），尽量批量替换
3. Token Freeze
4. Primitive 收敛
5. Patterns（按出现频率：先 List/Detail/Master-Detail/Empty-Error-Loading）
6. 规则块 + 扫描
7. Gallery + 可选 Golden Page
8. 按页迁移可另开任务；本 skill 可将「体制 + Gallery」标完成

不要一次性重写整个前端。无 mapping 表不得开始逐页改 class。

## Existing gates

Intake 让用户选择重构范围：仅视觉壳、含组件收敛、含 Pattern 提升等；并列出每项会触达的路径类型。Architecture gate 先确认「保持 observed stack」，再允许把换栈拆成独立任务；不得把必要依赖升级混入视觉重构。确认保持后，Design System 按该栈原生 theming 承接（token 精确值落在其主题机制），不得另建并行第二套 token / 组件实现。Inventory gate 声明全量或代表性抽样，并说明代表性抽样不能外推为全站事实。
