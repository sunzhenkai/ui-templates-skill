# Tasks

- [x] capture.py：SLOT_ROLES 语义值 `content`、SEMANTIC_VALUES `icon-title`/`title-only`
- [x] chrome.py：round 4 五问（chrome-edge / content-region / header-anatomy / nav-item-geometry / nav-item-type / row-disclosure）
- [x] repo-capture-format.md：round 4 文档
- [x] profile.py：新事实投影核对（content 槽位 / anatomy / visibility 既有管道验证）
- [x] validator：visibility hidden 必须 explicit negative（FIDELITY_NEGATIVE_FACT_MISSING）
- [x] 三 skill runtime 镜像同步
- [x] tests/test_round4_mandatory.py + 既有 fixture 补 round 4 应答
- [x] workbench-shell 采集图补 round 4 facts 并重投影 fidelity.yaml
- [x] core 更新：layout（content region、canvas padding 修正、header 静态）、page-header anatomy、rules 声明；3.2.0
- [x] catalog 副本同步
- [ ] certification gate 重跑 + promotion（治理门：需 clean-room Apply 产出与用户对 promotion 的单独确认；当前 CERTIFICATION_STALE 为预期的 fail-closed 信号）
- [x] apply 参考文档消费义务
- [x] make test / eval / validate 全绿
- [x] 委托 qodercn + qwen3.8-flash 重建 example web；复测五缺陷消失（qwen3.8-flash 壳层切片 + qodercn 路由/密度切片，独立复核 5/5 PASS）
