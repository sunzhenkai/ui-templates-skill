# Pattern 索引

每个页面先归类到一个主 pattern，再叠加横切 pattern；**页面代码从对应原型复制**，pattern 只补充原型之外的规则。pattern 写的是**实现时就做对**的规则；
`self_review` 是写完后 1 分钟自查，不是事后补救清单。

| 页面/需求 | 主 pattern | 常叠加 | 原型（reference/src/pages） |
|---|---|---|---|
| 应用骨架、导航 | shell | — | root.tsx |
| 任意页面的标题、操作、宽度 | page | feedback | — |
| 资源列表 / 表格 | collection | filter-search, state | collection / empty |
| 单个资源 | detail | state, confirm | detail |
| 新建 / 编辑 | form | feedback | form |
| 删除、停用、不可逆操作 | confirm | feedback | — |
| 加载 / 空 / 错误 / 未配置 | state | — | empty |
| 整页空集（首次使用） | empty | state | empty |
| 设置页（多分区） | settings | form | settings |
| 自动刷新、运行中状态 | realtime | collection, detail | — |
| 对话、消息流 | conversation | realtime | list-detail |
| 日志、事件流 | log-viewer | realtime | detail |

决策（`decisions`）的默认值来自风格包 `meta.yaml → defaults`；项目覆盖写入 `ui-decisions.yaml`。
没被问到的决策一律用默认值，不要向用户逐条确认。
