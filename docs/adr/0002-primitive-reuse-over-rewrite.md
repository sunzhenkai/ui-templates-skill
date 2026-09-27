# Primitive 复用框架组件优先

使用带组件体系的 UI 框架时，Primitive 优先复用框架/组件体系已有组件并做样式调整，而不是重写或 fork 源码；仅当组件体系缺失所需组件时才降级到封装/fork/手写。「停在安装了 shadcn 不算完成」不变量保持不变：完成态仍要求 Primitive 注册（variants / sizes / states 并消费 token），复用只是实现方式，不豁免注册契约。

降级走固定阶梯：复用+样式调整 > 组合封装 > fork 源码并承接原生 theming > 从零手写。引入第二套组件体系视为换栈，必须重开 Architecture gate，不得在同一项目混装两套组件体系。
