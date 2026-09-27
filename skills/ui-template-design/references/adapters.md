# Adapters（fail-open）

探测失败则忽略。运行时不硬依赖 Author runtime、catalog 路径或 Apply checkpoint。

## 模板

能 resolve 到 published 模板则把 token/rule 映射进项目 token，记录偏离。resolve 失败继续用项目上下文，不把模板缺失写成 error。

## Apply

freeze 完成后若用户要写业务页：已装 Apply 则移交，并说明可投影本 freeze；未装则结束，不假装已实现页面。Apply 无 freeze 时保持现行 Phase 0–9，不把缺少 Design 当作失败。

## Author

仅当用户明确要求把已冻结视觉语言发布为 schema v2 模板时移交 Authoring。日常不得写 `templates/INDEX.md`。freeze 存在但用户只要设计系统时，Authoring 不启动。
