## 1. Active truth and modes

- [x] 1.1 更新 Apply skill 与 runtime，将实施输入切换为 Active Instance
- [x] 1.2 实现显式 `bootstrap | increment` Intake 与 site/output-root 判定记录
- [x] 1.3 实现 published package adopt-only 流程，保留 source identity 并生成 binding

## 2. Checkpoint and implementation

- [x] 2.1 更新 checkpoint schema，记录 mode、change set、contract/binding/projection digests、stable IDs、output root 和 build identity
- [x] 2.2 实现 Impact-based Resume 依赖图和最早失效 phase 计算
- [x] 2.3 更新 Phase 2–7 实现，使页面装配只引用 Active Instance stable IDs
- [x] 2.4 保持未声明 change set 路径原字节，并在恢复时复验

## 3. Vendor and verification

- [x] 3.1 新增 vendor manifest、UPSTREAM、license 和四个 reference 快照入口
- [x] 3.2 实现 binding-driven conditional loading，未匹配 trigger 不预加载
- [x] 3.3 更新 Phase 8 current-build 证据与 browser availability gate
- [x] 3.4 更新 Phase 9 feedback ownership、UUID、atomic write、stable ID 和 evidence 校验

## 4. Validation

- [x] 4.1 运行 `make validate`
- [x] 4.2 运行 `make test`
- [x] 4.3 运行 `make eval`
- [x] 4.4 运行 `openspec validate unify-design-system-apply --strict`
