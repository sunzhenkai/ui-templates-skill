# Design System token 采用框架原生 theming 承接

Greenfield 选型与 existing 重构中，若所选组件体系带原生主题机制（如 Tailwind/shadcn CSS variables、antd `ConfigProvider` token），设计系统 token 的精确值直接落在该机制上，该主题文件即「语义 token 是精确值唯一载体」不变量的合法载体形态；refactor 确认保持 observed stack 后同样适用。这样 Design System 与已选型框架契合，避免并行维护第二套 token；此前「领养组件库源码必须改走本项目 token 文件」的措辞由本决策取代。

## Considered Options

- 独立 token 文件再桥接/生成到框架主题：两处同步成本高、易漂移（否决）。
- 维持领养源码后重写为自有 token 文件：对自带主题体系的框架等于另起炉灶（否决）。
