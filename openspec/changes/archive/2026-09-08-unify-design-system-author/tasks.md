## 1. Runtime integration

- [x] 1.1 更新 Author manifest 与 skill 正文，声明 `design-system/v1` package-only 边界和移交红线
- [x] 1.2 将 Author validation gate 接到统一 design-system validator
- [x] 1.3 更新 checkpoint/report 字段，记录 package identity、capability、digest 和 validation receipt

## 2. Generation and update

- [x] 2.1 将 L0–L6 生成映射到 manifest、meta 与七层 core
- [x] 2.2 实现局部 change set 比对，保证未声明路径原字节
- [x] 2.3 让 source、computed、estimated、default token 与 evidence/provenance 继续满足统一契约
- [x] 2.4 让 Stable Entity ID 分配、retirement/supersession 和跨层引用闭合通过 validator

## 3. Lifecycle and feedback

- [x] 3.1 更新 INDEX 创建、更新、浏览、retire 和 delete 流程到 package metadata
- [x] 3.2 更新 proposed feedback parser 与 receipt，使其绑定 package identity、stable IDs 和 evidence refs
- [x] 3.3 更新 Author eval 与 fixtures，覆盖 candidate-only、局部更新、retired 拒绝和 feedback 去重

## 4. Validation

- [x] 4.1 运行 `make validate`
- [x] 4.2 运行 `make test`
- [x] 4.3 运行 `make eval`
- [x] 4.4 运行 `openspec validate unify-design-system-author --strict`
