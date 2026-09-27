# design-system/v1 回滚

发布前保留 bundle 3.0.0 与上一版 2.x 的 artifact、`.sha256` 和 manifest。回滚时用同一 installer 安装上一份已验证 artifact；任一目录替换失败会恢复安装前版本；Author/Apply 仍必须成对回滚，Design 可独立保留。

回滚只恢复 skill 与 catalog 分发产物，不自动改写消费项目 Active Instance、checkpoint 或已生成页面。旧 2.x runtime 不得静默读取 `design-system/v1`；新 candidate 与 migration receipt 保留为审计证据。`example/**` 不参与回滚或修复。

回滚到 placement closure gate 之前的 runtime 后，旧 checker 不再强制 Phase 2/4 placement binding，也不会识别 unavailable profile 的机器 topology 断言；此类 checkpoint 不得直接宣布通过。恢复新 runtime 时必须重新验证 checkpoint，并让 `ROUTE_*` / `PLACEMENT_*` finding 按最早失效 phase 重开相关 artifact 与下游证据。
