## 1. Active Instance runtime

- [x] 1.1 更新 Design skill 正文与 runtime，将 frozen body 切换为 `.ui-template-design/design-system.yaml`、`core/`、`binding.yaml`
- [x] 1.2 接入统一 design-system validator，校验 contract、binding、projection、capability 和引用闭合
- [x] 1.3 更新 Phase 0–9 checkpoint，使 contract、binding、projection、gallery 和 browser evidence 均有 digest

## 2. Intake and source origin

- [x] 2.1 实现 task class 与 source origin 的独立 Intake 字段和判定顺序
- [x] 2.2 实现 published package 领养，校验 identity/digest 并保留 source package identity
- [x] 2.3 实现 legacy-freeze migration 入口，生成 receipt 并阻止 unresolved/errors 进入 freeze
- [x] 2.4 保持 bootstrap/refactor/iterate 各自必读与禁止预加载规则

## 3. Binding and visual freeze

- [x] 3.1 实现闭集 stack/binding decision gate，未确认前禁止写应用源码
- [x] 3.2 实现 Token Projection 目标、映射与 digest 校验，阻止手工旁路
- [x] 3.3 更新 Primitive/Pattern/Page Type 绑定，使实现路径与 Stable Entity ID 闭合
- [x] 3.4 更新 Gallery、browser visual loop 和 freeze gate 的证据契约

## 4. Validation

- [x] 4.1 运行 `make validate`
- [x] 4.2 运行 `make test`
- [x] 4.3 运行 `make eval`
- [x] 4.4 运行 `openspec validate unify-design-system-design --strict`
