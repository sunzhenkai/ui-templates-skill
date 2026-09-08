## 1. Schema contract

- [x] 1.1 新增 `schemas/design-system/v1/` 的 manifest、meta、tokens、primitives、patterns、page-types、layout、rules receipt、evidence 和 binding schema
- [x] 1.2 新增 migration receipt 与 vendor manifest schema，声明固定 revision、license、files、digests 和 allowed triggers 字段
- [x] 1.3 在 schema 注释与 reference fixture 中声明 `sha256-canonical-json-v1`、contract digest、binding digest 和 projection digest 的输入边界

## 2. Unified validator

- [x] 2.1 新增 `scripts/validate_design_system.py`，支持 package 与 active instance 两种目标，并输出稳定排序 JSON
- [x] 2.2 校验 manifest、capability 必填层、Stable Entity ID 唯一性、跨层引用闭合和 token authority
- [x] 2.3 校验 contract/binding/projection digest；任一缺失、未知 schema 或不匹配均 fail closed
- [x] 2.4 校验 migration receipt 的 source/target digest、changes、unresolved 和 errors；失败候选不得标记为可发布或可激活

## 3. Governance fixtures

- [x] 3.1 新增 `tokens-only`、`ui-kit`、`page-system` package 与 active increment fixture
- [x] 3.2 新增 legacy template-v2、legacy freeze-v1 和 vendor manifest 的 positive/negative fixtures
- [x] 3.3 新增 deterministic contract eval，覆盖合法读取、缺 schema、digest mismatch、悬空 ID、capability 缺层和 migration unresolved
- [x] 3.4 将统一 validator 接入 `make validate` 与 `make test`，不改变现有 schema v2 消费结果

## 4. Validation

- [x] 4.1 运行 `make validate`
- [x] 4.2 运行 `make test`
- [x] 4.3 运行 `make eval`
- [x] 4.4 运行 `openspec validate unify-design-system-schema --strict`
